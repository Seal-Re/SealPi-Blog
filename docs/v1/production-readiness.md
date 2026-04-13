# SealPi-Blog 生产就绪审计

> 审计日期：2026-04-13  
> 当前阶段：v1.1 完成，评估从"开发阶段"转向"实际落地阶段"的差距。

---

## 审计结论

当前项目处于 **"功能完备但配置未收口"** 阶段：核心业务逻辑闭环、BFF 代理链路完整、身份鉴权安全，但存在若干 **硬编码占位值和缺失配置** 会导致真实部署直接失效。

落地阻断项共 **4 项（P0）**，均为配置层问题，不涉及业务逻辑改动。

---

## P0 — 阻断落地（必须在正式部署前修复）

### P0-1 `siteMetadata.js` 全部为模板占位值【BLOCKING】

**文件**: `tailwind-nextjs-starter-blog-sealpi/data/siteMetadata.js`

**问题**:

| 字段 | 当前值 | 影响 |
|------|--------|------|
| `title` | `'Next.js Starter Blog'` | 所有页面 `<title>`、OG 标题错误 |
| `author` | `'Tails Azimuth'` | 文章 JSON-LD 结构化数据作者字段错误 |
| `headerTitle` | `'TailwindBlog'` | 页头显示错误品牌名 |
| `siteUrl` | `'https://tailwind-nextjs-starter-blog.vercel.app'` | **sitemap、canonical URL、JSON-LD 全部指向错误域名**，SEO 权重完全流失 |
| `siteRepo` | `'https://github.com/timlrx/tailwind-nextjs-starter-blog'` | 仓库链接错误 |
| `email` / 社交链接 | `address@yoursite.com` / 各平台模板 URL | 展示给用户的联系信息全部错误 |
| `description` | `'A blog created with Next.js and Tailwind.css'` | 页面描述和 OG 描述不准确 |

**影响范围**:
- `app/layout.tsx:20` — `metadataBase: new URL(siteMetadata.siteUrl)` — 影响所有 canonical URL
- `app/sitemap.ts:8` — `siteMetadata.siteUrl` — sitemap 中所有 URL 指向错误域名
- `app/seo.tsx:20` — OG/Twitter 卡片 siteName 字段
- 文章详情页 JSON-LD（若有）

**修复**: 按实际部署域名和作者信息填写 `siteMetadata.js` 所有字段。

---

### P0-2 `docker-compose.yml` — MinIO 公开访问地址硬编码为 localhost【BLOCKING】

**文件**: `docker-compose.yml:57`

```yaml
ADMIN_UPLOAD_PUBLICBASEURL: http://localhost:13308
```

**问题**: 后端使用此地址拼接上传文件的对外 URL（`coverImageUrl`、文章图片等），写入数据库。部署到任何非本地机器后，所有图片 URL 均为 `localhost`，浏览器无法访问。

**修复方向**:
1. 将此值改为环境变量（如 `${MINIO_PUBLIC_BASE_URL}`），并在 `.env.backend.example` 中补充该变量。
2. 生产部署时填写 MinIO 的真实公开地址（域名或 IP:Port）。

---

### P0-3 `next.config.js` — `images.remotePatterns` 未包含实际使用的图片域名【BLOCKING】

**文件**: `tailwind-nextjs-starter-blog-sealpi/next.config.js:76-82`

```js
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'picsum.photos',   // ← 仅允许示例图片站
    },
  ],
},
```

**问题**: Next.js `<Image>` 组件对未授权域名的图片会返回 400 或展示破图：

| 实际使用的图片来源 | 当前是否允许 |
|-----|-----|
| GitHub 头像 (`avatars.githubusercontent.com`) | ❌ 不在白名单 |
| MinIO 上传图片（用户自定义域名/IP） | ❌ 不在白名单 |
| picsum.photos（测试图片） | ✓ |

**影响**: 所有用户头像、文章封面图（来自 MinIO）在生产环境展示异常。

**修复**:
1. 添加 `avatars.githubusercontent.com` 到 `remotePatterns`（GitHub 头像，固定域名）。
2. MinIO 域名通过 `MINIO_PUBLIC_HOSTNAME` 环境变量注入到 `next.config.js`，避免硬编码。

---

### P0-4 前端 `.env.example` 缺失大量必要的生产环境变量【BLOCKING（文档层）】

**文件**: `tailwind-nextjs-starter-blog-sealpi/.env.example`

**问题**: 当前 `.env.example` 仅包含 `NEXT_PUBLIC_BLOG_API_BASE_URL` 和 Giscus 配置，但前端正常运行需要以下变量（均在 `auth.ts`、`admin-api.ts`、`api-config.ts` 中使用）：

| 变量 | 用途 | 当前是否在 `.env.example` |
|------|------|--------------------------|
| `GITHUB_ID` | GitHub OAuth App Client ID | ❌ 缺失 |
| `GITHUB_SECRET` | GitHub OAuth App Client Secret | ❌ 缺失 |
| `AUTH_SECRET` | NextAuth JWT 加密密钥 | ❌ 缺失 |
| `AUTH_URL` | NextAuth 回调基础 URL（生产必须设置） | ❌ 缺失 |
| `BLOG_API_BASE_URL` | 服务端 API 地址（优先于 NEXT_PUBLIC_） | ❌ 缺失 |
| `ADMIN_GITHUB_USERIDS` | 管理员 GitHub userId 白名单 | ❌ 缺失 |
| `ADMIN_JWT_SECRET` | BFF 签发 JWT 使用的 HS256 密钥 | ❌ 缺失 |
| `ADMIN_JWT_GITHUBUSERIDCLAIM` | JWT claim 名称（默认 githubUserId） | ❌ 缺失 |
| `BLOG_INTERNAL_SYNC_SECRET` | Next.js → Java 用户同步接口共享密钥 | ❌ 缺失 |

**说明**: 以上变量虽然在后端侧的 `.env.backend.example` 中有部分体现，但前端作为独立服务，其 `.env` 文件必须单独完整。新部署者仅看 `.env.example` 无法知道需要哪些变量，会导致 OAuth 失败、admin 功能完全不可用。

**修复**: 补全前端 `.env.example`，每个变量附注说明和获取方式。

---

## P1 — 影响质量保障（建议在 v1.2 前修复）

### P1-1 CI 无前端构建检查

**文件**: `.github/workflows/ci.yml`

**问题**: CI 仅运行后端 `mvnw test` 和 docker-compose smoke test，没有 `next build` 或 `npx next lint`。TypeScript 编译错误、构建失败不会被 CI 捕获，依赖版本冲突可能在部署时才暴露。

**修复**: 在 CI 中增加 `frontend` job，执行 `npm ci && npx next lint && npx next build`。

---

### P1-2 `admin-api.ts` / `api-config.ts` 硬编码 fallback 地址

**文件**:
- `tailwind-nextjs-starter-blog-sealpi/lib/admin-api.ts:38` — `'http://127.0.0.1:13311'`
- `tailwind-nextjs-starter-blog-sealpi/lib/api-config.ts:4` — `'http://127.0.0.1:8080'`

**问题**: 当 `AUTH_URL` / `BLOG_API_BASE_URL` 未配置时，服务端请求静默回退到本地地址，在生产环境会静默失败而不报错。

**修复建议**: 在 fallback 路径记录 `console.warn`，提示未配置环境变量；在部署文档中明确标记这两个变量为必填项。

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

### P2-3 MinIO 桶访问策略未在部署文档中说明

**现状**: `minio-init` 容器创建了 `blog-assets` 桶，但没有设置 public read policy。上传的图片 URL 能否被公开访问，取决于 MinIO 桶的访问策略配置。

**建议**: 在部署文档中说明 MinIO 桶需设置为 `public` 读权限，或使用预签名 URL 策略。

---

## 修复优先级总结

| ID | 描述 | 优先级 | 阻断落地 |
|----|------|--------|----------|
| P0-1 | siteMetadata.js 填写真实站点信息 | P0 | ✓ |
| P0-2 | MinIO 公开地址改为环境变量 | P0 | ✓ |
| P0-3 | next.config.js 补充 remotePatterns | P0 | ✓ |
| P0-4 | 前端 .env.example 补齐所有必要变量 | P0 | ✓（文档层） |
| P1-1 | CI 增加前端构建检查 | P1 | ✗ |
| P1-2 | fallback 地址加 console.warn | P1 | ✗ |
| P2-1 | 明确前端部署方案（Vercel/Docker） | P2 | ✗ |
| P2-2 | 独立标签 API（v1.2） | P2 | ✗ |
| P2-3 | MinIO 桶访问策略文档说明 | P2 | ✗ |

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
