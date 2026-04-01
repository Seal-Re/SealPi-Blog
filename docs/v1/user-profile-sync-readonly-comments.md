# 用户体系、GitHub 同步策略与只读评论策略（设计记录）

本文档记录**当前已拍板**的产品与技术方向，并显式列出**设计缺点**与**尚未实现**项，便于评审与后续迭代对齐。

> 状态：**设计已确认，多数能力未落地**。实现进度以代码与 [`implementation.md`](implementation.md) 为准。

---

## 1. 已拍板方案摘要

### 1.1 前端：登录与 Admin 解耦（目标态）

- **全站登录**：任意 GitHub 用户可登录；登录目的不限于进入 Admin。
- **Admin**：独立授权层；`session.user.isAdmin` 仅表示后台权限，不阻断普通用户登录。
- **顶栏用户菜单**：根据 `session` 是否存在及 `isAdmin` 渲染；下拉采用**视觉分区**：
  - **上半区（功能区）**：白底 / Dark 深灰底——用户信息摘要、平台管理入口等。
  - **分割线**：`border-t`。
  - **下半区（危险区）**：背景略区分（如 `bg-gray-50` / `dark:bg-gray-900/50`）、退出等操作使用警示色（如 `text-red-600`），点击区域足够大。

### 1.2 后端：用户主数据与同步（MDM）

- **唯一键**：`github_id` 建立 **Unique Index**。
- **字段级同步**：使用 JSON 字段 `sync_policy` 管控各字段来源，例如  
  `{"nickname":"GITHUB","avatar":"MANUAL","bio":"GITHUB"}`。  
  取值语义建议：`GITHUB` = 随 OAuth 可覆盖；`MANUAL` = 以本地为准，OAuth 回调不覆盖。
- **OAuth 回调流**：
  - **首次登录**：INSERT，受控字段初始 `sync_policy` 为 `GITHUB`（或按字段默认值约定）。
  - **后续登录**：按 `sync_policy` 逐项比对；`GITHUB` 且远端与本地不一致则更新；`MANUAL` 则跳过。
- **用户自助修改**：`PUT /api/users/me` 更新字段值时，**必须**将对应键在 `sync_policy` 中置为 `MANUAL`。
- **一键恢复 GitHub 同步**：将指定字段（或全部受控字段）的 `sync_policy` 改回 `GITHUB` 并拉取 GitHub 最新值写回（需单独接口或同一接口的显式 action，避免误触）。

### 1.2.1 验人标注（Canonical identity）

- **主标注**：GitHub OAuth 返回的**数字 user id**（即 `profile.id`，落地为 `github_id`）作为系统内「此人是谁」的**唯一、稳定**标识。
- **适用范围**：本地用户绑定、评论作者归属、封禁/只读策略、Admin 白名单比对、审计日志中的「操作主体」等，**均以 `github_id` 为准**。
- **邮箱**：不参与「验人」决策，仅作下拉展示或弱提示（与下文「邮箱不可靠」一条对应：`不可靠` 是相对**强身份**而言，不是指字段随机错误）。

### 1.3 展示字段范围（与 sync_policy 管控对象对齐）

**导航下拉顶部（高密度身份确认）**

| 字段 | 来源/说明 |
|------|-----------|
| 昵称 (name) | GitHub `name`，本地可覆盖（MANUAL） |
| 用户名 (@handle) | GitHub `login`，建议只读、全局展示标识 |
| 邮箱 | GitHub；可能为 no-reply，下拉内灰字小字 |
| 身份标签 | 管理员徽章（如 Admin） |

**扩展资料（设置页 / 评论区名片）**

| 字段 | 说明 |
|------|------|
| Bio | GitHub `bio`，可本地编辑 |
| Website | GitHub `blog` |
| 社交主页 | 强制绑定 GitHub Profile URL |
| Member since | 首次授权登录时间 |
| 头像 | Avatar |

**系统元数据（主要不面向普通 UI）**

| 字段 | 说明 |
|------|------|
| github_id | 唯一绑定 |
| sync_policy | 同步策略 JSON |
| last_login | 每次 OAuth 成功更新 |
| is_banned / status | 封禁或状态枚举 |

### 1.4 只读策略（当前阶段）

- **定义**：用户可登录，顶栏/资料可展示**全字段**意图；**禁止发表评论**。
- **与 sync_policy 分离**：能否评论由独立权限字段表达（建议 `comment_permission`：`ALLOWED` | `READ_ONLY`，或等价布尔+扩展），**不要**用 `sync_policy` 兼职。
- **与封禁分离**：`is_banned` 为更强约束；只读用户未封禁仍可浏览与登录。
- **评论接口**：服务端校验 `comment_permission` 与封禁状态；只读返回明确错误码（如 `COMMENT_READ_ONLY`）。

### 1.5 「恢复 GitHub 同步」与评论权限

- 默认 **不** 因「恢复同步」自动开放评论；评论开放单独由 `comment_permission` 控制（除非产品另行规定）。

---

## 2. 设计缺点与风险（已知）

1. **GitHub 邮箱不可靠（相对验人而言）**：隐私或未公开时常为 no-reply，**不能**作为与「是谁」等价的强校验；**验人以 `github_id`（数字）为准**。若未来要「验证真实邮箱后才能评论」，需独立邮箱验证链路，与 GitHub 回调里的 `email` 解耦。
2. **JWT / Session 体积**：字段增多后 token 或 session 载荷变大，需控制下发字段或改用服务端 session + id 引用。
3. **sync_policy 与 JSON 演进**：新增业务字段时需同步迁移默认值与校验，否则易出现「策略缺键」行为未定义。
4. **字段级 MANUAL 粒度**：用户只改昵称时，若未正确写回 `sync_policy`，下次 OAuth 可能错误覆盖；**必须**在写接口层强制更新策略，单靠约定易漏。
5. **「恢复全量 GitHub 同步」**：若用户本地曾手动改过多字段，一键恢复可能造成**预期外数据丢失**；需二次确认 UI 与审计日志。
6. **handle 只读**：若 GitHub 用户改名（login 变更极少见但理论存在），与「永不可改」冲突时需产品决策（一般仍以 github_id 为准）。
7. **只读与运营**：全员 `READ_ONLY` 时评论区形同关闭，需清晰文案与后续「批量放开」的运营流程。
8. **前后端重复校验**：评论若仅前端隐藏输入框，仍须**后端强校验**，否则可被直接调 API 绕过。

---

## 3. 未实现项清单（截至文档编写时）

下列项在仓库中**多数尚未实现**或**仅部分实现**，实施时应对照代码逐项勾选。

### 3.1 前端

- [ ] `/login` 与 `/admin` 登录流完全解耦（含 middleware 跳转、`next` 回跳）。
- [ ] Header 用户下拉：上半区 / 分割线 / 下半区危险区视觉规范落地。
- [ ] 下拉内展示：昵称、@handle、邮箱灰字、Admin 徽章、头像。
- [ ] 独立「用户信息 / 设置」页：Bio、Website、GitHub 链接、Member since、一键恢复 GitHub 同步。
- [ ] 评论区：只读态下隐藏/禁用发表，统一文案与错误码处理。
- [ ] Session 类型与后端用户 DTO 对齐（`canComment` / `comment_permission` 等）。

### 3.2 后端（Java）

- [ ] `t_user`（或等价表）：`github_id` 唯一索引、业务字段、`sync_policy`、`last_login`、`comment_permission`、`is_banned` 等。
- [ ] OAuth 回调或等价「用户 upsert」应用服务：首次 INSERT / 后续按 `sync_policy` UPDATE。
- [ ] `PUT /api/users/me`：写字段 + 同步更新 `sync_policy` 为 MANUAL。
- [ ] 「恢复 GitHub 同步」接口（按字段或批量）。
- [ ] 评论写入接口：`comment_permission` 与封禁校验、错误码约定。
- [ ] （若评论走 GitHub JWT）与现有 Admin JWT 体系的边界说明与实现。

### 3.3 数据与运维

- [ ] 迁移脚本（DDL + 必要时数据回填）。
- [ ] 监控：`last_login` 统计、封禁用户审计。

### 3.4 文档与配置

- [ ] 环境变量清单更新（若引入新回调 URL、新 scope）。
- [ ] 与 [`管理写接口与鉴权.md`](../管理写接口与鉴权.md) 的权限模型区分说明（Admin API vs 用户 API）。

---

## 4. 与现有 v1 文档的关系

- 博客动态内容、Excalidraw、Admin 写接口等仍以 [`design.md`](design.md)、[`implementation.md`](implementation.md) 为主。
- 本文档**不替代**上述文档，仅补充「全站用户 + 同步策略 + 只读评论」这一横切能力的设计与缺口。

---

## 5. 修订记录

| 日期 | 说明 |
|------|------|
| 2026-03-25 | 初稿：汇总已确认方案、设计缺点、未实现清单 |
| 2026-03-25 | 落地（部分）：`t_user` 与 OAuth 同步接口、全站 `/login`、Admin 与登录解耦、顶栏头像菜单、`canComment` 与评论区只读提示；环境变量见下 |

### 5.1 环境变量（当前实现）

| 位置 | 变量 | 说明 |
|------|------|------|
| Next.js（服务端） | `BLOG_INTERNAL_SYNC_SECRET` | 与后端一致；调用 `POST /api/v1/internal/users/oauth-sync` 时放在请求头 `X-Blog-Internal-Sync-Secret`。未配置时跳过落库（仅开发可用）。 |
| Spring Boot | `blog.internal.sync.secret` | 与上相同；也可用环境变量 `BLOG_INTERNAL_SYNC_SECRET`（Spring Boot 宽松绑定）。 |
| Docker Compose `blog-start` | `BLOG_INTERNAL_SYNC_SECRET` | 已示例写入 `docker-compose.yml`，生产请替换。 |

**数据库**：在 MySQL 中执行 `sealpi-blog/blog-infra/src/main/resources/db/migration/V2__create_t_user.sql`（若未接入 Flyway 自动迁移）。

---

## 5.2 仍待实现（相对本文档 §1 目标态）

- `PUT /api/users/me`、一键恢复 GitHub 同步、独立「用户信息 / 设置」页。
- 后端对第三方评论（如 Giscus）无法硬禁言：只读策略为产品提示 + 未来自建评论 API 强校验。
- `BlogStartApplicationTests` 仍依赖本机 MinIO 配置等非空项，与本次改动无关；`blog-app` / `blog-adapter` 测试已通过。
