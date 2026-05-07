import { useCallback, useMemo, useState } from 'react'
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Flame,
  LayoutGrid,
  ListOrdered,
  PanelLeft,
  Share2,
  Sparkles,
  Wrench,
} from 'lucide-react'
import {
  CATEGORY_LABEL,
  type PortfolioCategory,
  type PortfolioItem,
  ITEMS,
  embedUrl,
} from './items'

const CATEGORY_ORDER: PortfolioCategory[] = [
  'tools',
  'product',
  'jovida',
  'science',
  'workflow',
]

const CATEGORY_ICON: Record<PortfolioCategory, typeof Wrench> = {
  tools: Wrench,
  product: LayoutGrid,
  jovida: Flame,
  science: BookOpen,
  workflow: FileText,
}

function groupItems(items: PortfolioItem[]) {
  const map = new Map<PortfolioCategory, PortfolioItem[]>()
  for (const c of CATEGORY_ORDER) map.set(c, [])
  for (const it of items) {
    map.get(it.category)!.push(it)
  }
  return map
}

function StepThumb({ seed }: { seed: string }) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * (i + 1)) % 360
  return (
    <div
      className="h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br ring-1 ring-white/10"
      style={{
        backgroundImage: `linear-gradient(135deg, hsl(${h}, 55%, 42%) 0%, hsl(${(h + 40) % 360}, 45%, 28%) 100%)`,
      }}
      aria-hidden
    />
  )
}

const IG_URL = 'https://www.instagram.com/jovidardteam/'
const TT_URL = 'https://www.tiktok.com/@jovida_health'

/** 插在「科普物料」与「科普单页 · HTML」之间的外链区；新标签打开，右侧主区仍为 iframe 预览 */
function AigcSocialNavModule() {
  const linkClass =
    'group flex w-full min-h-11 items-center gap-2 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface-0)]/40 px-2 py-2 text-left text-sm text-[var(--color-text)] transition-[background,border-color,box-shadow] hover:border-[var(--color-primary-muted)]/40 hover:bg-[var(--color-surface-2)]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-1)]'
  return (
    <section
      className="rounded-xl border border-[var(--color-border)]/80 bg-[var(--color-surface-0)]/35 px-2 py-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
      aria-labelledby="aigc-social-nav-h"
    >
      <h2
        id="aigc-social-nav-h"
        className="mb-2 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]"
      >
        <Share2 className="h-3.5 w-3.5 text-[var(--color-primary-muted)]" aria-hidden />
        品牌内容 · 社媒触点
      </h2>
      <ul className="space-y-1">
        <li>
          <a href={IG_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#f09433] via-[#dc2743] to-[#bc1888] text-[11px] font-bold text-white ring-1 ring-white/15"
              aria-hidden
            >
              IG
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Instagram</span>
              <span className="mt-0.5 line-clamp-1 text-xs text-[var(--color-text-muted)] opacity-90">
                @jovidardteam
              </span>
            </span>
            <ExternalLink className="h-4 w-4 shrink-0 text-[var(--color-text-muted)] opacity-70 group-hover:opacity-100" aria-hidden />
          </a>
        </li>
        <li>
          <a href={TT_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#00f2ea] to-[#ff0050] text-[11px] font-bold text-white ring-1 ring-white/15"
              aria-hidden
            >
              TT
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">TikTok</span>
              <span className="mt-0.5 line-clamp-1 text-xs text-[var(--color-text-muted)] opacity-90">
                @jovida_health
              </span>
            </span>
            <ExternalLink className="h-4 w-4 shrink-0 text-[var(--color-text-muted)] opacity-70 group-hover:opacity-100" aria-hidden />
          </a>
        </li>
      </ul>
    </section>
  )
}

export default function App() {
  const [active, setActive] = useState<PortfolioItem>(() => ITEMS[0]!)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [navCollapsedDesktop, setNavCollapsedDesktop] = useState(false)
  const [guideOpen, setGuideOpen] = useState(true)
  const grouped = useMemo(() => groupItems(ITEMS), [])
  const previewSrc = useMemo(() => embedUrl(active), [active])

  const isInteractive = active.category === 'jovida' || active.id === 'onboarding'

  const openExternal = useCallback(() => {
    const url = new URL(previewSrc, window.location.href).href
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [previewSrc])

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <a
        href="#main-preview"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[var(--color-surface-2)] focus:px-4 focus:py-2 focus:text-sm focus:text-[var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-0)]"
      >
        跳到预览区域
      </a>

      <header className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-1)]/90 px-4 py-3 backdrop-blur-md md:hidden">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-widest text-[var(--color-primary-muted)]">
            Vibe Portfolio
          </p>
          <p className="truncate text-base font-semibold text-[var(--color-text)]">{active.title}</p>
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-0)]"
          aria-expanded={sidebarOpen}
          aria-controls="nav-sidebar"
          aria-label={sidebarOpen ? '收起作品列表' : '展开作品列表'}
        >
          <PanelLeft className="h-5 w-5" aria-hidden />
        </button>
      </header>

      <aside
        id="nav-sidebar"
        className={`z-30 w-full shrink-0 border-[var(--color-border)] bg-[var(--color-surface-1)]/90 backdrop-blur-xl transition-[transform,opacity,width] duration-200 ease-out md:border-e ${
          sidebarOpen ? 'flex max-h-[46vh] flex-col overflow-y-auto md:max-h-none' : 'hidden md:flex md:flex-col'
        } ${
          navCollapsedDesktop
            ? 'md:pointer-events-none md:w-0 md:min-w-0 md:max-w-0 md:translate-x-[-100%] md:overflow-hidden md:border-0 md:opacity-0'
            : 'md:w-[min(100%,22rem)] md:translate-x-0 md:opacity-100'
        }`}
        aria-label="作品目录"
      >
        <div className="sticky top-0 z-10 hidden items-start justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-1)]/95 px-4 py-4 backdrop-blur-md md:flex">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-accent)]/25 ring-1 ring-[var(--color-border)]">
              <Sparkles className="h-5 w-5 text-[var(--color-primary-muted)]" aria-hidden />
            </span>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight text-[var(--color-text)]">
                Vibe 作品集
              </h1>
              <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-muted)]">
                左侧选条目，右侧 iframe 预览；侧栏可收起腾出空间。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNavCollapsedDesktop(true)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-1)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-1)]"
            aria-label="收起作品集侧栏"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="border-b border-[var(--color-border)] px-4 py-3 md:hidden">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary-muted)]" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">Vibe 作品集</p>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">选一项后在下方预览</p>
            </div>
          </div>
        </div>

        <nav className="space-y-6 px-3 py-4 md:px-4 md:py-6" aria-label="按分类浏览">
          {CATEGORY_ORDER.flatMap((cat) => {
            const Icon = CATEGORY_ICON[cat]
            const list = grouped.get(cat) ?? []
            if (list.length === 0) return []
            const block = (
              <section key={cat} aria-labelledby={`cat-${cat}`}>
                <h2
                  id={`cat-${cat}`}
                  className="mb-2 flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]"
                >
                  <Icon className="h-3.5 w-3.5 text-[var(--color-primary-muted)]" aria-hidden />
                  {CATEGORY_LABEL[cat]}
                </h2>
                <ul className="space-y-1">
                  {list.map((item) => {
                    const selected = item.id === active.id
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setActive(item)
                            if (window.matchMedia('(max-width: 767px)').matches) {
                              setSidebarOpen(false)
                            }
                          }}
                          aria-current={selected ? 'true' : undefined}
                          className={`flex w-full min-h-11 gap-2 rounded-xl px-2 py-2 text-left text-sm transition-[background,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-1)] ${
                            selected
                              ? 'bg-[var(--color-surface-2)] text-[var(--color-text)] shadow-[inset_0_0_0_1px_var(--color-primary)]'
                              : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]/60 hover:text-[var(--color-text)]'
                          }`}
                        >
                          <StepThumb seed={item.id} />
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium">{item.title}</span>
                            <span className="mt-0.5 line-clamp-2 text-xs leading-snug opacity-90">
                              {item.description}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
            if (cat === 'science') {
              return [block, <AigcSocialNavModule key="aigc-social-between-science-workflow" />]
            }
            return [block]
          })}
        </nav>
      </aside>

      <div
        className={`relative flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--color-surface-0)] ${navCollapsedDesktop ? 'md:pl-0' : ''}`}
      >
        {navCollapsedDesktop ? (
          <button
            type="button"
            onClick={() => {
              setNavCollapsedDesktop(false)
              setSidebarOpen(true)
            }}
            className="absolute left-0 top-20 z-40 hidden h-24 w-9 items-center justify-center rounded-r-xl border border-l-0 border-[var(--color-border)] bg-[var(--color-surface-1)]/95 text-[var(--color-text-muted)] shadow-lg backdrop-blur-md hover:text-[var(--color-primary-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] md:flex"
            aria-label="展开作品集侧栏"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        ) : null}

        <div
          id="main-preview"
          className="flex min-h-0 min-w-0 flex-1 flex-col"
          tabIndex={-1}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-0)]/95 px-4 py-3 backdrop-blur-md md:px-8">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-[var(--color-text)] md:text-lg">
                {active.title}
              </h2>
              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[var(--color-text-muted)] md:text-sm">
                {active.description}
                {active.hint ? ` · ${active.hint}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setGuideOpen((v) => !v)}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-0)]"
                aria-expanded={guideOpen}
                aria-controls="demo-guide-panel"
              >
                <ListOrdered className="h-4 w-4 shrink-0" aria-hidden />
                {guideOpen ? '收起步骤' : '简要步骤'}
              </button>
              <button
                type="button"
                onClick={openExternal}
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] px-4 text-sm font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-primary-muted)]/50 hover:bg-[var(--color-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-0)]"
              >
                <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
                新标签打开
              </button>
            </div>
          </div>

          {active.needsGeminiBackend ? (
            <div
              className="border-b border-[var(--color-info-border)] bg-[var(--color-info-bg)] px-4 py-2.5 text-xs leading-relaxed text-[var(--color-on-info)] md:px-8"
              role="status"
            >
              <span className="font-semibold">Gemini 后端：</span>
              {active.geminiBackendNote}
            </div>
          ) : null}

          {active.needsServer ? (
            <div
              className="border-b border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-4 py-2.5 text-xs leading-relaxed text-[var(--color-on-warning)] md:px-8"
              role="status"
            >
              <span className="font-semibold">本机服务：</span>
              {active.serverNote}
            </div>
          ) : null}

          {guideOpen ? (
            <section
              id="demo-guide-panel"
              className="border-b border-[var(--color-border)] bg-[var(--color-surface-1)]/50 px-4 py-4 md:px-8"
              aria-label="简要步骤"
            >
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                <ListOrdered className="h-4 w-4 text-[var(--color-primary-muted)]" aria-hidden />
                使用步骤
              </h3>
              <ol className="grid gap-3 md:grid-cols-2">
                {active.steps.map((s, i) => (
                  <li
                    key={`${active.id}-step-${i}`}
                    className="flex gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-0)]/80 p-3 md:p-4"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-xs font-bold text-[var(--color-primary-muted)] ring-1 ring-[var(--color-primary)]/25">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--color-text)]">{s.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)] md:text-sm">
                        {s.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <div
            className={`relative flex min-h-0 flex-1 flex-col ${
              isInteractive ? 'bg-[var(--color-surface-0)] px-3 py-4 md:px-10 md:py-8' : ''
            }`}
          >
            <div
              className={`flex min-h-0 flex-1 flex-col ${
                isInteractive
                  ? 'mx-auto w-full max-w-[min(100%,1200px)] overflow-hidden rounded-2xl ring-1 ring-[var(--color-border)] shadow-[0_24px_80px_rgba(0,0,0,0.35)]'
                  : ''
              }`}
            >
              <iframe
                key={previewSrc}
                title={active.title}
                src={previewSrc}
                className={`w-full flex-1 border-0 bg-[#050506] ${
                  isInteractive
                    ? 'min-h-[72vh] rounded-2xl md:min-h-[calc(100dvh-22rem)]'
                    : 'min-h-[58vh] md:min-h-[calc(100dvh-14rem)]'
                }`}
                loading="lazy"
              />
            </div>
          </div>

          <footer className="border-t border-[var(--color-border)] px-4 py-3 text-center text-[11px] leading-relaxed text-[var(--color-text-muted)] md:px-8">
            左侧选作品，中间看预览；需要全屏或调试请「新标签打开」。
          </footer>
        </div>
      </div>
    </div>
  )
}
