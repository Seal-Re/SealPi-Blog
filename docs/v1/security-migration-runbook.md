# 配置安全迁移回归与回滚手册

本文档用于本次“配置安全迁移与收口”后的联调验证与故障回滚。

## 一、回归检查清单

### 1) 鉴权与权限
- 未登录访问 `/admin`，应跳转登录页。
- 登录非管理员账号后访问写接口，应返回 `403`。
- 登录管理员账号后：
  - `GET /api/admin/auth/check` 返回 `200`。
  - 保存草稿、发布文章、上传图片链路成功。

### 2) 会话一致性
- 登录后刷新页面，`/admin` 权限状态保持一致。
- 退出登录后再次访问 `/admin` 被拦截。

### 3) 配置审计
- 前端 `tailwind-nextjs-starter-blog-sealpi/.env.local` 不包含高敏感字段：
  - `AUTH_SECRET`
  - `GITHUB_SECRET`
  - `BLOG_INTERNAL_SYNC_SECRET`
  - `ADMIN_*`
- 仓库中不出现真实密钥，仅允许 `.env.backend.example` 占位值。

### 4) 本地启动
- `start-local-test.ps1` 可在缺失 `.env.backend.local` 时自动从示例文件创建。
- 首次启动会提示录入必须密钥；补齐后可正常启动前后端与基础设施。

## 二、故障定位优先顺序

1. 检查 `.env.backend.local` 是否缺项或留有 `change-me-*` 占位值。
2. 检查后端 `ADMIN_GITHUB_USERIDS` 是否包含当前 GitHub `id`。
3. 检查 GitHub OAuth token 是否可用（重新登录获取新 token）。
4. 检查 MinIO/MySQL 凭据与容器环境变量是否一致。

## 三、回滚策略

### 快速回滚（优先）
1. 将前端管理写请求临时恢复为旧后端直连路径（仅限紧急恢复）。
2. 将后端 `ADMIN_AUTH_ALLOW_LEGACY_JWT=true` 以临时兼容旧 token（短期使用）。
3. 业务恢复后立即回到新链路并关闭 legacy 开关。

### 配置回滚
1. 保留最近一次可用的 `.env.backend.local` 备份。
2. 回滚仅限配置，不回滚数据库结构。
3. 回滚完成后执行本手册“回归检查清单”第 1、2 项。

## 四、上线前建议
- 在 CI 上增加“敏感配置扫描”阻断规则（禁止真实密钥入库）。
- 将 `.env.backend.local` 纳入安全分发流程，不通过代码仓库传递。
- 为管理员鉴权链路增加集成测试（管理员/非管理员/无 token 三类）。

## 五、全链路约束与已知边界（跟踪清单）

### 5.1 请求路径与职责
- **浏览器 → Next 同域** `POST/GET /api/admin/**`：BFF 层，必须已登录且 `session.user.isAdmin === true`，再从 **加密 JWT**（`getToken`）读取 `githubAccessToken` 代理到 Java。
- **浏览器 → Java 直连** `GET /api/v1/articles*`：公开读，仍可用 `NEXT_PUBLIC_BLOG_API_BASE_URL`；服务端渲染同样走 `buildApiUrl`。
- **Next 服务端（jwt 回调）→ Java** `GET /api/v1/admin/auth/check`：用于计算 `isAdmin`，仅在服务端执行。

### 5.2 已收敛的缺口（实现层）
- BFF 未校验管理员：已改为 **未登录 401 / 非管理员 403** 后再代理。
- GitHub token 暴露给客户端 session：已移除 `session.accessToken`，token 仅存在于 **JWT**，由 `lib/server-github-token.ts` 在 Route Handler 内读取。

### 5.3 仍有意识保留的边界
- **`/api/admin` 未进 middleware**：依赖各 Route 内 `requireAdminBffContext`；若新增管理 BFF 路由，须复用同一工具函数，避免漏检。
- **CSRF**：同站 Cookie + 管理操作走 cookie 会话时，建议生产环境使用 **SameSite=Lax/Strict** 与可信来源校验；高危写操作可再叠加 CSRF token（当前未实现）。
- **`isAdmin` 与 token 过期**：`isAdmin` 在 JWT 刷新周期内可能仍为 true，而 GitHub token 已失效；表现为 BFF 返回 401，用户需 **重新登录**。
- **内部同步密钥**：`BLOG_INTERNAL_SYNC_SECRET` 必须由服务端持有；若为空则同步跳过（仅适合本地），生产必须配置并与 Java `blog.internal.sync.secret` 一致。

### 5.4 配置一致性检查
- Java 管理员白名单：`ADMIN_GITHUB_USERIDS`（环境变量）→ `admin.github.userIds`。
- Docker Compose 与本地脚本：均应从 **同一** `.env.backend.local` 注入，避免 MySQL/MinIO 口令与 Spring 不一致。
