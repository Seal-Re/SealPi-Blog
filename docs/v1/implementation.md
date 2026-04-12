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

### 2.2 已解决的关键补全事项（v1.1 基线）

> 以下各项在 v1.1 迭代中已全部修复或实现，作为历史记录保留。

- ~~列表页与首页仍主要依赖本地 MDX / Contentlayer~~ **→ 已完成（B-3）**
  - `app/page.tsx`、`app/blog/page.tsx` 已全面切换到 `public-blog-api.ts` 驱动，Contentlayer 仅作静态文档备用。
- ~~详情页按 slug 的查询方式仍采用分页扫描~~ **→ 已完成（B-3）**
  - 后端已补 `GET /api/v1/articles/slug/{slug}` 接口，前端 `fetchArticleBySlug()` 直接调用，无漏查风险。
- ~~标签能力未真正动态化~~ **→ 已完成（B-4）**
  - `app/tags/page.tsx` 与 `app/tags/[tag]/` 均由后端文章聚合驱动，`tag-data.json` 已不再作为主数据源。
- ~~Excalidraw 图片资产外置链路尚未落实到编辑器~~ **→ 已完成（B-2）**
  - `AdminEditorClient` 提交前自动扫描内联图片（>200 KB），调用上传接口并回写 URL；提交前有内联大图保护检测。
- ~~首页 / 列表页的 `coverImageUrl` 展示尚未统一切换到动态文章源~~ **→ 已完成（B-3）**
  - 列表卡片与首页均消费后端返回的 `coverImageUrl`、`summary` 等真实字段。
- ~~后端行为测试仍不完备~~ **→ 部分收口（v1.1 T01/T04/T05）**
  - `ArticlePageQry.resolveDraft()` 状态映射反转 bug 已修复并补充单元测试（7 个用例）。
  - `403` 白名单测试在 `BlogAdapterApplicationTests` 中已存在。
  - 公开读接口契约测试与 `previewImage` 覆盖行为测试留待 v1.2。

### 2.3 当前完备性结论（v1.1 更新）

结论分级如下：

- 架构完备性：`高`
  - 前后端接口、鉴权、编辑、阅读、SEO 兜底的主干设计已完整落地，Flyway 数据库基线（V0→V1→V2）已就位。
- 功能完备性：`高`
  - 全部 P0 用户流程（浏览 → 登录 → 评论 / 管理员登录 → 草稿发布 → 前台展示）已闭环。
  - B-5 评论系统以 Giscus 形式实现（无自建后端），在 v1 范围内被接受。
- 发布完备性：`中等偏上`
  - 主要内容与管理链路具备生产就绪条件，阶段 C（运维监控）与前端测试框架留到 v1.2。

换言之，当前系统应被定义为：

- 已完成 v1 全部 P0 目标（A-1 ~ A-4 / B-1 ~ B-4 / B-5 评论以 Giscus 完成）
- Flyway 数据库基线与状态映射 bug 修复作为 v1.1 补丁已合并
- 尚未启动：阶段 C（系统监控）、前端测试框架（D-1 前端部分）、标签/浏览量/用户管理独立 API（P3 延后项）

## 3. v1.1 及后续剩余事项

### 3.1 延后至 v1.2 的功能（已记录，非 v1 范围）

以下功能在 v1.1 中评估为”可用但不完美”，明确延后至 v1.2：

- 标签独立 CRUD 后端 API（当前前端通过文章 API 聚合，功能可用）
- 浏览量递增接口（`viewCount` 字段已就位，端点待实现）
- 用户管理后台（`t_user` 已就位，管理页面待实现）
- 前端测试框架引入（Vitest / Playwright，D-1 前端部分）
- 阶段 C：Admin 信息架构拆分（C-1）与基础系统监控面板（C-2）
- 公开读接口完整契约测试（当前仅有管理端测试覆盖）
- `previewImage` 覆盖 `coverImageUrl` 的行为测试

### 3.2 后端：测试覆盖可继续加强

管理写 API 主体已经存在，以下测试可在 v1.2 补齐：

- `previewImage` 上传覆盖或回填 `coverImageUrl` 的行为测试
- 公开读接口分页/详情的端到端契约测试
- 标签聚合行为测试（当前依赖文章查询，无独立 tag gateway 测试）

## 4. 演进路线图（v1.2 方向）

基于 v1.1 基线，v1.2 建议优先推进：

1. 阶段 C：Admin 信息架构拆分（内容管理 vs 系统运维分区）
2. 基础系统监控面板（Spring Boot Actuator 封装 + 前端状态页）
3. 标签独立 API 与浏览量递增端点（小版本补丁）
4. 前端测试框架（Vitest 单元测试 + Playwright E2E smoke test）
5. 用户管理后台（`t_user` 已就位，管理 UI 可快速搭建）

详细规划见 [`docs/v1/evolution-baseline-v1.1.md`](evolution-baseline-v1.1.md) — P3 延后项。

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
