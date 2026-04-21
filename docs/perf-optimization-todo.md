# 前端性能优化 TODO

审计时间: 2026-04-20
原则: 等效迁移，不退步。先验证现状再动手。

## 审计结果总览

| # | 方案 | 当前状态 | 是否执行 |
|---|------|---------|---------|
| 1 | Excalidraw `dynamic(ssr:false)` | 已应用 | 跳过 |
| 2 | Contentlayer AST 静态化 | 部分适用 | 低优先级 |
| 3 | 切换 Turbopack | 未应用，需 SVG 适配 | 中优先级 |
| 4 | Middleware matcher 收紧 | 已收紧 (`['/admin/:path*', '/login']`) | 跳过 |
| 5 | Bundle 分析 + 按需剔除 | 未执行 | 高优先级 |
| 6 | Tailwind v4 全面迁移 | 已在 v4（无 `tailwind.config.*`） | 跳过 |

---

## 已应用的方案（无需重复执行）

### #1 Excalidraw 动态加载
- `components/ExcalidrawViewer.tsx:11` — `dynamic(() => ..., { ssr: false })`
- `components/admin/AdminEditorClient.tsx:46` — 同上，带 loading fallback

### #4 Middleware 静态资源旁路
- `middleware.ts:37-39` 已是精确 matcher：
  ```ts
  export const config = {
    matcher: ['/admin/:path*', '/login'],
  }
  ```
- 原提案的 `'/((?!api|_next/static|...).*)'` 会反而**扩大**拦截面（所有非静态路径），退步。保留现状。

### #6 Tailwind v4
- `package.json`: `tailwindcss ^4.0.5` + `@tailwindcss/postcss ^4.0.5`
- 项目根无 `tailwind.config.js` / `.ts`
- `postcss.config.js` 使用 `@tailwindcss/postcss`
- 已是纯 CSS 驱动（`css/tailwind.css` 中 `@theme` 变量）

---

## 待执行任务

### [高] #5 Bundle 分析 + 体积剔除
**前置**: 无
**风险**: 无（只读分析）

步骤:
- [ ] 在 `tailwind-nextjs-starter-blog-sealpi/` 运行 `ANALYZE=true npx next build`
- [ ] 打开生成的 `.next/analyze/client.html` 检查 client bundle 构成
- [ ] 验证 `jose` **不出现在** client chunk（预期：仅 `app/api/admin/_utils.ts` 使用，应打进 server bundle）
- [ ] 检查 `rehype-prism-plus` / Prism 语言包体积，按需裁剪（`defaultLanguage: 'js'` 已设，但其他语言仍可能被引入）
- [ ] 检查 `@headlessui/react` 是否全量打包
- [ ] 检查 `pinyin-pro` 是否出现在 client bundle（`AdminEditorClient.tsx` 用 — 管理端可接受；公共包不可）
- [ ] 生成 baseline 体积报告（截图或 JSON）落档到 `docs/perf-baseline-<日期>.md`

### [中] #3 Turbopack 迁移（dev 环境） — **BLOCKED**
**状态**: 2026-04-20 尝试失败
**症状**: `components/Header.tsx:5` `import Logo from '@/data/logo.svg'` 返回 `{src, width, height}` 静态 asset 对象，非 React 组件。`Element type is invalid ... got: object`
**根因**: Next.js 15 Turbopack 内置 SVG → static image 规则与自定义 `turbopack.rules` 冲突。`@svgr/webpack` loader 未生效。
**当前**: `next.config.js:113-121` 保留 Turbopack 规则（dormant），dev script 回退 webpack
**重试条件**: Next.js 发版说明 SVG 自定义 loader 优先级已修复，或将 logo.svg 改写为 `.tsx` 组件彻底脱离 SVG loader
**前置**: 完成 #5 得到体积 baseline
**风险**: `@svgr/webpack` 在 Turbopack 下无效（`next.config.js:113-115` 的 webpack loader rule 会被忽略）

等效迁移步骤:
- [ ] 确认 SVG 使用点（`grep -r "\.svg" app components layouts`）
- [ ] 在 `next.config.js` 新增 Turbopack SVG 规则（与现有 webpack rule 并存，互不干扰）：
  ```js
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  }
  ```
- [ ] 修改 `package.json` dev 脚本为 `next dev --turbopack -p 13999`，保留 `next build` 用 webpack（生产构建当前稳定）
- [ ] 手工验证冒烟路径：首页、文章详情（含 Excalidraw）、admin 编辑器、登录 OAuth 往返
- [ ] 冒烟通过后更新 `start-local-test.ps1:252` 使用 `--turbopack`
- [ ] 失败回滚: 移除 `--turbopack`，恢复 webpack dev

### [低] #2 Contentlayer 开销重估
**前置**: 无
**风险**: 误删影响作者卡片渲染

现状:
- 唯一 MDX 文件: `data/authors/default.mdx`
- Contentlayer 全量插件（`rehype-katex` / `rehype-citation` / `rehype-prism-plus` / `rehype-preset-minify`）对单文件仍会执行
- `@Deprecated` 提示: `blog` document type 定义可能已弃用（文章走后端），需核实

调查步骤:
- [ ] 查 `contentlayer.config.ts` 是否仍定义 `Blog` document type；若是，确认**无代码引用** `allBlogs` / `allPosts`
- [ ] 若 Blog 已弃用：
  - [ ] 从 config 移除 Blog document type
  - [ ] 保留 Authors type（构建时间应降至秒级）
- [ ] 若 Authors 数量永远 ≤ 3：考虑改为 TS 常量，彻底去掉 contentlayer 依赖（`contentlayer2` + `next-contentlayer2` 共 ~10MB node_modules）

---

## 不执行的方案（已在更优状态）

- **#1 Excalidraw 动态加载** — 已应用
- **#4 Middleware matcher** — 当前更严格
- **#6 Tailwind v4** — 已完整迁移

## 后续评估

- React 19 + pliny/kbar 搜索组件 legacy lifecycle 告警（参考近期会话诊断）。评估是否替换 kbar 或升级 pliny。
- ISR revalidate=300 在多人写作场景下显示滞后（已在文章列表命中）。评估 `revalidateTag` 事件驱动或降到 60s。
