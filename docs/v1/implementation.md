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

## 2. 未完成（下一步）

### 2.1 后端：公共读 API

- GET `/api/v1/articles/{id}`：返回 `contentJson/coverImageUrl` 等字段
- GET `/api/v1/articles`：分页列表（不返回 `contentJson`，仅元信息 + `coverImageUrl/summary`）

### 2.2 后端：管理写 API + 鉴权

- POST/PUT `/api/v1/admin/articles`：草稿保存与发布
- POST `/api/v1/admin/upload`：图片资产上传（OSS/本地盘/MinIO）
- `/api/v1/admin/**` 鉴权拦截（Bearer Token + GitHub UserId 白名单）

## 3. 本地验证

由于当前本机 JDK 为 23，构建时可能触发编译器初始化异常（与注解处理/MapStruct/Lombok 组合相关）。本次变更使用禁用注解处理的方式完成快速编译验证。

在仓库根目录执行：

```bat
cd sealpi-blog
mvnw.cmd -DskipTests -DcompilerArgument=-proc:none compile
```

说明：上述命令用于验证本次字段扩展相关代码可以通过编译链路；后续若要运行应用或生成 MapStruct 映射，需要在项目中明确 Java 版本策略（例如切换到 LTS JDK 17/21 或升级相关插件）。
