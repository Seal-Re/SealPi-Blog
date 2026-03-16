# 项目自述（现状）

本文档基于当前仓库代码梳理 SealPi-Blog 的现状：一个由前端 Next.js + TypeScript 与后端 Java（DDD 分层）组成的博客平台。

## 1. 仓库结构

- 后端（Java / Maven 多模块）位于 `sealpi-blog/`
- 前端（Next.js / TypeScript）位于 `tailwind-nextjs-starter-blog-sealpi/`

根目录 `README.md` 当前几乎为空，文档以 `docs/v1/` 为准。

## 2. 前端现状（Next.js + Contentlayer）

### 2.1 内容来源与渲染链路

当前前端采用 Contentlayer 扫描本地 `data/blog/**/*.mdx`，构建出类型化的 `allBlogs` 列表，并在路由中静态生成文章页。

关键点：

- 内容源配置：`tailwind-nextjs-starter-blog-sealpi/contentlayer.config.ts`
  - `contentDirPath: 'data'`
  - `Blog` 文档类型：`filePathPattern: 'blog/**/*.mdx'`
  - remark/rehype 插件链用于 MDX 渲染（GFM、数学、代码高亮、TOC 等）

- 首页文章列表：`tailwind-nextjs-starter-blog-sealpi/app/page.tsx` + `tailwind-nextjs-starter-blog-sealpi/app/Main.tsx`
  - 从 `allBlogs` 排序并展示

- 文章列表页：`tailwind-nextjs-starter-blog-sealpi/app/blog/page.tsx` 与分页：`tailwind-nextjs-starter-blog-sealpi/app/blog/page/[page]/page.tsx`

- 文章详情页：`tailwind-nextjs-starter-blog-sealpi/app/blog/[...slug]/page.tsx`
  - `generateStaticParams()` 基于 `allBlogs` 生成静态路由
  - 实际内容渲染使用 `MDXLayoutRenderer`

- MDX 可用组件映射：`tailwind-nextjs-starter-blog-sealpi/components/MDXComponents.tsx`

### 2.2 鉴权与后台缺位（关键局限）

当前前端仍是一个“纯静态展示站点”，在仓库内未看到以下能力：

- 无任何受保护路由（Protected Routes），不存在 `/admin` 域或后台管理入口
- 无用户登录态管理（未接入 Auth.js/NextAuth），无管理员白名单校验
- 不支持在线编辑、草稿保存、发布工作流
- 因此也无法与 Spring Boot 后端建立“带鉴权的管理 API”闭环

> 结论：后续引入 Excalidraw 在线创作时，前端必须新增 Admin Dashboard + 鉴权链路（GitHub OAuth2 + 白名单），并在请求后端管理接口时显式传递 Token。

### 2.3 安全策略（CSP / 外链资源约束）

前端在 `tailwind-nextjs-starter-blog-sealpi/next.config.js` 中设置了 CSP 等安全响应头。

现有 CSP 会影响：

- Excalidraw 组件的动态加载（如果引入第三方包）
- 图片/字体等外链资源加载（如果预览图或 OSS 使用独立域名）

因此在“一期从 iframe 切换为模块直渲染 Excalidraw JSON”后，CSP 重点将从 `frame-src` 转向：

- `img-src` 放行 OSS/CDN 域名（用于 Excalidraw 预览图与图片资产）
- `connect-src` 放行后端 API 域名（用于保存/发布/上传）

## 3. 后端现状（Java DDD 分层，多模块）

后端根聚合工程：`sealpi-blog/pom.xml`，包含模块：

- `blog-client`: 对外 API 接口 + DTO（cmd/qry/vo）
- `blog-app`: 应用层服务编排、Assembler、事务
- `blog-domain`: 领域层模型与 Gateway 接口
- `blog-infra`: 基础设施层（MyBatis-Plus、MySQL、Gateway 实现）
- `blog-adapter`: 适配层（按描述应放 Web Controller 等，但当前代码基本只有启动类）
- `blog-start`: 启动模块（聚合依赖，启动类）

### 3.1 领域模型现状（Article/Tag/Rely）

当前 `Article` 聚合包含：

- `articleId`, `title`, `summary`, `url`, `date`, `lastmod`, `draft`, `count`
- 行为：`modify()`, `publish()`, `delete()`, `updateCount()`

对应的持久化对象 `ArticlePO` 表字段主要也是上述内容（`t_article`）。

注意：后端现状并没有“文章正文内容”字段（无 Markdown 正文、无 Excalidraw JSON、无 Excalidraw URL 专用字段）。

### 3.4 内容存储局限（关键局限）

当前 `ArticlePO`/`t_article` 的字段设计偏“文章元信息”，缺少承载富内容的长文本字段：

- 缺少 `content_json`（用于存 Excalidraw 场景 JSON），容易被迫挤进 `VARCHAR`/`TEXT` 后触发 64KB 等限制
- 缺少 `draft_json`（草稿隔离），编辑中途保存/刷新会带来丢稿或半成品误上线风险
- 缺少 `cover_image_url`（静态预览图），无法为 SEO / Open Graph / 列表兜底提供可抓取图片

因此需要在数据层明确采用 `LONGTEXT` 或 MySQL `JSON` 类型，避免体积增长导致写入瓶颈。

### 3.5 基础设施缺位（OSS 与鉴权）

在 `blog-infra` 目前仅看到 MySQL/MyBatis-Plus 支持，仍缺少：

- 对象存储（OSS）模块：用于承载 Excalidraw 中粘贴/拖拽的图片等二进制资产（本地磁盘映射或 MinIO）
- 鉴权拦截机制：用于保护 `/api/v1/admin/**` 管理接口，校验 `Authorization: Bearer <token>`

这两点是 Excalidraw 在线编辑能力“可用且可控”的前置条件。

### 3.2 应用层与网关

- 应用服务接口：`sealpi-blog/blog-client/src/main/java/com/seal/blog/client/article/api/ArticleServiceI.java`
- 应用服务实现：`sealpi-blog/blog-app/src/main/java/com/seal/blog/app/service/ArticleServiceImpl.java`
  - 实现 create/update/delete/getSingleById/getPage

- Assembler：`sealpi-blog/blog-app/src/main/java/com/seal/blog/app/assembler/ArticleAssembler.java`
  - Cmd -> Entity / Entity -> VO / PageResponse 转换

- Gateway 实现：`sealpi-blog/blog-infra/src/main/java/com/seal/blog/infra/article/impl/ArticleGatewayImpl.java`
  - 基于 MyBatis-Plus 做 CRUD 与分页查询

### 3.3 适配层（Controller）缺口

当前在 `sealpi-blog/blog-adapter/src/main/java` 未发现 `@RestController` 相关 Controller 实现（仓库中有 `sealpi-blog/null/` 目录下的老 Controller，但不属于当前 DDD 模块）。

这意味着“后端作为博客内容提供方”的 HTTP API 需要在 `blog-adapter` 中补齐 Controller，并调用 `blog-client` 的 `ArticleServiceI`。

## 4. 当前需求与演进方向（向动态全栈演进）

结合现状局限与目标需求，系统演进方向应明确为“动态博客系统”（Dynamic Blog System），而非纯静态站点：

- 前端：新增 `/admin` 管理域（Dashboard + Editor），引入 Auth.js(NextAuth) + GitHub OAuth2 实现管理员白名单登录
- 后端：补齐对外文章 API（读）与管理 API（写：保存草稿/发布/上传图片），并在适配层加鉴权拦截
- 内容形态：一期废弃 `iframe + Excalidraw URL fragment` 方案，改为 Excalidraw JSON 前端模块直渲染

为解决 Excalidraw 引入后的 4 个关键技术缺漏，设计必须补齐以下机制：

### 4.1 Excalidraw 静态资源（图片）膨胀问题

- 问题：作者在 Excalidraw 粘贴图片会默认转为 Base64 内嵌进 JSON，单篇内容体积可轻松数 MB，导致 API 超时、DB 写入瓶颈
- 方案：前端编辑器组件必须拦截图片粘贴/拖拽/上传事件，调用后端独立上传 API
  - 后端集成 OSS（本地磁盘映射或 MinIO），返回图片 URL
  - Excalidraw JSON 内仅保存 URL，不保存 Base64

### 4.2 SEO 爬虫与社交媒体分享（Open Graph）盲区

- 问题：Excalidraw 依赖 Canvas 客户端渲染，爬虫抓取不到正文图片，SEO 与分享卡片效果差
- 方案：在“保存/发布”时，前端调用 Excalidraw `exportToBlob` 导出静态预览图（PNG/WebP）并随同 JSON 上传
  - 后端保存为 `coverImageUrl`
  - 前端文章列表页与详情页设置 `<meta property="og:image">` 并兜底展示

### 4.3 草稿与在线隔离机制

- 问题：直接覆盖 `contentJson` 风险高：编辑中途刷新/崩溃会丢稿，或将半成品直接对外可见
- 方案：数据模型增加 `draftJson`
  - “保存草稿”仅更新 `draftJson`
  - “发布”时将 `draftJson` 覆写到 `contentJson`

### 4.4 跨域鉴权状态传递（Token 机制）

- 问题：NextAuth 默认 Session 在 HttpOnly Cookie；当前前后端分离时 Cookie 可能无法自动携带到 Spring Boot API
- 方案：在 NextAuth 的 `jwt` 与 `session` 回调中将可用 Token 暴露给前端
  - 前端调用后端管理 API 时，手动注入 `Authorization: Bearer <Token>`
  - 后端拦截 `/api/v1/admin/**` 校验 Token 并比对白名单 GitHub User ID

下一步详见设计文档：`docs/v1/design.md`。
