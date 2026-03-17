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

### 2.2 鉴权与后台现状

前端 P0 已完成最小可用后台壳层，已具备以下能力：

- 已接入 Auth.js/NextAuth 的 GitHub OAuth 登录：`tailwind-nextjs-starter-blog-sealpi/auth.ts`
- 已基于 GitHub User ID 完成管理员白名单校验：`tailwind-nextjs-starter-blog-sealpi/auth.ts`
- 已通过 Middleware 保护 `/admin` 路由：`tailwind-nextjs-starter-blog-sealpi/middleware.ts`
- 已具备后台首页入口：`tailwind-nextjs-starter-blog-sealpi/app/admin/page.tsx`
- 已在 session 中暴露 `accessToken/githubUserId/isAdmin`：`tailwind-nextjs-starter-blog-sealpi/types/next-auth.d.ts`

当前仍缺少的前端能力：

- 尚未实现 `Bearer Token` 透传封装，前端还不能统一调用 Spring Boot 管理 API
- 尚未实现 `/admin/login` 专用登录页
- 尚未实现后台文章列表、编辑器、草稿保存、发布工作流
- 尚未实现 Excalidraw 编辑器/查看器与后端动态文章链路对接

> 结论：前端已从“纯静态展示站点”升级到“具备后台鉴权入口的静态站点”，但距离完整动态管理台仍差 API Client、登录页、编辑器与发布链路。

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
- `blog-adapter`: 适配层（Web Controller、鉴权 Filter、上传接口）
- `blog-start`: 启动模块（聚合依赖，启动类）

### 3.1 领域模型现状（Article/Tag/Rely）

当前 `Article` 聚合已包含一期动态内容字段：

- `articleId`, `title`, `summary`, `url`, `date`, `lastmod`, `draft`, `count`
- `contentJson`, `draftJson`, `coverImageUrl`, `viewCount`
- 行为：`modify()`, `publish()`, `delete()`, `updateCount()`

对应的持久化对象 `ArticlePO` 与 Mapper 已补齐上述字段映射。

### 3.2 应用层与网关

- 应用服务接口：`sealpi-blog/blog-client/src/main/java/com/seal/blog/client/article/api/ArticleServiceI.java`
- 应用服务实现：`sealpi-blog/blog-app/src/main/java/com/seal/blog/app/service/ArticleServiceImpl.java`
  - 实现 create/update/delete/getSingleById/getPage

- Assembler：`sealpi-blog/blog-app/src/main/java/com/seal/blog/app/assembler/ArticleAssembler.java`
  - Cmd -> Entity / Entity -> VO / PageResponse 转换

- Gateway 实现：`sealpi-blog/blog-infra/src/main/java/com/seal/blog/infra/article/impl/ArticleGatewayImpl.java`
  - 基于 MyBatis-Plus 做 CRUD 与分页查询

### 3.3 适配层（Controller / Auth / Upload）

后端 adapter 层已不再是空壳，已补齐一期关键入口：

- 公共读接口：`sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/article/ArticleQueryController.java`
- 管理写接口：`sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/article/ArticleAdminController.java`
- 管理鉴权 Filter：`sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/security/AdminAuthFilter.java`
- JWT 校验器：`sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/security/AdminJwtVerifier.java`
- 鉴权配置：`sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/config/AdminAuthConfig.java`
- 上传接口：`sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/upload/AdminUploadController.java`

### 3.4 当前仍未完成的关键项

当前项目距离 v1 闭环，仍剩这些核心工作：

- 前端 `Bearer Token` 透传封装未完成，无法统一调用 `/api/v1/admin/**`
- 前端 `/admin/login` 页面未完成，当前仅有受保护入口页
- 前端后台文章列表、编辑页、草稿保存、发布 UI 未完成
- 前端 Excalidraw 编辑器与只读查看器未接入
- 前台文章详情页仍主要依赖本地 MDX + Contentlayer，未切换到后端 `contentJson`
- 预览图 `coverImageUrl` 尚未接入前台列表、详情页与 Open Graph 元信息
- 后端管理写接口的行为测试仍不完整，尤其缺少 403 与 previewImage 覆盖 `coverImageUrl` 的测试

## 4. 当前需求与演进方向（向动态全栈演进）

结合现状局限与目标需求，系统演进方向应明确为“动态博客系统”（Dynamic Blog System），而非纯静态站点：

- 前端：继续扩展 `/admin` 管理域（登录页、文章列表、编辑器、API Client）
- 后端：继续完善写接口行为测试，并与前端 Bearer Token 调用链打通
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

- 问题：前后端分离时，需要前端显式携带管理态凭证访问 Spring Boot API
- 方案：在 NextAuth 的 `jwt` 与 `session` 回调中暴露 `accessToken`
  - 前端调用后端管理 API 时，手动注入 `Authorization: Bearer <Token>`
  - 后端拦截 `/api/v1/admin/**` 校验 Token 并比对白名单 GitHub User ID

下一步详见设计文档：`docs/v1/design.md`。
