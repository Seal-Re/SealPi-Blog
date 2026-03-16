# 一期实现进度（v1）

本文档记录 `docs/v1/design.md` 中“一期目标（v1）”的当前落地进度、已修改的代码位置、以及本地验证方式。

## 1. 已完成

### 1.1 后端：文章数据模型字段扩展（t_article）

已在后端数据模型与代码映射层面补齐一期所需字段（不含 DB 真实 DDL 迁移脚本；仅完成代码结构与映射字段）。

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

## 2. 已完成（本次新增）

### 2.1 后端：公共读接口

已在 `blog-adapter` 增加对外查询接口，复用应用层服务：[`ArticleServiceI.getSingleById()`](../sealpi-blog/blog-client/src/main/java/com/seal/blog/client/article/api/ArticleServiceI.java:18)、[`ArticleServiceI.getPage()`](../sealpi-blog/blog-client/src/main/java/com/seal/blog/client/article/api/ArticleServiceI.java:19)。

- GET `/api/v1/articles/{id}`：文章详情（返回 `contentJson/coverImageUrl` 等字段）
  - Controller：[`ArticleQueryController.getById()`](../sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/article/ArticleQueryController.java:22)
- GET `/api/v1/articles`：文章列表（分页；不返回 `contentJson`，仅元信息 + `coverImageUrl/summary`）
  - Controller：[`ArticleQueryController.page()`](../sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/article/ArticleQueryController.java:30)

### 2.2 后端：管理端基础接口（占位）

已新增管理端 Controller（目前仅对 `create/update/delete` 做基础转发，后续会按设计补齐“保存草稿/发布/上传/鉴权”）：

- 管理端 Controller：[`ArticleAdminController`](../sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/article/ArticleAdminController.java:1)

### 2.3 工程与 CI 修复

- CI 修复：GitHub Actions 上执行 `./mvnw` 权限不足，已在工作流增加 `chmod +x ./mvnw`：[`ci.yml`](../.github/workflows/ci.yml:21)
- Lombok 升级：修复本机高版本 JDK 下编译器初始化异常，将 `blog-app` 的 Lombok 升级至 1.18.36：[`blog-app/pom.xml`](../sealpi-blog/blog-app/pom.xml:15)
- 测试修复：修正 Converter 单测构造数据，保证 `mvnw.cmd test` 通过：[`ArticleInfraConverterTest.toPo_should_map_v1_fields()`](../sealpi-blog/blog-infra/src/test/java/com/seal/blog/infra/article/converter/ArticleInfraConverterTest.java:50)

## 3. 未完成（下一步）

### 3.1 后端：管理写 API + 鉴权

- POST `/api/v1/admin/articles?action=draft|publish&coverImageUrl=...`：新建文章（保存草稿/发布）
  - Controller：[`ArticleAdminController.adminCreate()`](../sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/article/ArticleAdminController.java:41)
  - DTO：[`ArticleDraftSaveCmd`](../sealpi-blog/blog-client/src/main/java/com/seal/blog/client/article/dto/cmd/ArticleDraftSaveCmd.java:13)
- PUT `/api/v1/admin/articles/{id}?action=draft|publish&coverImageUrl=...`：更新文章（保存草稿/重新发布）
  - Controller：[`ArticleAdminController.adminUpdate()`](../sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/article/ArticleAdminController.java:54)
  - DTO：[`ArticleDraftUpdateCmd`](../sealpi-blog/blog-client/src/main/java/com/seal/blog/client/article/dto/cmd/ArticleDraftUpdateCmd.java:11)
- `/api/v1/admin/**` 鉴权拦截（Bearer Token + GitHub UserId 白名单；HS256 JWT 离线验签）
  - Filter：[`AdminAuthFilter`](../sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/security/AdminAuthFilter.java:18)
  - 配置：[`AdminAuthConfig`](../sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/config/AdminAuthConfig.java:11)
  - 校验器：[`AdminJwtVerifier.verifyAuthorizationHeader()`](../sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/security/AdminJwtVerifier.java:34)

仍未完成：

- POST `/api/v1/admin/upload`：图片资产上传（OSS/本地盘/MinIO）
- 管理写 API 的 multipart 形态：`draftJson + previewImage`（当前 `coverImageUrl` 仍是 query 方式传入）

## 4. 本地验证

本机 JDK 为 23/24 时，可能触发注解处理相关编译器异常（例如 `TypeTag :: UNKNOWN`）。目前已通过升级 Lombok 规避该问题：[`blog-app/pom.xml`](../sealpi-blog/blog-app/pom.xml:15)。

在仓库根目录执行：

```bat
cd sealpi-blog
mvnw.cmd -q test
```
