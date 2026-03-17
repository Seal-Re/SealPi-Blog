# 一期实现进度（v1）

本文档记录 [`docs/v1/design.md`](docs/v1/design.md:1) 中“一期目标（v1）”的当前落地进度、已修改的代码位置、系统完备性检查结论，以及本地验证方式。

## 1. 已完成

### 1.1 后端：文章数据模型字段扩展（t_article）

已在后端数据模型与代码映射层面补齐一期所需字段。

新增字段（面向一期 Excalidraw JSON + SEO 预览图能力）：

- `contentJson`：已发布内容（Excalidraw JSON 字符串）
- `draftJson`：草稿内容（Excalidraw JSON 字符串）
- `coverImageUrl`：静态预览图 URL（用于列表兜底与 Open Graph）
- `viewCount`：阅读量（一期显式字段）

涉及代码：

- 领域模型：[`Article`](../sealpi-blog/blog-domain/src/main/java/com/seal/blog/domain/article/model/Article.java:8)
- 领域重建：[`Article.reconstruct()`](../sealpi-blog/blog-domain/src/main/java/com/seal/blog/domain/article/model/Article.java:62)
- 持久化对象：[`ArticlePO`](../sealpi-blog/blog-infra/src/main/java/com/seal/blog/infra/article/po/ArticlePO.java:21)
- Infra 转换：[`ArticleInfraConverter.toPO()`](../sealpi-blog/blog-infra/src/main/java/com/seal/blog/infra/article/converter/ArticleInfraConverter.java:11)
- Client VO：[`ArticleVO`](../sealpi-blog/blog-client/src/main/java/com/seal/blog/client/article/dto/vo/ArticleVO.java:9)

### 1.2 后端：公共读接口

已在 `blog-adapter` 增加对外查询接口，复用应用层服务：[`ArticleServiceI.getSingleById()`](../sealpi-blog/blog-client/src/main/java/com/seal/blog/client/article/api/ArticleServiceI.java:18)、[`ArticleServiceI.getPage()`](../sealpi-blog/blog-client/src/main/java/com/seal/blog/client/article/api/ArticleServiceI.java:19)。

- GET `/api/v1/articles/{id}`：文章详情（返回 `contentJson/coverImageUrl` 等字段）
  - Controller：[`ArticleQueryController.getById()`](../sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/article/ArticleQueryController.java:23)
- GET `/api/v1/articles`：文章列表（分页；不返回 `contentJson`，仅元信息 + `coverImageUrl/summary`）
  - Controller：[`ArticleQueryController.page()`](../sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/article/ArticleQueryController.java:30)

### 1.3 后端：管理端基础接口与鉴权链路

已新增并补齐管理端 Controller、上传接口、Bearer Token 保护与离线 JWT 校验：

- 管理端 Controller：[`ArticleAdminController`](../sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/article/ArticleAdminController.java:26)
- 上传接口：[`AdminUploadController`](../sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/upload/AdminUploadController.java:1)
- 鉴权 Filter：[`AdminAuthFilter`](../sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/security/AdminAuthFilter.java:18)
- 鉴权配置：[`AdminAuthConfig`](../sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/config/AdminAuthConfig.java:11)
- JWT 校验器：[`AdminJwtVerifier.verifyAuthorizationHeader()`](../sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/security/AdminJwtVerifier.java:34)

### 1.4 前端：后台登录、管理入口与文章管理链路

前端已从纯静态博客升级为具备最小后台闭环的站点：

- NextAuth + GitHub OAuth2：[`auth.ts`](../tailwind-nextjs-starter-blog-sealpi/auth.ts:1)
- `/admin` 路由保护：[`middleware.ts`](../tailwind-nextjs-starter-blog-sealpi/middleware.ts:1)
- Session 类型扩展：[`next-auth.d.ts`](../tailwind-nextjs-starter-blog-sealpi/types/next-auth.d.ts:1)
- 后台入口页：[`page.tsx`](../tailwind-nextjs-starter-blog-sealpi/app/admin/page.tsx:49)
- 后台登录页：[`page.tsx`](../tailwind-nextjs-starter-blog-sealpi/app/admin/login/page.tsx:59)
- 管理端 Bearer Token 请求封装：[`adminFetch()`](../tailwind-nextjs-starter-blog-sealpi/lib/admin-api.ts:46)
- 后台文章列表页：[`page.tsx`](../tailwind-nextjs-starter-blog-sealpi/app/admin/articles/page.tsx:110)
- 后台编辑入口页：[`page.tsx`](../tailwind-nextjs-starter-blog-sealpi/app/admin/editor/page.tsx:34)
- 文章写入接口封装：[`createAdminArticle()`](../tailwind-nextjs-starter-blog-sealpi/lib/admin-api.ts:108)、[`updateAdminArticle()`](../tailwind-nextjs-starter-blog-sealpi/lib/admin-api.ts:118)

### 1.5 前端：Excalidraw 编辑器已接入管理台

后台编辑页已从占位态升级为真实可用的在线创作页：

- 编辑器主组件：[`AdminEditorClient()`](../tailwind-nextjs-starter-blog-sealpi/components/admin/AdminEditorClient.tsx:69)
- 编辑页数据加载：[`fetchArticleDetail()`](../tailwind-nextjs-starter-blog-sealpi/app/admin/editor/page.tsx:15)
- 草稿/发布表单构建：[`buildPayload()`](../tailwind-nextjs-starter-blog-sealpi/components/admin/AdminEditorClient.tsx:150)
- 提交流程：[`handleSubmit()`](../tailwind-nextjs-starter-blog-sealpi/components/admin/AdminEditorClient.tsx:195)
- 画布变更防抖序列化：[`handleSceneChange()`](../tailwind-nextjs-starter-blog-sealpi/components/admin/AdminEditorClient.tsx:130)

当前已具备：

- 加载 `draftJson/contentJson` 回显场景
- 录入标题、slug、摘要、封面图地址
- 导出预览图并随 multipart 请求提交
- 保存草稿 / 直接发布双动作
- 基础输入清洗、空画布校验、状态反馈与错误提示

### 1.6 前端：Excalidraw Viewer 与详情页动态渲染已接入

前台文章详情页已不再依赖本地 MDX 正文，而是开始消费后端动态内容：

- 只读 Viewer：[`ExcalidrawViewer()`](../tailwind-nextjs-starter-blog-sealpi/components/ExcalidrawViewer.tsx:34)
- 动态详情页：[`Page()`](../tailwind-nextjs-starter-blog-sealpi/app/blog/[...slug]/page.tsx:131)
- 详情布局：[`DynamicPostLayout()`](../tailwind-nextjs-starter-blog-sealpi/layouts/DynamicPostLayout.tsx:41)
- 动态 Metadata：[`generateMetadata()`](../tailwind-nextjs-starter-blog-sealpi/app/blog/[...slug]/page.tsx:85)
- Slug 定位查询：[`fetchArticleBySlug()`](../tailwind-nextjs-starter-blog-sealpi/app/blog/[...slug]/page.tsx:21)

当前已具备：

- 前台详情按 `slug=url` 查询后端文章
- 详情页只读渲染 `contentJson/draftJson`
- 动态输出 `Open Graph` / `Twitter Card` / JSON-LD
- 动态封面图、上一篇/下一篇、评论区与返回博客入口

## 2. 系统完备性检查

### 2.1 已形成闭环的核心能力

对照 [`docs/v1/design.md`](docs/v1/design.md:1) 的 v1 范围，当前系统已经形成以下可运行闭环：

1. 管理员登录与后台访问控制闭环
   - GitHub OAuth 登录 -> Session 注入 -> `/admin` 路由保护 -> 管理接口 Bearer Token 调用 已贯通。
2. 文章创作与发布闭环
   - 后台编辑器 -> 草稿 JSON 序列化 -> 预览图导出 -> 管理写接口保存/发布 已贯通。
3. 前台详情动态展示闭环
   - 公共列表接口 -> 详情接口 -> `contentJson` 只读渲染 -> metadata 输出 已基本贯通。
4. 基础 SEO 兜底闭环
   - `coverImageUrl` 已在详情页 metadata 中消费，具备社交分享兜底能力。

### 2.2 当前仍不完备的关键点

以下问题说明系统已从“方案验证期”进入“可用但未完备”阶段，而非完全收口：

- 列表页与首页仍主要依赖本地 MDX / Contentlayer
  - [`page.tsx`](../tailwind-nextjs-starter-blog-sealpi/app/page.tsx:5)
  - [`BlogPage()`](../tailwind-nextjs-starter-blog-sealpi/app/blog/page.tsx:10)
  - 影响：`P0-4/P0-5` 还未真正完成，前台“列表来源统一动态化”尚未收口。
- 详情页按 slug 的查询方式仍采用“先拉分页列表，再按 url 匹配，再拉详情”
  - [`fetchArticleBySlug()`](../tailwind-nextjs-starter-blog-sealpi/app/blog/[...slug]/page.tsx:21)
  - 影响：当文章数量超过单页上限时存在漏查风险，也会引入额外一次列表请求；从完备性看，后端更适合补一个按 slug/url 查询的公开接口。
- 标签能力未真正动态化
  - 当前详情页标签仍是临时占位值：[`Page()`](../tailwind-nextjs-starter-blog-sealpi/app/blog/[...slug]/page.tsx:171)
  - 影响：文章 taxonomy 尚未与后端返回结构打通。
- Excalidraw 图片资产外置链路尚未落实到编辑器
  - 设计要求见 [`docs/v1/design.md`](docs/v1/design.md:178)
  - 当前 [`AdminEditorClient()`](../tailwind-nextjs-starter-blog-sealpi/components/admin/AdminEditorClient.tsx:69) 已完成 JSON 保存与预览导出，但尚未看到对“粘贴/拖拽图片 -> 上传接口 -> URL 回写场景”的实现。
  - 影响：若作者粘贴图片，仍有 JSON 膨胀与资产治理风险。
- 首页 / 列表页的 `coverImageUrl` 展示尚未统一切换到动态文章源
  - 影响：SEO、分享图和用户浏览入口之间还未完全一致。
- 后端行为测试仍不完备
  - 文档要求中的 `403`、`previewImage` 覆盖行为等仍未补齐。
  - 影响：管理写链路已有实现，但回归保障不足。

### 2.3 当前完备性结论

结论分级如下：

- 架构完备性：`较高`
  - 前后端接口、鉴权、编辑、阅读、SEO 兜底的主干设计已落到真实代码。
- 功能完备性：`中等偏上`
  - “管理创作 + 前台详情展示”主链路已经成立，但“动态列表统一化、图片资产治理、标签体系、测试补齐”仍未完成。
- 发布完备性：`中等`
  - 已具备继续联调与灰度验证条件，但还不建议定义为“v1 全量完成”。

换言之，当前系统更准确的状态应表述为：

- 已完成 `P0-1 ~ P0-3`
- 正在推进 `P0-4 / P0-5`
- 距离“文档设计目标完全收口”还差列表动态化、封面统一消费、图片上传外置、后端关键测试四类事项

## 3. 未完成（当前剩余）

### 3.1 前端：P0-4 / P0-5 尚未完全闭环

仍需继续完成：

- 首页与博客列表从本地 MDX/Contentlayer 切换到后端动态文章源
- 列表卡片接入 `coverImageUrl`、摘要、浏览量等真实数据
- 详情页标签与列表导航改为消费真实后端字段，而不是临时占位值
- 如有必要，后端补按 `slug/url` 直接查询文章详情接口，替代当前分页扫描
- 统一 `generateStaticParams()` 与动态文章源策略，避免静态参数与真实数据源脱节

### 3.2 前端：Excalidraw 资产治理仍需补齐

仍需继续完成：

- 图片粘贴/拖拽/上传拦截
- 调用管理上传接口并回写资源 URL
- 避免 Base64 图片继续内嵌到 JSON
- 必要时补编辑器恢复渲染所需的 `fileId -> url` 映射策略

### 3.3 后端：测试与契约保障不足

管理写 API 主体已经存在，但仍建议补齐以下测试：

- `/api/v1/admin/**` 的 `403` 行为测试
- `previewImage` 覆盖或回填 `coverImageUrl` 的行为测试
- 公开读接口分页/详情的契约测试
- 如果新增按 `slug` 查询接口，需要同步补接口测试与 DTO 文档

## 4. 当前推荐下一步

推荐按以下顺序继续推进：

1. 先完成首页与博客列表动态化，统一前台内容源
2. 完成列表页 `coverImageUrl` 与真实摘要接入，收口 `P0-4/P0-5`
3. 在后端补“按 slug/url 查询详情”接口，替代前端分页扫描查找
4. 补 Excalidraw 图片上传外置链路，解决 JSON 膨胀与资产治理问题
5. 最后补齐后端 `403` / `previewImage` 等关键测试并做一次完整联调

## 5. 本地验证

### 5.1 前端

已执行：

```bat
cd tailwind-nextjs-starter-blog-sealpi
npm run lint -- --dir app/blog --dir components --dir layouts
```

结果：

- `No ESLint warnings or errors`

后续建议继续执行：

```bat
cd tailwind-nextjs-starter-blog-sealpi
npm run build
```

### 5.2 后端

在仓库根目录执行：

```bat
cd sealpi-blog
mvnw.cmd -q test
```

如果本机 JDK 为 23/24，需继续关注 Lombok 与注解处理链的兼容性；当前已通过 [`pom.xml`](../sealpi-blog/blog-app/pom.xml:15) 做过相关规避。
