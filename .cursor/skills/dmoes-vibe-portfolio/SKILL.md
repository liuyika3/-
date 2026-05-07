---
name: dmoes-vibe-portfolio
description: >-
  Operates the dmoes monorepo Vibe 作品集 (vibe-portfolio): Vite + React sidebar,
  __embed static HTML from dmoes root and optional pre build, items.ts entries,
  减脂教练业务展示 static tree, Playwright jovida-embed.spec. Use when the user
  mentions 作品集, vibe-portfolio, embed 预览, 减脂教练业务展示, items.ts,
  SPARE 总览, or portfolio changes.
---

# dmoes · Vibe 作品集

## 仓库位置

- 应用根目录：`vibe-portfolio/`（与 dmoes 根同级：`../减脂教练业务展示/` 等）。
- 静态物料总览：`减脂教练业务展示/index.html`（SPARE 五维大括号；子页在 `减脂教练业务展示/modules/`）。

## 如何本地跑

```bash
cd vibe-portfolio
npm install
npm run dev
```

- 勿用 `file://` 打开内嵌页；预览依赖 Vite 中间件把 `/__embed/` 映射到 **dmoes 仓库根**（见 `vite.config.ts` 的 `DMOES_ROOT`）。
- 科普物料「Jovida Methodology（pre）」：若默认旁路不存在，设环境变量 `JOVIDA_PRE_ROOT` 指向 `pre` 的构建输出目录（含 `dist/index.html`）。

## 改目录或条目时必查

| 改动 | 文件 |
|------|------|
| 侧栏分类名、条目标题/简介/步骤 | `vibe-portfolio/src/items.ts`（`CATEGORY_LABEL`、`ITEMS`、`embedUrl`） |
| 壳层文案 | `vibe-portfolio/src/App.tsx` |
| 内嵌路径改名 | `ITEMS[].path` + `tests/jovida-embed.spec.ts` 里 `__embed/` 的 **URL 编码路径** |
| 减脂总览与子页 HTML | `减脂教练业务展示/index.html`、`减脂教练业务展示/modules/*.html` |

## 验证

```bash
cd vibe-portfolio
npx tsc --noEmit
npx playwright test tests/jovida-embed.spec.ts
```

- 改内嵌路径或外食页 `figure img` 数量后应跑上述测试再声称通过。

## 内嵌 URL 规则

- `embedUrl(item)`：`path` 段会做 `encodeURIComponent`；中文目录名在 Playwright 里要写编码后的 `/__embed/...`。
