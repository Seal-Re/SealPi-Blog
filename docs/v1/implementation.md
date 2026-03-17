# 一期实现进度（v1）

本文档记录 `docs/v1/design.md` 中“一期目标（v1）”的当前落地进度、已修改的代码位置、以及本地验证方式。

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
  - Controller：[`ArticleQueryController.getById()`](../sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/article/ArticleQueryController.java:22)
- GET `/api/v1/articles`：文章列表（分页；不返回 `contentJson`，仅元信息 + `coverImageUrl/summary`）
  - Controller：[`ArticleQueryController.page()`](../sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/article/ArticleQueryController.java:30)

### 1.3 后端：管理端基础接口与鉴权链路

已新增并补齐管理端 Controller、上传接口、Bearer Token 保护与离线 JWT 校验：

- 管理端 Controller：[`ArticleAdminController`](../sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/article/ArticleAdminController.java:1)
- 上传接口：[`AdminUploadController`](../sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/upload/AdminUploadController.java:1)
- 鉴权 Filter：[`AdminAuthFilter`](../sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/security/AdminAuthFilter.java:18)
- 鉴权配置：[`AdminAuthConfig`](../sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/config/AdminAuthConfig.java:11)
- JWT 校验器：[`AdminJwtVerifier.verifyAuthorizationHeader()`](../sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/security/AdminJwtVerifier.java:34)

### 1.4 前端：P0 后台鉴权入口

前端 P0 已从纯静态博客升级为具备最小可用后台入口的站点：

- NextAuth + GitHub OAuth2：[`auth.ts`](../tailwind-nextjs-starter-blog-sealpi/auth.ts:1)
- `/admin` 路由保护：[`middleware.ts`](../tailwind-nextjs-starter-blog-sealpi/middleware.ts:1)
- Session 类型扩展：[`next-auth.d.ts`](../tailwind-nextjs-starter-blog-sealpi/types/next-auth.d.ts:1)
- 后台入口页：[`app/admin/page.tsx`](../tailwind-nextjs-starter-blog-sealpi/app/admin/page.tsx:1)
- 模块解析与构建修复：[`tsconfig.json`](../tailwind-nextjs-starter-blog-sealpi/tsconfig.json:1)、[`jsconfig.json`](../tailwind-nextjs-starter-blog-sealpi/jsconfig.json:1)、[`eslint.config.mjs`](../tailwind-nextjs-starter-blog-sealpi/eslint.config.mjs:1)

## 2. 未完成（当前剩余）

### 2.1 前端：管理台主链路仍未闭环

仍未完成：

- `Bearer Token` 透传封装，尚未统一封装对 `/api/v1/admin/**` 的请求客户端
- `/admin/login` 登录页与未授权提示页
- 后台文章列表页、编辑页、新建页
- Excalidraw 编辑器接入（图片上传、草稿防抖保存、发布导出预览图）
- Excalidraw Viewer 接入前台详情页
- 前台列表/详情页接入 `coverImageUrl` 与 Open Graph 元信息
- 从本地 MDX + Contentlayer 向后端动态文章内容切换

### 2.2 后端：测试与行为补齐

管理写 API 主体已经存在，但仍未完成以下测试补齐：

- 写接口的 MockMvc 行为测试目前仅覆盖 401，未覆盖 403
- 未覆盖 previewImage 覆盖 `coverImageUrl` 的行为
- 前后端联调用的示例请求链路和契约文档还未固化

## 3. 当前推荐下一步

推荐按以下顺序继续推进：

1. 前端先完成 `Bearer Token` API Client 封装，打通对 Spring Boot 管理接口的调用能力
2. 补 `/admin/login` 页面与无权限状态页，完善登录跳转闭环
3. 落后台文章列表页与编辑入口
4. 接入 Excalidraw Editor / Viewer
5. 回填列表封面、详情页动态渲染与 Open Graph
6. 最后补齐后端管理写接口的 403 / previewImage 行为测试

## 4. 本地验证

### 4.1 前端

在前端目录执行：

```bat
cd tailwind-nextjs-starter-blog-sealpi
npm run build
```

当前验证结果：构建已通过，`/admin` 路由已出现在 Next.js 构建产物中。

### 4.2 后端

本机 JDK 为 23/24 时，可能触发注解处理相关编译器异常（例如 `TypeTag :: UNKNOWN`）。目前已通过升级 Lombok 规避该问题：[`blog-app/pom.xml`](../sealpi-blog/blog-app/pom.xml:15)。

在仓库根目录执行：

```bat
cd sealpi-blog
mvnw.cmd -q test
```
