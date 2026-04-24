# SealPi-Blog · Full-Stack Blog System

> **Spring Boot 3.2 DDD backend + Next.js 15 frontend — Excalidraw canvas as the primary article format, GitHub OAuth for admin, MinIO for assets.**
>
> 基于 Spring Boot 3.2 DDD 六模块分层 + Next.js 15 React 19 的全栈博客系统。文章以 Excalidraw JSON 为主要内容格式，GitHub OAuth2 驱动管理员鉴权，MinIO 存储图片资源。

[English](#english) · [中文](#中文)

![Java](https://img.shields.io/badge/Java-21-ED8B00?logo=openjdk)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2-6DB33F?logo=springboot)
![MyBatis Plus](https://img.shields.io/badge/ORM-MyBatis--Plus-DC382D)
![Flyway](https://img.shields.io/badge/Migration-Flyway-CC0200)
![MySQL](https://img.shields.io/badge/DB-MySQL%208.0-4479A1?logo=mysql)
![MinIO](https://img.shields.io/badge/Storage-MinIO-C72E49?logo=minio)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Tailwind](https://img.shields.io/badge/CSS-Tailwind-06B6D4?logo=tailwindcss)
![NextAuth](https://img.shields.io/badge/Auth-NextAuth%20v5-000000)
![Vitest](https://img.shields.io/badge/Tests-Vitest-6E9F18?logo=vitest)
![CI](https://img.shields.io/badge/CI-GitHub%20Actions-2088FF?logo=githubactions)
![Docker](https://img.shields.io/badge/Deploy-Docker%20Compose-2496ED?logo=docker)
![License](https://img.shields.io/badge/License-MIT-blue)

---

<a id="english"></a>

## TL;DR

SealPi-Blog is a personal publishing platform where articles are authored with the **Excalidraw canvas editor** (stored as JSON, rendered with static preview images for SEO). The Java backend is structured as a strict **DDD / COLA six-module monolith** with an `Article` aggregate that has its own state machine. The Next.js frontend acts as a **BFF** — it authenticates via GitHub OAuth (NextAuth v5), signs short-lived HS256 JWTs server-side, and proxies admin API calls to the Spring Boot backend so the raw GitHub access token never reaches the browser.

## Architecture · 架构

```mermaid
flowchart LR
    Browser[("Browser")]

    subgraph Next15["Next.js 15 (:13999)"]
      FE["Public blog pages<br/>(ISR, tag RSS)"]
      Admin["Admin area<br/>/admin/* (protected)"]
      BFF["BFF routes /api/admin/*<br/>(sign HS256 JWT → proxy)"]
    end

    subgraph Spring30["Spring Boot 3.2 (:13310 / 8080)"]
      Adapter["blog-adapter<br/>REST controllers + AdminAuthFilter"]
      App["blog-app<br/>ArticleServiceImpl"]
      Domain["blog-domain<br/>Article aggregate + gateway interface"]
      Infra["blog-infra<br/>MyBatis-Plus + MinIO gateway impl"]
    end

    GitHub[["GitHub OAuth"]]
    MySQL[(MySQL 8.0 :13307)]
    MinIO[(MinIO :13308)]
    NextAuth["NextAuth v5<br/>(auth.ts)"]

    Browser --> FE
    Browser --> Admin
    Admin --> NextAuth
    NextAuth <--> GitHub
    Admin --> BFF
    BFF -- "Bearer HS256 JWT" --> Adapter
    Adapter --> App --> Domain
    Domain <-.. gateway impl ..-> Infra
    Infra --> MySQL
    Infra --> MinIO
```

### DDD module breakdown

| Module | Layer | Responsibility |
|---|---|---|
| `blog-client` | API contract | DTOs (cmd/qry/vo), `ArticleServiceI` interface |
| `blog-app` | Application | `ArticleServiceImpl` — orchestrates draft/publish/CRUD; input validation before domain calls |
| `blog-domain` | Domain | `Article` aggregate (`saveDraft`, `publishFromDraft`, `offlineToDraft`, `modify`); `ArticleGateway` interface; `ArticleStatus` enum |
| `blog-infra` | Infrastructure | MyBatis-Plus mappers, `ArticlePO`, `MinioObjectStorage`, gateway impl, Flyway migrations V0→V3 |
| `blog-adapter` | Inbound adapter | REST controllers, `AdminAuthFilter`, `AdminJwtVerifier` (dual-mode), CORS config |
| `blog-start` | Boot | `BlogStartApplication`, aggregated `application.properties` |

Dependency direction: `start → adapter → app → domain ← infra`. `client` is shared.

### Article state machine

```
DRAFT  ──publishFromDraft()──►  PUBLISHED  ──archive()──►  ARCHIVED (terminal)
  ▲                                  │
  └───────offlineToDraft()───────────┘
```

## Stack at a glance

| Layer | Choice | Key detail |
|---|---|---|
| Backend | Spring Boot 3.2 + Java 21 | Maven multi-module (6 modules) |
| ORM | MyBatis-Plus + XML | Druid → removed, Flyway migrations V0→V3 |
| Object storage | MinIO | Public-read `blog-assets` bucket; signed URLs not needed |
| Frontend | Next.js 15 + React 19 | Tailwind CSS, wb-\* design tokens, dark-mode via CSS vars |
| Auth | NextAuth v5 + GitHub OAuth | Admin BFF signs 15-min HS256 JWT; GitHub token stays server-side |
| Content format | Excalidraw JSON | Stored as `content_json` (published) + `draft_json`; preview image for SEO |
| Testing | Spring `@SpringBootTest` + Vitest 4 | Backend: MockMvc + `@MockBean`; Frontend: `lib/__tests__/*.test.ts` |
| CI | GitHub Actions (3 jobs) | backend-test → frontend-lint+build → docker-compose smoke |

## Quickstart · 5 分钟跑起来

> **Windows PowerShell** (Docker Desktop + Node.js 20 + JDK 21 required)

```powershell
# 1. copy and fill secrets
cp .env.backend.example .env.backend.local
notepad .env.backend.local

# 2. start everything (MySQL + MinIO + backend + frontend)
.\start-local-test.ps1

# 3. skip npm install on subsequent restarts
.\start-local-test.ps1 -SkipInstall

# 4. tear down
.\stop-local-test.ps1
```

**Local ports**

| Service | Port |
|---|---|
| Frontend (Next.js) | `:13999` |
| Backend (Spring Boot) | `:13310` |
| MySQL | `:13307` |
| MinIO API | `:13308` |
| MinIO Console | `:13309` |

#### Run individually

```bash
# Backend tests
cd sealpi-blog && ./mvnw -q test

# Frontend tests + lint
cd tailwind-nextjs-starter-blog-sealpi && npm ci && npm test && npm run lint

# Docker Compose (all services)
docker compose --env-file .env.backend.local up -d
```

## Technical highlights · 技术亮点 (STAR)

<details>
<summary><b>🏗️ DDD / COLA six-module split</b> — domain stays clean, infra swappable</summary>

- **S**: A blog backend is CRUD-heavy, but articles have a non-trivial lifecycle and the domain logic must not bleed into infrastructure.
- **A**: Followed COLA: `blog-domain` owns the `Article` aggregate and `ArticleGateway` interface (no Spring, no MyBatis imports). `blog-infra` implements the gateway. `blog-adapter` holds the only Spring MVC code. Dependency inversion enforced by Maven module boundaries — `domain` cannot import `infra`.
- **R**: Swapping MyBatis-Plus for JDBC or another ORM is a `blog-infra` change only. Validation lives in `blog-app` (trusted by domain), REST mapping lives in `blog-adapter` (not tested by domain tests).
</details>

<details>
<summary><b>🔐 Dual-mode admin auth + BFF token signing</b></summary>

- **S**: GitHub OAuth access tokens expire unpredictably and must never reach the browser or be forwarded to backend verbatim.
- **A**: Next.js BFF routes (`/api/admin/*`) extract the GitHub user ID from the server-side session, sign a **new HS256 JWT** (15-minute expiry, `ADMIN_JWT_SECRET`) on every request, and forward it as `Authorization: Bearer`. The backend `AdminJwtVerifier` has two paths: if the token contains 2 dots → offline HS256 verify; otherwise → live `api.github.com/user` call (5 s timeout). Whitelist check follows either path.
- **R**: GitHub token never leaves the server. Admin token TTL is 15 min regardless of the GitHub session length.
</details>

<details>
<summary><b>📐 Excalidraw JSON as primary content format</b></summary>

Content is stored as raw Excalidraw JSON (`content_json`) plus an auto-generated static preview image for OpenGraph/SEO. The admin editor (`AdminEditorClient.tsx`) is a live Excalidraw instance. On publish, `draft_json → content_json` and `draft_body_md → body_md` (optional Markdown companion). Public API strips draft fields via `toPublicVO()`. Read time is computed from `bodyMd` with separate CJK (300 chars/min) and Latin (220 words/min) rates.
</details>

<details>
<summary><b>🧪 CI: 3 parallel jobs including docker-compose smoke</b></summary>

`.github/workflows/ci.yml` runs three jobs in parallel on every push/PR:
1. **backend**: JDK 21 Temurin + Maven cache → `./mvnw -q test`
2. **frontend**: Node 20 + `npm ci` → lint (Next.js + ESLint + Prettier) → `npm test` (Vitest) → `npx next build`
3. **docker-compose**: builds `linux/amd64` images, runs `docker compose ps` smoke check, tears down with `-v`

A PR is only mergeable when all three pass — prevents shipping a backend that builds but a Docker image that doesn't.
</details>

<details>
<summary><b>🎨 CSS design token system</b> — wb-* semantic tokens, single dark-mode remap</summary>

Frontend uses `wb-*` CSS custom properties (`--color-wb-ink`, `--color-wb-paper`, etc.) instead of Tailwind's gray-scale utilities in public-facing components. The `.dark` class on `<html>` remaps all variables — no per-component `dark:` classes needed outside the admin area. Tailwind only generates utilities that reference these tokens, keeping the CSS bundle tight.
</details>

## Roadmap · 路线图

- [x] Spring Boot 3.2 DDD six-module backend
- [x] Excalidraw article editor + draft/publish state machine
- [x] MinIO object storage + public-read bucket setup
- [x] NextAuth v5 GitHub OAuth + HS256 BFF token signing
- [x] Flyway migrations V0–V3
- [x] CI: backend test + frontend lint/build + docker-compose smoke
- [ ] RSS tag feeds + sitemap auto-generation
- [ ] Article search (full-text MySQL or Meilisearch)
- [ ] Comment system (Giscus or home-grown moderation)
- [ ] Umami analytics dashboard integration
- [ ] Mobile-responsive admin editor

<a id="中文"></a>

## 中文速读

- **是什么**：全栈个人博客系统，文章用 Excalidraw 画布编辑，以 JSON 入库、静态预览图做 SEO。
- **后端**：Spring Boot 3.2 + Java 21，严格 DDD/COLA 六模块分层。`Article` 聚合体内置状态机（草稿 → 发布 → 归档），`blog-domain` 不引任何 Spring/MyBatis 包，依赖由 Maven 模块边界强制保证。
- **前端**：Next.js 15 + React 19 + Tailwind，NextAuth v5 做 GitHub OAuth，Next.js BFF 路由在服务端签 15 分钟 HS256 JWT 再代理给 Spring Boot，GitHub Token 不落到浏览器。
- **存储**：MySQL 8.0（MyBatis-Plus + Flyway）+ MinIO（公开读 `blog-assets` Bucket，Excalidraw 附图与封面）。
- **CI**：三并行 Job —— 后端单测 / 前端 Lint+Build+Vitest / docker-compose 冒烟测试；三绿才可合并。

## License

MIT © [Seal-Re](https://github.com/Seal-Re)
