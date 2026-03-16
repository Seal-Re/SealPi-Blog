# 后续设计（v1）

本文档描述从“纯静态 MDX 博客（Contentlayer 构建期编译）”向“动态博客系统（前后端分离 + 在线创作后台）”的演进设计。

一期（v1）核心选择：废弃 `iframe + Excalidraw URL fragment` 方案，采用“Excalidraw JSON 前端模块直渲染 + 后端存储与管理 API + OSS 图片资产”的闭环。

## 0. 目标与范围

### 0.1 一期目标（v1）

- Excalidraw 内容形态升级：
  - 前台文章详情页提供只读渲染组件 `<ExcalidrawViewer />`，消费后端下发的 `contentJson`
  - 后台 `/admin` 域提供在线创作组件 `<ExcalidrawEditor />`，支持草稿保存与发布

- 管理员鉴权：
  - 基于 Auth.js(NextAuth) + GitHub OAuth2 登录
  - 使用“硬编码白名单 GitHub User ID”作为一期管理员准入（不做 RBAC）
  - 前端调用后端管理 API 时，通过 `Authorization: Bearer <token>` 传递鉴权

- 内容存储与 SEO 兜底：
  - 后端持久化 `content_json`（线上可读内容）与 `draft_json`（编辑草稿隔离）
  - 保存/发布时生成静态预览图（PNG/WebP），后端保存 `cover_image_url` 用于 Open Graph 与列表兜底展示

- 二进制资产治理：
  - 前端拦截 Excalidraw 粘贴/拖拽图片，调用后端独立上传接口
  - 后端集成 OSS（本地磁盘映射或 MinIO），返回可访问 URL，JSON 内仅保存 URL

### 0.2 一期不做

- 不做多用户角色权限管理（RBAC）与复杂权限策略
- 不做在线协同编辑（多人实时协作）
- 不做复杂的全文检索与评论/弹幕实时系统（可在后续版本设计）

### 0.3 关键约束与设计取舍

- Excalidraw 画布属于 Canvas 渲染，爬虫不可见：必须在保存/发布时导出静态预览图用于 SEO/分享
- Excalidraw 图片默认会 Base64 内嵌到 JSON：必须通过上传 API 外置化，否则会引发接口/DB 性能问题
- 前后端分离场景 Cookie 不可靠：一期统一采用 `Authorization` 头传 Token；后端对 `/api/v1/admin/**` 做拦截校验

相关配置与边界：`tailwind-nextjs-starter-blog-sealpi/next.config.js`

## 1. 现状与差距（摘要）

### 1.1 前端（当前）

- 内容来源：本地 `data/blog/**/*.mdx` -> Contentlayer `allBlogs`
- 文章详情渲染：`MDXLayoutRenderer` 渲染 `post.body.code`

关键入口：

- 列表页：`tailwind-nextjs-starter-blog-sealpi/app/blog/page.tsx`
- 详情页：`tailwind-nextjs-starter-blog-sealpi/app/blog/[...slug]/page.tsx`
- MDX 组件映射：`tailwind-nextjs-starter-blog-sealpi/components/MDXComponents.tsx`

### 1.2 后端（当前）

- DDD 分层：`client/app/domain/infra/adapter/start`
- `Article` 当前字段包含 `title/summary/url/date/lastmod/draft/count`，尚无“正文内容”字段
- `blog-adapter` 当前未提供 `@RestController` 的对外 API（仓库中 `sealpi-blog/null/` 的 Controller 视为历史遗留）

## 2. 一期目标态架构

```mermaid
flowchart LR
  subgraph FE[Next.js Frontend]
    C[Public Site\n/blog/...]
    AD[Admin Site\n/admin/...]
    GH[GitHub OAuth Provider]
  end

  subgraph BE[Spring Boot Backend (Java DDD)]
    API[REST API\n/api/v1/**]
    OSS[OSS Service\nLocal/MinIO]
  end

  C -->|GET /api/v1/articles/{id}| API

  AD -->|Auth.js(NextAuth)\nOAuth Login| GH
  AD -->|POST /api/v1/admin/upload\n(binary image)| API
  AD -->|POST /api/v1/admin/articles\n(draftJson + preview blob)| API

  API -->|store content_json/draft_json/cover_image_url| DB[(MySQL)]
  API -->|upload -> return url| AD
```

说明：

- 前台（Public）只读：消费后端 `contentJson`，在客户端组件 `<ExcalidrawViewer />` 内模块直渲染
- 后台（Admin）可写：`<ExcalidrawEditor />` 负责草稿保存/发布，并将图片资产外置到 OSS
- SEO/分享兜底：保存/发布时导出预览图，后端落 `coverImageUrl`，供列表与 `<meta property="og:image">` 使用

## 3. 数据模型与接口草案

> 本章需要落到 `blog-client` DTO 与 `blog-adapter` Controller；字段命名以 snake_case 表字段、camelCase JSON 字段为约定。

### 3.1 数据库字段级设计（t_article）

在现有文章元信息字段基础上，新增/调整：

- `content_json`：`LONGTEXT`（或 MySQL `JSON`）
  - 已发布对外可见的 Excalidraw 场景 JSON
- `draft_json`：`LONGTEXT`
  - 编辑草稿，保存草稿仅更新该字段
- `cover_image_url`：`VARCHAR(512)`
  - Excalidraw 导出的静态预览图 URL，用于列表兜底与 Open Graph
- `view_count`：`INT`
  - 阅读量统计（可选：也可复用现有 `count`，但建议语义更明确）

说明：

- `content_json/draft_json` 体积可能较大，避免使用 `TEXT`/`VARCHAR` 造成长度与性能问题
- `cover_image_url` 建议走 OSS/CDN，避免将二进制直接塞入 DB

### 3.2 公共读接口（C 端）

- GET `/api/v1/articles/{id}`：文章详情（对外展示）
  - 下发 `contentJson`（已发布内容）与 `coverImageUrl`

响应（示例）：

```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "...",
    "date": "2026-03-16",
    "lastmod": "2026-03-16",
    "tags": ["tag1"],
    "summaryMarkdown": "...",
    "contentJson": {"type": "excalidraw", "version": 2, "source": "..."},
    "coverImageUrl": "https://cdn.example.com/covers/1.webp",
    "viewCount": 123
  }
}
```

- GET `/api/v1/articles`：文章列表（分页）
  - 列表不建议下发 `contentJson`，仅下发 `coverImageUrl` + `summaryMarkdown` + 元信息

### 3.3 管理写接口（Admin，需要鉴权）

按 RESTful 语义区分“创建资源”与“更新既有资源”，同时保留 `action` 用于区分草稿/发布状态：

- POST `/api/v1/admin/articles`：新建文章（可直接发布或先存草稿）
  - Header：`Authorization: Bearer <token>`
  - Body：`title` + `summaryMarkdown` + `draftJson` + `previewImage`（base64 或 multipart，推荐 multipart）
  - Query：`action=draft|publish`

- PUT `/api/v1/admin/articles/{id}`：更新文章（保存草稿或重新发布）
  - Header：`Authorization: Bearer <token>`
  - Body：`title?` + `summaryMarkdown?` + `draftJson` + `previewImage?`
  - Query：`action=draft|publish`
  - 行为：
    - `action=draft`：更新 `draft_json`，可选更新 `cover_image_url`
    - `action=publish`：将 `draft_json` 覆写到 `content_json`，并更新 `cover_image_url`

- POST `/api/v1/admin/upload`：图片上传（Excalidraw 资产外置）
  - Header：`Authorization: Bearer <token>`
  - Body：`multipart/form-data`（file）
  - Response：`url`

备注：

- `summaryMarkdown` 允许使用部分 MDX 组件，但必须在前端侧定义允许的组件集合（白名单）
- `contentJson/draftJson` 仅保存 JSON（含图片 URL），禁止内嵌 Base64（防膨胀）

## 4. 前端改造方案（详细设计）

### 4.1 组件拆分

- `<ExcalidrawViewer />`（前台只读渲染）
  - 作为 Client Component（Canvas 依赖浏览器环境）
  - 使用 `next/dynamic` 懒加载 Excalidraw 渲染模块
  - 关键参数：`viewModeEnabled={true}`、禁用编辑 UI、只读交互
  - 输入：后端下发的 `contentJson`

- `<ExcalidrawEditor />`（后台在线创作）
  - 作为 Client Component
  - 职责：
    - 拦截图片粘贴/拖拽/上传事件：调用后端 `/api/v1/admin/upload`，拿到 `url` 后写回 Excalidraw 文件引用
      - 需维护 `fileId -> url` 映射字典，并将该映射与场景数据一起持久化/回读（否则 Excalidraw 无法在下次渲染时根据 FileId 找到外部图片）
    - `onChange` 接管与防抖保存（Debounce）：定时保存草稿到 `/api/v1/admin/articles?action=draft`
    - 发布：调用 `/api/v1/admin/articles?action=publish`
    - 保存/发布时调用 Excalidraw `exportToBlob` 导出预览图（PNG/WebP）并随请求提交

### 4.2 路由与后台域（/admin）

规划前端路由：

- `/admin/dashboard`：统计/文章列表/草稿状态（一期可简化为文章列表 + 编辑入口）
- `/admin/editor`：新建/编辑页面（按 `articleId` 或 `slug` 进入）

### 4.3 后台鉴权保护（Next.js Middleware + NextAuth）

- Middleware 拦截 `/admin/:path*`
  - 未登录：重定向到 NextAuth 的 GitHub 授权入口
  - 已登录但非白名单：直接 403 或跳转到“无权限”页

- Token 下发与后端调用
  - 在 NextAuth 的 `jwt` / `session` 回调中，将可用 token 暴露给前端（`session.accessToken`）
  - 调用 Spring Boot 管理接口时，显式设置 Header：`Authorization: Bearer <token>`

### 4.4 SEO 与 Open Graph

- 列表页优先展示 `coverImageUrl`，无则回退站点默认图
- 详情页设置 `<meta property="og:image">` 指向 `coverImageUrl`
- 说明：Excalidraw 画布不被爬虫识别，因此预览图是 SEO/分享必需品，而非可选优化

### 4.5 CSP 与跨域策略

从 iframe 方案切换为模块渲染后，CSP 调整重点：

- `connect-src`：允许后端 API 域名（保存/发布/上传）
- `img-src`：允许 OSS/CDN 域名（预览图、图片资产）

不再需要为 Excalidraw 外链站点放开 `frame-src`。

## 5. 后端改造方案（DDD 落地与权限）

### 5.1 数据层适配（LONGTEXT/JSON）

- `blog-infra`：更新 `ArticlePO` 与 MyBatis Mapper，支持 `content_json/draft_json/cover_image_url/view_count` 的插入与更新
- 表字段类型：`content_json/draft_json` 使用 `LONGTEXT`（或 MySQL `JSON`）以规避 64KB 限制

### 5.2 OSS（对象存储）模块

在 `blog-infra` 增加 OSS 基础设施能力（实现可先走本地磁盘映射，后续切 MinIO）：

- 存储：本地磁盘目录映射或 MinIO bucket
- 返回：对外可访问 URL（可直连或经 Nginx 反代）

对应 API：`POST /api/v1/admin/upload` 接收 `multipart/form-data`，返回 `url`。

### 5.3 安全与鉴权（Interceptor/Filter）

在 `blog-adapter` 层实现全局拦截器（或 Filter）：

- 拦截所有 `/api/v1/admin/**` 路径
- 校验请求 Header：`Authorization: Bearer <token>`
- 解析 token（一期可简化为：后端只校验 token 内携带的 GitHub User ID/subject 是否命中白名单）
- 白名单来源：后端配置 `admin.github.userId`（环境变量或配置文件）
- 失败策略：返回 401/403

### 5.4 分层职责（保持 DDD 结构）

- `blog-client`：对外 DTO/接口（公共读 + 管理写）
- `blog-app`：应用服务编排（保存草稿/发布/上传引用落库）
- `blog-domain`：聚合与网关接口扩展（按用例补齐）
- `blog-infra`：MyBatis-Plus + OSS 实现
- `blog-adapter`：Controller + 鉴权拦截
- `blog-start`：启动聚合

## 6. 权限管理（新增章节）

### 6.1 鉴权链路说明

- 管理员访问 `/admin/*`
- NextAuth 引导 GitHub OAuth 授权
- 前端获得 GitHub User ID
- NextAuth `signIn` 回调：校验 User ID 是否在前端 `ADMIN_GITHUB_IDS` 白名单，不在则阻断登录
- NextAuth `jwt/session` 回调：将 token 暴露给前端（`session.accessToken`）
- 前端调用后端管理 API：Header 注入 `Authorization: Bearer <token>`
- 后端拦截 `/api/v1/admin/**`：解析 token 并比对后端 `admin.github.userId` 白名单，放行后进入应用服务

## 7. 弹幕模块（仅设计，不实现）

### 7.1 目标

- 在阅读文章时，叠加展示实时或回放的弹幕内容

### 7.2 事件模型（草案）

- `DanmakuCreated`
  - `articleId`
  - `content`
  - `timestamp`
  - `style`（颜色/轨道/速度等）

### 7.3 接口草案

- POST `/api/v1/articles/{id}/danmaku`
- GET `/api/v1/articles/{id}/danmaku?since=...`（拉取）或 SSE/WebSocket（后续）

## 8. 迁移步骤（不含实现细节）

1) 后端：数据模型升级（`content_json/draft_json/cover_image_url/view_count`），补齐读/写 API（adapter/controller）
   - 状态：已完成代码字段与映射贯通（不含 DB DDL 迁移脚本）
   - 代码参考：`blog-domain`/`blog-infra`/`blog-client` 相关类
2) 后端：新增 OSS 上传接口 `/api/v1/admin/upload`，并与文章保存/发布流程打通
3) 后端：在 `blog-adapter` 增加鉴权拦截，保护 `/api/v1/admin/**`
4) 前端：新增 `/admin` 路由域 + NextAuth GitHub OAuth2 + 管理员白名单
5) 前端：实现 `<ExcalidrawEditor />`（拦截图片上传、草稿防抖保存、发布导出预览图）
6) 前端：实现 `<ExcalidrawViewer />` 并在文章详情页只读渲染 `contentJson`
7) 前端：列表/详情接入 `coverImageUrl`，设置 Open Graph 元信息
8) 文档评审后，再进入实现模式

## 9. 未决项清单

- 后端 token 校验策略：
  - 方案 A：后端校验 GitHub User API（需要网络调用）
  - 方案 B：Next.js 侧签发标准 JWT（JWS，例如 HS256），Spring Boot 侧离线验签并解析 GitHub User ID/subject
  - 一期建议：B（后端离线校验，减少外部依赖；对称密钥通过环境变量在两端保持一致）

- `view_count` 是否复用现有 `count` 字段（建议新字段，语义更清晰）
- 预览图格式选择：PNG（兼容）vs WebP（体积小）
- `summaryMarkdown` 运行时渲染技术选型与组件白名单范围
- OSS 部署形态：本地磁盘映射 vs MinIO（开发/生产差异）
