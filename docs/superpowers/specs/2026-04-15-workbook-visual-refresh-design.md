# Workbook Visual Refresh + Markdown Body 设计文档

**日期**：2026-04-15  
**状态**：已确认，待实施  
**作者**：seal

---

## 背景与目标

SealPi-Blog 的文章内容主体是 Excalidraw JSON 草图，而非纯文本博客。当前站点使用 tailwind-nextjs-starter-blog 默认视觉，与手绘内容气质不符。

本次改版目标：

1. 建立"Workbook"设计系统——奶咖暖色调 + Fraunces 衬线 + 手写体点缀，让站点 chrome 与 Excalidraw 画布融为一体
2. 在文章中引入 Markdown 正文字段（`body_md`），使每篇文章可以在 Excalidraw 图之外附带结构化文字
3. V1 不做移动端响应式，不做 Admin 实时预览

---

## §1 · 设计系统

### 色板

| Token | 值 | 用途 |
|---|---|---|
| `--wb-paper` | `#f5ece1` | 页面底色 |
| `--wb-canvas` | `#fbf5ec` | Excalidraw 卡底 |
| `--wb-ink` | `#1f1a15` | 标题 |
| `--wb-ink-soft` | `#2a241e` | 正文 |
| `--wb-meta` | `#7d6955` | 日期 / tag |
| `--wb-accent` | `#a6582b` | 焦糖：drop cap、Caveat、eyebrow |
| `--wb-rule` | `#c9b597` | 分割线 |
| `--wb-rule-soft` | `#ded7cc` | 弱分隔 |
| `--wb-card-shadow` | `#e6d6bd` | 卡纸阴影 |

### 字体分区（四区严格克制）

| 字体 | 用途区域 | CSS 变量 |
|---|---|---|
| Fraunces (serif, italic) | 文章标题、正文、drop cap | `--font-fraunces` |
| Inter (sans) | eyebrow、meta、UI 控件 | `--font-inter` |
| Geist Mono (mono) | tag、数字、代码 | `--font-geist-mono` |
| Caveat (handwriting) | 画布注释、侧栏批注、section mark | `--font-caveat` |

Caveat 严格限制在四个区域，不用于标题或正文，避免与 Excalidraw 里本身的手绘字体抢戏。

### Motion 时长

| 名称 | 时长 | 用途 |
|---|---|---|
| micro | 150ms | hover 状态 |
| ui | 250ms | 按钮 / toggle |
| reveal | 400ms | 滚动入场 |
| page | 600ms | 路由切换 |

缓动函数统一：`cubic-bezier(.2,.8,.2,1)`

**Reveal 入场规则**：起始态 `opacity: 0.35` + `blur(8px)`，终态 `opacity: 1` + `blur(0)`。**永远不从 opacity 0 开始**。  
`prefers-reduced-motion: reduce` 时所有 duration 归零，blur 不播。

### Token 文件

`lib/workbook/tokens.ts` 导出 `wbTokens` 对象（color + motion），同时在 `tailwind.config.ts` 的 `theme.extend` 注册为 `wb.*` 颜色类和 `duration-{micro,ui,reveal,page}` 工具类。

---

## §2 · 数据层

### 2.1 DB 迁移

```sql
ALTER TABLE sealpi_blog.articles
  ADD COLUMN body_md           LONGTEXT     NULL AFTER content_json,
  ADD COLUMN draft_body_md     LONGTEXT     NULL AFTER draft_json,
  ADD COLUMN cover_caption     VARCHAR(200) NULL AFTER preview_image_url,
  ADD COLUMN draft_cover_caption VARCHAR(200) NULL AFTER draft_preview_image_url;
```

- 全部可空，无新索引，无默认值
- 上线零停机；旧文章四字段均为 NULL，前端渲染时优雅降级（不渲染 body 区域）

### 2.2 后端变更

**DTOs（`blog-client`）**

`AdminArticleVO` / `AdminArticleCmd` 追加四字段：

```java
private String bodyMd;
private String draftBodyMd;
private String coverCaption;
private String draftCoverCaption;
```

**Domain（`blog-domain`）**

`Article` 聚合追加四个字段；`publishFromDraft()` 在 domain 层 copy 五组 draft 字段（含新增的 `draftBodyMd`→`bodyMd`、`draftCoverCaption`→`coverCaption`），保持 DDD 合规。

**Infra / Mapper**

`ArticlePO` 追加对应列；`ArticleInfraConverter`（MapStruct）自动映射；`ArticleGatewayImpl` 无需额外改动。

**Adapter**

`ArticleAdminController` multipart 接收 `draftBodyMd`、`draftCoverCaption` 两个新字段（`@RequestParam(required = false)`）。

### 2.3 Markdown 渲染位置

**后端不渲染 Markdown**，由 Next.js RSC 在 Node.js 服务端渲染。理由：

- 支持自定义 React 组件（`:::note` → `<MarginNote>`）
- editor 预览与发布页视觉一致，单一渲染路径
- remark / rehype 生态在 JS 侧成熟
- 保持 DDD 纯度（后端 domain 不感知展示层格式）

唯一额外成本：RSS Feed 需通过 Next.js 路由渲染 Markdown 为纯文本摘要。

**前端类型补全**（`lib/blog-api-types.ts`）

```typescript
// AdminArticle
coverCaption?:       string;
bodyMd?:             string;
draftCoverCaption?:  string;
draftBodyMd?:        string;

// AdminArticleFormPayload
draftBodyMd?:        string;
draftCoverCaption?:  string;
```

### 2.4 测试补强（`blog-adapter`）

新增 4 个测试 case：
1. 创建草稿时带 `draftBodyMd` → 保存成功，`draft_body_md` 持久化
2. 发布时 `draftBodyMd` 复制到 `bodyMd`，`body_md` 存在于 VO
3. 离线回草稿后 `bodyMd` 清空，`draftBodyMd` 保留
4. `draftBodyMd` 超过 100KB 不被截断（边界）

---

## §3 · UI 层

### 3.1 文章详情页组件树

```
app/blog/[...slug]/page.tsx                ← RSC，改动最小
  └── <WorkbookArticleLayout>              ← 新建
        ├── <ExcalidrawHero>               ← SSR: <img> 占位；CSR: Excalidraw Viewer hydration
        │     └── .wb-canvas-caption       ← Caveat，coverCaption 字段
        ├── <h1 class="wb-title">          ← Fraunces Italic 48px
        ├── <WbMeta>                       ← date · read_time · tags (Geist Mono)
        ├── <WbDivider>                    ← SVG squiggle 120px
        └── <BodyMarkdown>                 ← RSC，接受 bodyMd?: string
              ├── remark-gfm
              ├── remark-directive → :::note → <MarginNote>
              ├── rehype-highlight          ← code fence 高亮
              └── rehype-slug              ← heading anchor
```

所有 `components/workbook/` 组件为新建文件，不修改现有组件。

### 3.2 关键组件细节

**ExcalidrawHero**

- SSR 阶段：`<img src={previewImageUrl} alt={title} />` 占位，aspect-ratio 16/9
- Client hydration：`next/dynamic({ ssr: false })` 加载 Excalidraw `@excalidraw/excalidraw` Viewer，`viewModeEnabled`、`zenModeEnabled` 均为 true
- 封装在 `.wb-canvas`（`background: #fbf5ec`, `border: 1px solid #c9b597`, `box-shadow: 3px 4px 0 #e6d6bd`）

**MarginNote（:::note 语法）**

Markdown 写法：
```
:::note
这个 Gateway 接口写在 domain 层。
:::
```

渲染输出：
```tsx
<aside className="wb-margin">
  <span className="hand">这个 Gateway 接口写在 domain 层。</span>
</aside>
```

样式：左侧 2px dashed `#c9b597` 边线，Caveat 字体，焦糖色，轻微旋转。这是本次改版唯一的 Markdown 自定义扩展块。

**Drop cap**

`.wb-body p:first-letter`，Fraunces Italic 48px，焦糖色，float left，仅作用于正文第一段。

**WbDivider**

内联 SVG squiggle path（`M2 8 Q 10 3 20 8 T …`），宽 120px，stroke `#a6582b` opacity 0.6，不使用 `border-top`。

### 3.3 Admin 编辑器扩展

在 `AdminEditorClient.tsx` 的 Excalidraw 画板下方追加两个字段，不改动画板布局：

| 字段 | 控件 | placeholder |
|---|---|---|
| `draftCoverCaption` | `<input type="text">` | 画布注释（Caveat 手写体显示） |
| `draftBodyMd` | `<textarea>` 可拉伸 | `# 正文\n\n支持 Markdown，:::note 块渲染为手写批注。` |

V1 无实时预览，通过"保存草稿 → 预览"流程确认效果。

### 3.4 草稿预览路由

`app/admin/preview/[id]/page.tsx`（新建，管理员鉴权）

- 读草稿字段：`draft_json`、`draft_body_md`、`draft_cover_caption`
- 使用 `WorkbookArticleLayout` 渲染，与发布页视觉一致
- 不收录进 sitemap，URL 不公开

---

## §4 · Motion & Token 落地

### 4.1 Token 文件结构

```typescript
// lib/workbook/tokens.ts
export const wbTokens = {
  color: { /* 9 tokens, 见 §1 */ },
  motion: {
    micro: '150ms', ui: '250ms', reveal: '400ms', page: '600ms',
    ease: 'cubic-bezier(.2,.8,.2,1)',
  },
} as const;
```

字体通过 `next/font/google` 实例（`app/layout.tsx`）注入为 CSS 变量，不放入 token 对象。

### 4.2 Tailwind 集成

```typescript
// tailwind.config.ts → theme.extend
colors: { wb: wbTokens.color },
fontFamily: {
  fraunces: ['var(--font-fraunces)', 'serif'],
  caveat:   ['var(--font-caveat)', 'cursive'],
},
transitionDuration: {
  micro: '150ms', ui: '250ms', reveal: '400ms', page: '600ms',
},
```

Workbook 组件全部用 Tailwind utility 类（`bg-wb-paper`、`text-wb-accent`、`font-fraunces`、`duration-reveal`），不引入额外 CSS Module。

### 4.3 Reveal Hook

```typescript
// hooks/useReveal.ts
// 给带 data-reveal 属性的元素注册 IntersectionObserver
// 进入视口 → 移除 opacity-[0.35] blur-[8px]，添加 opacity-100 blur-0
// prefers-reduced-motion: reduce → 直接设终态，不播动画
```

路由切换用 Framer Motion `AnimatePresence` 包住 `app/layout.tsx` 的内容区，仅做 `opacity: 0.35 → 1`（600ms），无位移。

---

## §5 · 交付阶段

### Phase 1 · 基础（无视觉变化）

1. DB migration — ALTER TABLE，4 个可空字段
2. 后端 DTO / domain / gateway 补字段，`publishFromDraft()` 更新
3. `lib/workbook/tokens.ts` + `tailwind.config.ts` 扩展 + `app/layout.tsx` 字体注入
4. **Admin 路由整理**（并行）：删 `app/admin/login/page.tsx`、加 `app/admin/ops/page.tsx` 占位、更新 `AdminShell` 侧边栏为五项（仪表盘 / 运维 / 新建 / 文章管理 / 草稿箱）

验收：`npx next build` 通过，`mvnw test` 绿，现有页面视觉不变。

### Phase 2 · 文章页 Workbook 化

1. `components/workbook/` 全套组件
2. `app/blog/[...slug]/page.tsx` 切换新 layout
3. `useReveal` hook + `prefers-reduced-motion` 降级
4. `body_md` 为 null 时正文区不渲染（向后兼容）

验收：已有文章正常渲染；带 `body_md` 的测试文章展示完整 Workbook 样式。

### Phase 3 · Admin 编辑器扩展

1. `AdminEditorClient.tsx` 加两个输入控件
2. Admin multipart API 补发新字段
3. `app/admin/preview/[id]/page.tsx`

验收：能保存 cover caption 和 body_md；预览路由展示草稿 Workbook 效果。

### 不在本次范围

| 项目 | 说明 |
|---|---|
| 移动端响应式 | V1.5 |
| Admin 实时 Markdown 预览 | V1.5 |
| pretext 集成 | 未来技术选型，等待明确需求 |
| Turbopack 性能优化 | 独立任务 |
| `allowLegacyJwt` 死字段修复 | 独立 bug fix |

---

## 架构决策记录（ADR）

| 决策 | 结论 | 理由 |
|---|---|---|
| 站点风格 | Workbook（奶咖暖色 + Fraunces） | 与 Excalidraw 手绘内容气质融合，避免 Gallery（冷）或 Neutral（对内容中立但失温度） |
| Markdown 渲染位置 | Next.js RSC（Node.js 服务端） | 支持自定义 React 组件、单一渲染路径、remark 生态、DDD 纯度 |
| 自定义 Markdown 扩展 | 仅 `:::note` → MarginNote | 克制用量，保持手写批注作为核心差异化元素 |
| Drop cap 尺寸 | 48px（非 64px） | 视觉更克制，不抢 Excalidraw 画布的注意力 |
| Reveal 入场起始 opacity | 0.35（非 0） | 从完全不可见开始体验割裂，0.35 保持页面可读性的同时有入场感 |
| Caveat 使用范围 | 画布注释 / 侧栏批注 / section mark / cover caption | 超出此范围会与 Excalidraw 内部手绘字体抢戏 |
| Admin 编辑器 V1 | textarea，无实时预览 | 最小实现，通过预览路由确认效果，避免过早复杂化 |
