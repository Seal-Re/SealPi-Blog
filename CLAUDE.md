# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SealPi-Blog is a full-stack blog system with a **Spring Boot 3.2 (Java 21) DDD backend** and a **Next.js 15 (React 19) frontend**. Articles use Excalidraw JSON as their primary content format, with static preview images for SEO/OG. The admin area supports online creation via an Excalidraw editor with draft/publish workflow.

## Repository Layout

```
sealpi-blog/                    # Java backend (Maven multi-module)
tailwind-nextjs-starter-blog-sealpi/   # Next.js frontend
docker-compose.yml              # MySQL 8.0 + MinIO + blog-start
.env.backend.example            # Template for .env.backend.local (secrets)
start-local-test.ps1            # One-click local dev (infra + backend + frontend)
stop-local-test.ps1             # Tear down local dev
docs/                           # Design documents (Chinese)
```

## Build & Run Commands

### Backend (Spring Boot)

```bash
cd sealpi-blog

# Run all tests
./mvnw -q test

# Run a single test class
./mvnw -q test -pl blog-adapter -Dtest=BlogAdapterApplicationTests

# Full build (skip tests)
./mvnw -q package -DskipTests

# Run the app (from blog-start module)
./mvnw -f blog-start/pom.xml spring-boot:run
```

The backend listens on port **8080** by default (overridden to **13310** in local dev).

### Frontend (Next.js)

```bash
cd tailwind-nextjs-starter-blog-sealpi

npm install          # or: yarn
npx next dev -p 13311   # dev server
npx next build       # production build
npm run lint         # lint (pages/app/components/lib/layouts/scripts + prettier)
npm test             # run Vitest unit tests (once)
npm run test:watch   # run Vitest in watch mode
```

Package manager is **yarn 3.6.1** (declared in `packageManager`), but npm works too.

### Local Development (Full Stack)

```powershell
# From project root (Windows PowerShell)
.\start-local-test.ps1            # starts MySQL, MinIO, backend, frontend
.\start-local-test.ps1 -SkipInstall  # skip npm install if already done
.\stop-local-test.ps1             # tear down
```

Requires: Docker Desktop, Node.js 20+, JDK 21. Secrets are stored in `.env.backend.local` (created from `.env.backend.example` on first run).

**Local ports**: Frontend 13311, Backend 13310, MySQL 13307, MinIO API 13308, MinIO Console 13309.

### Docker Compose

```bash
docker compose --env-file .env.backend.local up -d   # full stack
docker compose down -v                                # tear down
```

## Backend Architecture (DDD Layers)

The backend follows COLA/DDD layering under `com.seal.blog`:

| Module | Role | Key contents |
|---|---|---|
| `blog-client` | Public API contracts | DTOs (cmd/qry/vo), `ArticleServiceI` interface |
| `blog-app` | Application services | `ArticleServiceImpl` — orchestrates draft/publish/CRUD |
| `blog-domain` | Domain models & gateways | `Article` aggregate, `ArticleGateway` interface, `ArticleStatus` enum |
| `blog-infra` | Infrastructure | MyBatis-Plus mappers, PO objects, `MinioObjectStorage`, gateway impls |
| `blog-adapter` | Inbound adapters | REST controllers, auth filters/verifiers, CORS config |
| `blog-start` | Boot entry point | `BlogStartApplication`, `application.properties` (aggregates all config) |

**Dependency flow**: `start` -> `adapter` -> `app` -> `domain` <- `infra` (infra implements domain gateways). `client` is shared across layers.

### Key Backend Patterns

- Domain model (`Article`) has behavior methods: `saveDraft()`, `publishFromDraft()`, `offlineToDraft()`, `modify()`
- Gateway pattern: `ArticleGateway` (domain interface) implemented by `ArticleGatewayImpl` (infra)
- `ArticlePO` <-> `Article` conversion via `ArticleInfraConverter` (MapStruct)
- `ArticleAssembler` in app layer handles DTO <-> domain conversion
- Admin endpoints under `/api/v1/admin/**` protected by `AdminAuthFilter` + `AdminJwtVerifier`
- Public read endpoints under `/api/v1/articles/**` (no auth)

### Backend Auth Chain

1. `AdminAuthFilter` intercepts `/api/v1/admin/**`
2. Extracts `Authorization: Bearer <token>` header
3. `AdminJwtVerifier` validates token — **dual-mode**:
   - **JWT path** (token contains 2 dots): verifies HS256 signature offline, extracts `githubUserId` claim
   - **GitHub OAuth token path**: validates live via `https://api.github.com/user` (5-second timeout)
4. Checks extracted `githubUserId` against `admin.github.userIds` whitelist (CSV)
5. Config in `AdminAuthConfig`: `admin.jwt.secret`, `admin.github.userIds`, `admin.jwt.githubUserIdClaim`
6. `admin.auth.allowLegacyJwt=true` enables the JWT path (off by default in prod)

### Frontend BFF Token Signing

Next.js BFF routes (`app/api/admin/_utils.ts`) sign a **new HS256 JWT on every request** (15-minute expiry) using `ADMIN_JWT_SECRET` + the `githubUserId` from the session, then forward it as `Authorization: Bearer`. The GitHub access token never leaves the server.

### Backend Response & Error Conventions

- All endpoints return a `Response<T>` wrapper: `{ success, errCode, errMessage, data }`
- HTTP status codes: 401 (missing/invalid auth), 403 (not in whitelist), 409 (duplicate slug), 400 (validation)
- Custom `AdminAuthException(statusCode, code, message)` for all auth failures
- Write methods use `@Transactional(rollbackFor = Exception.class)`
- Logging via `@Slf4j`; constructor injection via `@RequiredArgsConstructor` (not `@Autowired`)

### Article Draft/Publish Semantics

- `action=draft|publish` query param on create/update (default `draft`)
- Drafts allow empty title → stored as `"未命名草稿"` (Unnamed Draft)
- Publishing validates: title required (400 if missing), slug required and unique (409 if duplicate)
- State machine: `DRAFT` ↔ `PUBLISHED` (via `publishFromDraft()` / `offlineToDraft()`); `ARCHIVED` is terminal

### Multipart Upload Field Names

Admin create/update accepts `multipart/form-data` with fields: `title`, `url`, `draftJson`, `summary` (optional), `draftBodyMd` (optional), `coverCaption` (optional), `coverImageUrl` (optional URL), `previewImage` (optional file), `tags` (optional comma-separated string). JSON body endpoints still exist but are `@Deprecated`.

## Frontend Architecture

Based on [tailwind-nextjs-starter-blog](https://github.com/timlrx/tailwind-nextjs-starter-blog) v2.4.0, extended with:

- **Admin area** (`/admin/*`): Article management, Excalidraw editor
- **Auth**: NextAuth v5 (Auth.js) with GitHub OAuth2 provider (`auth.ts`)
- **Middleware** (`middleware.ts`): Protects `/admin/*` routes; redirects unauthenticated users to `/login`, non-admin users to `/admin/forbidden`

### Key Frontend Files

- `auth.ts` — NextAuth config, GitHub OAuth, admin whitelist check, user sync to backend
- `middleware.ts` — Route protection for admin area
- `lib/api-config.ts` — Backend API base URL resolution (`BLOG_API_BASE_URL` or `NEXT_PUBLIC_BLOG_API_BASE_URL`)
- `lib/admin-api.ts` — Admin API client (multipart article CRUD, asset upload); use from client components / BFF route handlers
- `lib/public-blog-api.ts` — Public article API client
- `lib/server-github-token.ts` — Server-side GitHub token extraction from JWT
- `app/api/admin/_utils.ts` — BFF helpers: `adminServerGet` (server components), `proxyAdminRequest` (BFF routes), `requireAdminBffContext`
- `components/admin/AdminEditorClient.tsx` — Excalidraw editor component
- `app/blog/[...slug]/page.tsx` — Article detail page
- `next.config.js` — Contentlayer2 + bundle analyzer + CSP headers

### Frontend Auth Flow

1. User visits `/admin/*` -> middleware checks session
2. Not logged in -> redirect to `/login?next=/admin`
3. NextAuth GitHub OAuth flow -> `signIn` callback calls `POST /api/v1/internal/users/oauth-sync` (header: `X-Blog-Internal-Sync-Secret`) to sync user to backend; returns `commentPermission`, `banned` status
4. `jwt` callback: stores `githubUserId`, `githubAccessToken`, checks admin permission
5. Admin API calls from frontend go through Next.js BFF routes (`/api/admin/*`) which sign a short-lived JWT and proxy to the Java backend (see BFF Token Signing above)

### Admin Server Component Pattern

Server components must use `adminServerGet` from `app/api/admin/_utils.ts` to call the backend directly. **Do NOT** call `/api/admin/*` BFF routes from server components: Next.js server-side self-fetches don't forward cookies, so `auth()` inside the BFF handler sees no session and returns 401.

### Environment Variables (Frontend)

- `NEXT_PUBLIC_BLOG_API_BASE_URL` — Blog API base URL (client-side, default `http://localhost:13310`)
- `BLOG_API_BASE_URL` — Blog API base URL (server-side, takes precedence)
- `GITHUB_ID` / `GITHUB_SECRET` — GitHub OAuth app credentials
- `AUTH_SECRET` — NextAuth encryption secret
- `ADMIN_GITHUB_USERIDS` — CSV of admin GitHub user IDs (frontend whitelist)
- `ADMIN_JWT_SECRET` — Shared HS256 key with backend (used to sign BFF JWTs)
- `BLOG_INTERNAL_SYNC_SECRET` — Shared secret for `POST /api/v1/internal/users/oauth-sync`
- `MINIO_PUBLIC_HOSTNAME` — Public base URL for MinIO assets (used in build)
- `ADMIN_JWT_GITHUBUSERIDCLAIM` — JWT claim name for GitHub user ID (default `githubUserId`; must match backend `admin.jwt.githubUserIdClaim`)

## API Endpoints

### Public (no auth)
- `GET /api/v1/articles` — Paginated article list (always published-only; `status` param overridden server-side)
- `GET /api/v1/articles/{id}` — Article by ID (404 for non-published)
- `GET /api/v1/articles/slug/{slug}` — Article by slug (404 for non-published)
- `GET /api/v1/articles/adjacent?slug={slug}&tags={tag}&tags={tag}` — Prev/next/related articles by slug (returns `{ prev, next, related }` with title/url/summary/coverImageUrl/tags/date)
- `GET /api/v1/tags` — Published tag list with counts (`[{ tagId, name, count }]`)
- `POST /api/v1/articles/{id}/view` — Increment view count (no-op on error)

### Admin (requires JWT auth)
- `GET /api/v1/admin/stats` — Aggregated article counts (total, published, draft, archived, totalViews)
- `GET /api/v1/admin/articles` — Paginated article list (any status, full VO)
- `GET /api/v1/admin/articles/{id}` — Article by ID (any status, full VO including draftJson/draftBodyMd)
- `POST /api/v1/admin/articles?action=draft|publish` — Create article (multipart preferred)
- `PUT /api/v1/admin/articles/{id}?action=draft|publish` — Update article
- `DELETE /api/v1/admin/articles/{id}` — Delete article
- `POST /api/v1/admin/articles/{id}/offline` — Take article offline (back to draft)
- `POST /api/v1/admin/articles/{id}/publish` — Publish article directly (no multipart)
- `POST /api/v1/admin/articles/{id}/archive` — Archive article (terminal state)
- `GET /api/v1/admin/auth/check` — Admin permission check (used by frontend `auth.ts`)
- `GET /api/v1/admin/users` — Paginated user list
- `PATCH /api/v1/admin/users/{userId}` — Admin update user (commentPermission, banned)
- `POST /api/v1/admin/upload` — Upload asset to MinIO

### Internal (header auth)
- `POST /api/v1/internal/users/oauth-sync` — Sync GitHub OAuth user to backend (header: `X-Blog-Internal-Sync-Secret`)

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on push to `main` and PRs:
- **backend** job: JDK 21 (Temurin) + Maven cache + `./mvnw -q test` in `sealpi-blog/`
- **frontend** job: Node.js 20 + `npm ci` + `npx next lint --dir app --dir components --dir lib --dir layouts` + `npx next build` (uses placeholder env vars)
- **docker-compose** job: builds `linux/amd64` images with `--no-cache`, smoke checks with `docker compose ps`, tears down with `-v`

## Testing

Backend tests (`blog-adapter`) use `@SpringBootTest` + `@AutoConfigureMockMvc` with service/infra layers mocked via `@MockBean`. Tests generate HS256 JWT tokens inline (via `bearerToken()` helper) and assert via `jsonPath()`. To avoid loading `blog-infra` context, tests set `admin.auth.allowLegacyJwt=true` in `@SpringBootTest(properties = {...})`.

Frontend unit tests use **Vitest 4.1.4** (`npm test`). Test files in `lib/__tests__/`: `public-blog-api.test.ts`, `admin-api.test.ts`, `article-status.test.ts`, `toc-utils.test.ts`. CI runs: `npm ci → npx next lint → npm test → npx next build`.

## Important Conventions

- Backend field naming: `snake_case` for DB columns, `camelCase` for JSON
- Article content is Excalidraw JSON stored in `content_json` (published) and `draft_json` (editing) as `LONGTEXT`
- Workbook v2 fields: `body_md` (published Markdown), `draft_body_md` (draft Markdown), `cover_caption` (Excalidraw hero caption). Added via V3 Flyway migration. `publishFromDraft()` copies `draft_body_md → body_md`.
- Public API strips draft fields: `draftJson` and `draftBodyMd` are nulled in public VO responses (`toPublicVO()`). Full data only via admin endpoints.
- `ArticleStatus` enum: `DRAFT=0`, `PUBLISHED=1`, `ARCHIVED=2`
- The `sealpi-blog/null/` directory contains legacy auto-generated code — ignore it
- Docker builds may fail on Windows due to `exec format error`; use CI for Docker validation
- Frontend admin API calls route through Next.js BFF (`/api/admin/*`) which proxies to the Java backend, injecting auth headers server-side
- Validation happens before domain method calls in `ArticleServiceImpl`; domain methods trust their inputs
- Frontend CSS: use `wb-*` token classes (`wb-paper`, `wb-canvas`, `wb-ink`, `wb-ink-soft`, `wb-accent`, `wb-meta`, `wb-rule`, `wb-rule-soft`, `wb-card-shadow`). Do NOT add `dark:bg-gray-*` / `dark:text-gray-*` outside the admin area. The `.dark` class remaps all `--color-wb-*` CSS variables — do NOT hardcode hex values for these tokens.
- `ArticleVO.readMinutes` is computed by `ArticleAssembler.computeReadMinutes()` from `bodyMd` (CJK ~300 chars/min, Latin ~220 words/min). Set in `toPublicVO()` before `bodyMd` is stripped from list responses; available on both list and detail public endpoints.
- Markdown body supports GitHub alert callouts (`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`) via `remark-github-blockquote-alert`. CSS in `css/tailwind.css` under `.wb-body .markdown-alert-*`.
- `export const revalidate` must be a static number literal — Next.js 15 rejects variable references. Do NOT combine with `force-dynamic`.
