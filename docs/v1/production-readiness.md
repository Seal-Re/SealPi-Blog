# SealPi-Blog 生产就绪审计

> 审计日期：2026-04-13  
> 最近更新：2026-04-13（T09-T14/T16 已完成）  
> 当前阶段：v1.2 **全部 P0/P1 已完成**，仅剩 T15（前端部署方案架构决策）

---

## 审计结论

当前项目处于 **"配置基本收口，等待站点信息确认"** 阶段：原 4 项 P0 阻断中的 3 项（T09/T10/T11）已修复，P1/P2 中可自动执行的项（T13/T14/T16）也已完成。

全部 P0 阻断项（T09-T12）和 P1 质量保障项（T13-T14/T16）已完成。当前唯一未决项是 **T15 — 前端部署方案**（架构决策，不阻断功能开发）。

---

## P0 — 阻断落地（必须在正式部署前修复）

### P0-1 `siteMetadata.js` 全部为模板占位值【✅ 已修复 T12】

**修复**: 已更新为真实站点信息：
- `title` / `headerTitle`: `'Sealの小屋'`
- `author`: `'Seal'`
- `siteUrl`: `'https://sealpi.cn'`
- `siteRepo`: `'https://github.com/Seal-Re/SealPi-Blog'`
- `description`: `'Seal 的个人博客，记录技术探索与日常思考。'`
- `language` / `locale`: `'zh-CN'`
- 无用社交链接全部清空（不展示空链接给用户）

---

### P0-2 `docker-compose.yml` — MinIO 公开访问地址硬编码为 localhost【✅ 已修复 T09】

**修复**: 改为 `${MINIO_PUBLIC_BASE_URL:-http://localhost:13308}`，`.env.backend.example` 补充该变量及说明。生产部署时设置 `MINIO_PUBLIC_BASE_URL` 为真实公开地址即可。

---

### P0-3 `next.config.js` — `images.remotePatterns` 未包含实际使用的图片域名【✅ 已修复 T10】

**修复**: 新增 `avatars.githubusercontent.com`（GitHub 头像固定域名）和 `${MINIO_PUBLIC_HOSTNAME}`（通过环境变量注入，http/https 双协议），生产部署时设置 `MINIO_PUBLIC_HOSTNAME` 为 MinIO 主机名即可。

---

### P0-4 前端 `.env.example` 缺失大量必要的生产环境变量【✅ 已修复 T11】

**修复**: 前端 `.env.example` 已补全所有 9 个必要变量（`GITHUB_ID/SECRET`, `AUTH_SECRET`, `AUTH_URL`, `BLOG_API_BASE_URL`, `ADMIN_JWT_SECRET`, `ADMIN_GITHUB_USERIDS`, `BLOG_INTERNAL_SYNC_SECRET`, `MINIO_PUBLIC_HOSTNAME`），每项附获取方式说明。`.env.backend.example` 同步补充 `MINIO_PUBLIC_BASE_URL` 及完整注释。

---

## P1 — 影响质量保障（建议在 v1.2 前修复）

### P1-1 CI 无前端构建检查【✅ 已修复 T13】

**修复**: `.github/workflows/ci.yml` 新增 `frontend` job，在 Node.js 20 上执行 `npm ci → next lint → next build`，使用 CI 安全占位 env vars。TypeScript 编译错误和构建失败现在会被 CI 捕获并阻断合并。

---

### P1-2 `admin-api.ts` / `api-config.ts` 硬编码 fallback 地址【✅ 已修复 T14】

**修复**: 两处 fallback 均已添加 `console.warn`——当 `BLOG_API_BASE_URL` / `AUTH_URL` 未配置时，服务端启动日志会打印明确警告，不再静默回退。

---

## P2 — 架构待决策（v1.2 确认，不阻断 v1 落地）

### P2-1 前端无容器化部署方案

**现状**: `docker-compose.yml` 仅包含 MySQL、MinIO、Java 后端三个服务，没有 Next.js 前端的容器定义。前端的部署方式未在项目中定义（Vercel? PM2? Docker?）。

**影响**: 完整的"一键部署"还不可行；前端需要单独配置部署流水线。

**建议方向** (择一):
1. 在 `docker-compose.yml` 中增加 `frontend` service（`next build` + `next start`）
2. 明确记录"前端部署到 Vercel"或其他 PaaS 方案，并在 README 说明

---

### P2-2 标签聚合受 100 篇上限约束

**文件**: `tailwind-nextjs-starter-blog-sealpi/lib/public-blog-api.ts:7`

```ts
export const PUBLIC_ARTICLE_PRELOAD_SIZE = 100
```

`fetchPublishedTags()` 通过预拉 100 篇文章聚合标签。文章超过 100 篇时，超出部分的标签将从标签页消失。

**现阶段风险**: 低（内容量小）。**v1.2 建议**: 后端补独立标签聚合接口。

---

### P2-3 MinIO 桶访问策略【✅ 已修复 T16】

**修复**: `docker-compose.yml` 的 `minio-init` 容器在创建 `blog-assets` 桶后，自动执行 `mc anonymous set public local/blog-assets`，确保上传图片无需签名 URL 即可公开访问。

---

## 修复进度总结

| ID | 描述 | 优先级 | 状态 |
|----|------|--------|------|
| P0-1 / T12 | siteMetadata.js 填写真实站点信息 | P0 | ✅ 已修复 |
| P0-2 / T09 | MinIO 公开地址改为环境变量 | P0 | ✅ 已修复 |
| P0-3 / T10 | next.config.js 补充 remotePatterns | P0 | ✅ 已修复 |
| P0-4 / T11 | 前端 .env.example 补齐所有必要变量 | P0 | ✅ 已修复 |
| P1-1 / T13 | CI 增加前端构建检查 | P1 | ✅ 已修复 |
| P1-2 / T14 | fallback 地址加 console.warn | P1 | ✅ 已修复 |
| P2-1 / T15 | 明确前端部署方案（Vercel/Docker） | P2 | ⏳ 待架构决策 |
| P2-2 / T17 | 独立标签 API（v1.2） | P2 | 📋 已记录，v1.2 |
| P2-3 / T16 | MinIO 桶 public-read 策略 | P2 | ✅ 已修复 |

---

## 已验证为生产就绪的部分

以下方面经审计确认无需改动：

- **BFF 代理链路** — `app/api/admin/_utils.ts` 正确签发短效 JWT，不向浏览器暴露 token
- **Admin 鉴权中间件** — `middleware.ts` 三态处理（未登录 / 无权限 / admin）逻辑完整
- **auth.ts** — GitHub OAuth + 白名单校验 + 后端用户同步逻辑完整
- **后端 docker-compose 环境变量** — 均通过 `${VAR}` 引用，无硬编码 secret
- **Flyway 迁移** — V0→V1→V2 完整，新环境可自动建表
- **CSP headers** — 已在 `next.config.js` 配置，生产级安全头
- **HSTS** — `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- **Sitemap 动态生成** — 消费后端文章数据，非静态文件
- **应用层容错** — 后端不可达时前台有降级展示，不白屏
