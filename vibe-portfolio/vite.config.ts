import fs from 'node:fs'
import path from 'node:path'
import type { ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Connect, PreviewServer, ViteDevServer } from 'vite'
import { defineConfig } from 'vite'
import { ITEMS } from './src/items'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DMOES_ROOT = path.resolve(__dirname, '..')

function resolvePreRoot(): string | null {
  const fromEnv = process.env.JOVIDA_PRE_ROOT
  if (fromEnv && fs.existsSync(fromEnv)) return path.resolve(fromEnv)
  const sibling = path.resolve(DMOES_ROOT, '..', 'Jovida网页类项目', 'pre')
  if (fs.existsSync(sibling)) return sibling
  return null
}

const PRE_ROOT = resolvePreRoot()

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
}

function mimeFor(file: string) {
  const ext = path.extname(file).toLowerCase()
  return MIME[ext] ?? 'application/octet-stream'
}

function isSubpath(root: string, target: string) {
  const r = path.resolve(root)
  const t = path.resolve(target)
  const rel = path.relative(r, t)
  return rel !== '' && !rel.startsWith(`..${path.sep}`) && !rel.startsWith('..')
}

/** 禁止通过作品集内嵌暴露常见凭据与任务存储文件 */
function isBlockedRelative(rel: string): boolean {
  const n = rel.replace(/\\/g, '/').toLowerCase()
  const base = path.basename(n)

  if (base === '.env' || base.startsWith('.env.')) return true
  if (n.endsWith('.pem') || n.endsWith('.key')) return true

  const blockedSuffixes = [
    '/.google-token.json',
    '/.google-accounts.json',
    '/.google-app.json',
    '/.oauth-token.json',
    '/.oauth-app.json',
    '/.gmail-mail-tool-jobs.json',
  ]
  if (blockedSuffixes.some((s) => n.includes(s))) return true
  if (n.endsWith('vertex_ai_credentials.json')) return true

  // mail-tool-gmail 下任意 .json 不直接暴露（OAuth 与任务存盘）
  if (n.includes('/mail-tool-gmail/') && base.endsWith('.json')) return true

  return false
}

function sendFile(filePath: string, res: ServerResponse, next: Connect.NextFunction) {
  res.statusCode = 200
  res.setHeader('Content-Type', mimeFor(filePath))
  res.setHeader('X-Content-Type-Options', 'nosniff')
  fs.createReadStream(filePath).on('error', next).pipe(res)
}

const SKIP_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  'dist',
  '.vite',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.cursor',
])

/** 生产静态托管：把作品集用到的 dmoes 子树拷进 dist/__embed，免 Node 中间件 */
function topLevelEmbedSourceDirs(): string[] {
  const roots = new Set<string>()
  for (const item of ITEMS) {
    if (item.embedRoot === 'pre') continue
    const seg = item.path.split('/')[0]
    if (seg) roots.add(seg)
  }
  return [...roots]
}

function copyTreeForStaticEmbed(
  srcRoot: string,
  destRoot: string,
  blockRel: (relPosix: string) => boolean,
) {
  const walk = (from: string, to: string, relFromSegmentRoot: string) => {
    const st = fs.statSync(from)
    if (st.isDirectory()) {
      fs.mkdirSync(to, { recursive: true })
      for (const name of fs.readdirSync(from)) {
        if (SKIP_DIR_NAMES.has(name)) continue
        const nextFrom = path.join(from, name)
        const nextTo = path.join(to, name)
        const rel = path.join(relFromSegmentRoot, name).replace(/\\/g, '/')
        if (blockRel(rel)) continue
        walk(nextFrom, nextTo, rel)
      }
    } else {
      const rel = relFromSegmentRoot.replace(/\\/g, '/')
      if (blockRel(rel)) return
      if (rel.toLowerCase().endsWith('.zip')) return
      fs.mkdirSync(path.dirname(to), { recursive: true })
      fs.copyFileSync(from, to)
    }
  }
  if (!fs.existsSync(srcRoot)) return
  walk(srcRoot, destRoot, path.basename(srcRoot))
}

function copyEmbedArtifactsToDist() {
  const distDir = path.resolve(__dirname, 'dist')
  const embedOut = path.join(distDir, '__embed')
  const preOut = path.join(distDir, '__embed-pre')

  fs.mkdirSync(embedOut, { recursive: true })

  for (const dir of topLevelEmbedSourceDirs()) {
    const src = path.join(DMOES_ROOT, dir)
    const dest = path.join(embedOut, dir)
    if (!fs.existsSync(src)) {
      console.warn(`[embed-static] skip missing source: ${src}`)
      continue
    }
    copyTreeForStaticEmbed(src, dest, isBlockedRelative)
  }

  if (PRE_ROOT && fs.existsSync(PRE_ROOT)) {
    fs.rmSync(preOut, { recursive: true, force: true })
    const preDist = path.join(PRE_ROOT, 'dist')
    if (fs.existsSync(preDist)) {
      fs.mkdirSync(preOut, { recursive: true })
      copyTreeForStaticEmbed(preDist, path.join(preOut, 'dist'), isBlockedRelative)
    } else {
      console.warn(
        '[embed-static] pre: 未找到 dist/，请在 Jovida pre 仓库执行 npm run build 后再构建作品集',
      )
    }
  }
}

function attachEmbedFromRoot(
  middlewares: Connect.Server,
  mountPrefix: string,
  rootDir: string | null,
) {
  if (!rootDir) return

  middlewares.use((req, res, next) => {
    const raw = req.url?.split('?')[0] ?? ''
    if (!raw.startsWith(mountPrefix)) return next()

    let rel = decodeURIComponent(raw.slice(mountPrefix.length))
    if (rel.includes('\0')) {
      res.statusCode = 400
      res.end('Bad path')
      return
    }
    rel = path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/, '')

    if (isBlockedRelative(rel)) {
      res.statusCode = 403
      res.end('Forbidden')
      return
    }

    const abs = path.resolve(path.join(rootDir, rel))
    if (!isSubpath(rootDir, abs)) {
      res.statusCode = 403
      res.end('Forbidden')
      return
    }

    let filePath = abs
    try {
      if (!fs.existsSync(abs)) return next()
      const st = fs.statSync(abs)
      if (st.isDirectory()) {
        filePath = path.join(abs, 'index.html')
        if (!fs.existsSync(filePath)) {
          res.statusCode = 404
          res.end('Not found')
          return
        }
      }
      const st2 = fs.statSync(filePath)
      if (!st2.isFile()) return next()
    } catch {
      return next()
    }

    sendFile(filePath, res, next)
  })
}

function embedDmoesPlugin() {
  return {
    name: 'embed-dmoes-static',
    configureServer(server: ViteDevServer) {
      attachEmbedFromRoot(server.middlewares, '/__embed/', DMOES_ROOT)
      attachEmbedFromRoot(server.middlewares, '/__embed-pre/', PRE_ROOT)
    },
    configurePreviewServer(server: PreviewServer) {
      attachEmbedFromRoot(server.middlewares, '/__embed/', DMOES_ROOT)
      attachEmbedFromRoot(server.middlewares, '/__embed-pre/', PRE_ROOT)
    },
    closeBundle() {
      copyEmbedArtifactsToDist()
    },
  }
}

const fsAllow = [DMOES_ROOT, ...(PRE_ROOT ? [PRE_ROOT] : [])]

export default defineConfig({
  plugins: [react(), tailwindcss(), embedDmoesPlugin()],
  base: './',
  server: {
    fs: { allow: fsAllow },
  },
})
