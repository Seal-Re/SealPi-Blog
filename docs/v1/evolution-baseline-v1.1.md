# SealPi-Blog v1.1 演进基线

> 基线日期：2026-04-13
> 本文档基于对全部代码与文档的审计，梳理 v1 当前实现状态、已知缺陷、未闭环事项，并定义 v1.1 阶段演进目标与 TODO 清单。

## 1. v1 实现状态总览

### 1.1 阶段完成度

| 阶段 | 子项 | 状态 | 备注 |
|------|------|------|------|
| A-1 统一登录入口与头像 | — | **DONE** | UserMenu、auth.ts、GitHub OAuth |
| A-2 角色字段规范化 | — | **DONE** | isAdmin 白名单（非 RBAC，v1 设计） |
| A-3 Admin 入口条件渲染 | — | **DONE** | 仅 admin 可见后台入口 |
| A-4 路由保护与错误页 | — | **DONE** | middleware.ts + /admin/forbidden |
| B-1 文章 CRUD 契约校准 | — | **DONE** | admin-api.ts + BFF 代理 + 后端 multipart |
| B-2 Excalidraw 图片外置 | — | **DONE** | 内联>200KB 自动上传，提交前清洗 |
| B-3 列表/首页/详情动态化 | — | **DONE** | public-blog-api.ts 驱动所有前台页面 |
| B-4 标签体系动态化 | — | **DONE** | 前端从文章 API 聚合标签，按标签过滤 |
| B-5 评论系统 | — | **部分完成** | Giscus 已集成，权限受 commentPermission 控制；无自建评论后端 |
| C-1 Admin 信息架构拆分 | — | **未开始** | |
| C-2 基础系统监控面板 | — | **未开始** | |
| D-1 自动化测试 | — | **进行中** | 后端部分测试；前端零测试 |
| D-2 部署与环境配置 | — | **大部分完成** | docker-compose、CI、start-local-test.ps1 |
| D-3 运行时监控与告警 | — | **未开始** | |
| D-4 文档与 README 同步 | — | **进行中** | CLAUDE.md 已创建，docs/v1/ 丰富 |

### 1.2 后端功能矩阵

| 功能 | Controller | Service | Gateway | Mapper | 端到端 |
|------|-----------|---------|---------|--------|--------|
| 文章创建（草稿/发布） | ✓ | ✓ | ✓ | ✓ | ✓ |
| 文章更新（草稿/发布） | ✓ | ✓ | ✓ | ✓ | ✓ |
| 文章删除（逻辑） | ✓ | ✓ | ✓ | ✓ | ✓ |
| 文章下线（发布→草稿） | ✓ | ✓ | ✓ | ✓ | ✓ |
| 文章查询（ID/Slug/分页） | ✓ | ✓ | ✓ | ✓ | ✓ |
| 分页筛选（关键词/标签/状态） | ✓ | ✓ | ✓ | ✓ | **有 BUG** |
| 文件上传（MinIO） | ✓ | ✓ | — | — | ✓ |
| 用户 OAuth 同步 | ✓ | ✓ | ✓ | ✓ | ✓ |
| Admin 鉴权（JWT+OAuth） | ✓ | — | — | — | ✓ |
| 内部同步鉴权 | ✓ | — | — | — | ✓ |
| 标签 CRUD | ✗ | ✗ | ✗ | ✓(mapper) | ✗ |
| 浏览量递增 | ✗ | ✗ | ✗ | — | ✗ |
| 用户管理 | ✗ | ✗ | ✗ | ✓(mapper) | ✗ |

### 1.3 前端功能矩阵

| 功能 | 页面 | 组件 | API 调用 | 状态 |
|------|------|------|---------|------|
| 首页（动态文章） | app/page.tsx | Main.tsx | public-blog-api | ✓ |
| 博客列表（分页） | app/blog/ | — | public-blog-api | ✓ |
| 文章详情（Excalidraw） | app/blog/[...slug]/ | ExcalidrawViewer | public-blog-api | ✓ |
| 标签列表 | app/tags/ | — | public-blog-api | ✓ |
| 按标签过滤 | app/tags/[tag]/ | — | public-blog-api | ✓ |
| Sitemap | app/sitemap.ts | — | public-blog-api | ✓ |
| SEO（OG/JSON-LD） | app/blog/[...slug]/ | — | — | ✓ |
| GitHub 登录 | app/login/ | — | auth.ts | ✓ |
| Admin 仪表盘 | app/admin/ | AdminShell | — | ✓ |
| Admin 文章列表 | app/admin/articles/ | AdminArticleRowActions | BFF proxy | ✓ |
| Admin 编辑器 | app/admin/editor/ | AdminEditorClient | BFF proxy | ✓ |
| 图片上传+URL回写 | — | AdminEditorClient | BFF proxy | ✓ |
| 自动保存草稿 | — | AdminEditorClient | BFF proxy | ✓ |
| 评论系统（Giscus） | — | Comments | Giscus | ✓ |

---

## 2. 已知缺陷（必须修复）

### 2.1 [CRITICAL] ArticlePageQry.resolveDraft() 状态映射反转

**位置**: `sealpi-blog/blog-client/src/main/java/com/seal/blog/client/article/dto/qry/ArticlePageQry.java:38-49`

**问题**: `ArticleStatus` 枚举定义 `DRAFT=0, PUBLISHED=1, ARCHIVED=2`。但 `resolveDraft()` 方法将 `status=draft` 映射为 `1`（即 PUBLISHED），将 `status=published` 映射为 `0`（即 DRAFT），语义完全反转。

**影响**: 前端按"草稿"筛选时实际返回已发布文章，按"已发布"筛选时实际返回草稿。该 BUG 直接影响 `/admin/articles` 的状态筛选功能。

**修复**: 交换映射值 — `draft → 0`, `published → 1`。

### 2.2 [HIGH] Flyway 依赖缺失

**位置**: `sealpi-blog/blog-infra/pom.xml`

**问题**: 项目在 `src/main/resources/db/migration/` 下存在 V1、V2 Flyway 迁移脚本，但 `pom.xml` 中未声明 `flyway-core` 和 `flyway-mysql` 依赖。Spring Boot 启动时不会执行这些迁移。

**影响**: 数据库 schema 变更依赖手动执行，新环境部署无法自动建表。

**修复**: 在 `blog-infra/pom.xml` 中添加 Flyway 依赖。

### 2.3 [MEDIUM] 缺少 V0 初始表迁移脚本

**问题**: 仅有 V1（ALTER t_article）和 V2（CREATE t_user）迁移，但 `t_article`、`t_tag`、`t_rely` 的初始建表脚本缺失。

**影响**: 全新环境首次启动时，V1 ALTER 会失败（表不存在）。

**修复**: 创建 V0 迁移脚本，包含 `t_article`、`t_tag`、`t_rely` 的 `CREATE TABLE IF NOT EXISTS`。

---

## 3. v1.1 演进目标

### 3.1 范围定义

v1.1 聚焦 **稳定化 + 缺陷修复 + 数据库基线建设**，不引入新的大型功能模块。

### 3.2 红线约束

- 不破坏现有已通过的 API 契约
- 不修改前端 BFF 代理路径结构
- 不引入新的外部服务依赖
- 所有变更必须通过 `./mvnw -q test`
- 前端变更必须通过 `npx next lint --fix`

---

## 4. v1.1 TODO 清单

> **v1.1 状态：全部完成** ✓ — 提交于 2026-04-13

### P0 — 必须修复（阻断性缺陷）

- [x] **T01** 修复 `ArticlePageQry.resolveDraft()` 状态映射反转 ✓
  - 文件: `sealpi-blog/blog-client/.../ArticlePageQry.java`
  - 动作: `draft→0`, `published→1`
  - 验证: 7 个单元测试全部通过

- [x] **T02** 添加 Flyway 依赖到 `blog-infra/pom.xml` ✓
  - 依赖: `flyway-core` + `flyway-mysql`
  - 验证: 构建通过，迁移脚本可自动执行

- [x] **T03** 创建 V0 初始表迁移脚本 ✓
  - 文件: `sealpi-blog/blog-infra/src/main/resources/db/migration/V0__init_schema.sql`
  - 内容: `t_article`, `t_tag`, `t_rely` 的 `CREATE TABLE IF NOT EXISTS`
  - 验证: 脚本已创建，全新数据库可从 V0 自动迁移

### P1 — 测试补齐（回归保障）

- [x] **T04** 补充后端状态筛选测试 ✓
  - 新建 `ArticlePageQryTest`（7 个测试用例）
  - 验证 `draft→0`, `published→1`, `all→null`, 大小写不敏感, keyword 逻辑

- [x] **T05** 补充后端 403 白名单测试 ✓
  - `BlogAdapterApplicationTests.adminApi_withValidSignatureButNonWhitelistedUser_returns403` 已存在

### P2 — 文档维护

- [x] **T06** 更新 `docs/v1/implementation-plan.md` 阶段状态标记 ✓
  - A 全系列 / B-1 / B-2 / B-3 / B-4: 【DONE】
  - B-5: 【部分完成：Giscus 已集成，无自建评论后端】
  - D-1: 【working】, D-2: 【大部分完成】, D-4: 【working】

- [x] **T07** 更新 `docs/v1/implementation.md` 补充 v1 闭环结论 ✓
  - 2.2 节已解决的项全部标注为完成
  - 2.3 节完备性结论已升级至"高"
  - 3/4 节更新为 v1.2 演进方向

- [x] **T08** 更新 `docs/v1/README.md` 索引 ✓
  - 增加 evolution-baseline-v1.1.md 入口
  - 文档分组整理（核心 / 演进规划 / 运维验收）

### P3 — 延后项（记录但不在 v1.1 实施）

- **标签 CRUD 后端 API**: 当前前端通过文章 API 聚合标签，可用但不完美；独立标签 API 留到 v1.2
- **浏览量递增**: viewCount 字段已就位，API 端点留到 v1.2
- **用户管理后台**: t_user 已就位，管理页面留到 v1.2
- **前端测试框架**: Vitest/Playwright 引入留到 v1.2
- **阶段 C（监控面板）**: 整体留到 v1.2+

---

## 5. 执行顺序

```
T01 (修复状态映射) → T04 (补测试验证修复) → T02 (Flyway依赖) → T03 (V0迁移) 
→ T05 (403测试) → T06/T07/T08 (文档更新)
```

先修缺陷、再补测试、再建基线、最后更新文档。每完成一组提交一次 commit。

---

## 6. 验收标准

v1.1 完成标志：

1. `/admin/articles?status=draft` 正确返回草稿文章
2. `/admin/articles?status=published` 正确返回已发布文章
3. `./mvnw -q test` 全部通过（含新增测试）
4. Flyway 迁移可在全新数据库上自动执行（V0→V1→V2）
5. 文档索引与阶段标记与代码实现一致

---

## 7. v1.2 演进目标（生产就绪基线）

> 基于 2026-04-13 生产就绪审计，v1.2 的核心目标是 **消除落地阻断项，建立实际可部署基线**。
> 完整审计见 [`docs/v1/production-readiness.md`](production-readiness.md)。

### P0 — 落地阻断修复（v1.2 必须完成）

- [x] **T09** 修复 `docker-compose.yml` MinIO 公开地址硬编码为 localhost ✓
  - 改为 `${MINIO_PUBLIC_BASE_URL:-http://localhost:13308}`
  - 补充 `.env.backend.example` 中 `MINIO_PUBLIC_BASE_URL` 变量

- [x] **T10** 修复 `next.config.js` `images.remotePatterns` 缺失实际使用域名 ✓
  - 添加 `avatars.githubusercontent.com`（GitHub 头像）
  - 添加 `minioHostname`（通过 `MINIO_PUBLIC_HOSTNAME` 环境变量注入）

- [x] **T11** 补全前端 `.env.example` 所有必要生产变量 ✓
  - 补充: `BLOG_API_BASE_URL`, `GITHUB_ID/SECRET`, `AUTH_SECRET`, `AUTH_URL`,
    `ADMIN_GITHUB_USERIDS`, `ADMIN_JWT_SECRET`, `BLOG_INTERNAL_SYNC_SECRET`, `MINIO_PUBLIC_HOSTNAME`
  - 每个变量附注说明和获取方式

- [ ] **T12** `siteMetadata.js` 填写真实站点信息
  - 文件: `tailwind-nextjs-starter-blog-sealpi/data/siteMetadata.js`
  - 需填写: `title`, `author`, `headerTitle`, `siteUrl`, `siteRepo`, `description`, 社交链接
  - **注意**: 此项需要用户提供真实站点信息，代码层无法自动完成

### P1 — 质量保障（v1.2 建议完成）

- [x] **T13** CI 增加前端构建检查 ✓
  - `.github/workflows/ci.yml` 新增 `frontend` job
  - Node.js 20 + `npm ci → next lint → next build`（含 CI 占位 env vars）
  - TypeScript 编译错误和 lint 问题现在会阻断 CI

- [x] **T14** `api-config.ts` / `admin-api.ts` fallback 地址加警告日志 ✓
  - `api-config.ts`: 未设置 `BLOG_API_BASE_URL` 时打印 `console.warn`
  - `admin-api.ts`: 未设置 `AUTH_URL` 时打印 `console.warn`
  - 生产环境不再静默回退到 127.0.0.1

### P2 — 架构决策（v1.2 确认方向）

- [ ] **T15** 明确前端部署方案并补充到文档
  - 选项 A: 在 `docker-compose.yml` 增加 `frontend` service（`next start`）
  - 选项 B: 文档记录"前端部署到 Vercel/PaaS"的配置步骤
  - 完成后更新 README 和部署文档

- [x] **T16** MinIO 桶 public-read 策略 ✓
  - `docker-compose.yml` `minio-init` 容器追加 `mc anonymous set public local/blog-assets`
  - 上传图片无需签名 URL 即可公开访问

### P3 — 功能演进（v1.2 可选，v1.3 兜底）

- [ ] **T17** 后端独立标签聚合 API（替代当前前端拉 100 篇聚合的方案）
- [ ] **T18** 浏览量递增端点（`viewCount` 字段已就位）
- [ ] **T19** 阶段 C-1/C-2：Admin 信息架构拆分 + 基础监控面板
- [ ] **T20** 前端测试框架（Vitest 单元 + Playwright E2E smoke）
