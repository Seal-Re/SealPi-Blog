# Workbook Visual Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Workbook visual system (奶咖 / Fraunces / 手写批注) + Markdown 正文字段 across backend and frontend, in three independently-deployable phases.

**Architecture:**
- Backend: add 3 nullable columns to `t_article`, thread `bodyMd / draftBodyMd / coverCaption` through Article aggregate → PO → DTO → multipart controller. `publishFromDraft()` copies `draftBodyMd → bodyMd` at publish time.
- Frontend: register Workbook tokens in `css/tailwind.css` (Tailwind v4 `@theme`), load 4 fonts via `next/font/google`, build `<WorkbookArticleLayout>` component tree, render Markdown via `react-markdown` + `remark-directive` for `:::note → <MarginNote>`.
- Admin editor: add Markdown textarea + caption input to `AdminEditorClient`, add `/admin/preview/[id]` shadow route.
- Admin route pruning (parallel): collapse to 5 nav items.

**Tech Stack:** Spring Boot 3.2 / Java 21 / MyBatis-Plus / Flyway · Next.js 15 / React 19 / Tailwind v4 / react-markdown / remark-directive / Excalidraw Viewer

**Spec:** `docs/superpowers/specs/2026-04-15-workbook-visual-refresh-design.md`

---

## Phase 1 · Foundation

Phase 1 adds fields and tokens; no visible change to existing pages. Ship independently and verify builds before Phase 2.

### Task 1: Flyway migration V3

**Files:**
- Create: `sealpi-blog/blog-infra/src/main/resources/db/migration/V3__alter_t_article_add_workbook_fields.sql`

- [ ] **Step 1: Write the migration**

```sql
ALTER TABLE t_article
    ADD COLUMN IF NOT EXISTS body_md       LONGTEXT     NULL COMMENT 'Markdown 正文（已发布）' AFTER draft_json,
    ADD COLUMN IF NOT EXISTS draft_body_md LONGTEXT     NULL COMMENT 'Markdown 正文（草稿）' AFTER body_md,
    ADD COLUMN IF NOT EXISTS cover_caption VARCHAR(200) NULL COMMENT 'Excalidraw 封面手写注释' AFTER cover_image_url;
```

- [ ] **Step 2: Run backend tests to verify Flyway applies cleanly**

```bash
cd sealpi-blog && ./mvnw -q test
```

Expected: PASS (tests don't reference new fields yet, migration should apply in test H2/MySQL container without error).

- [ ] **Step 3: Commit**

```bash
git add sealpi-blog/blog-infra/src/main/resources/db/migration/V3__alter_t_article_add_workbook_fields.sql
git commit -m "feat(db): add V3 migration for workbook fields (body_md, draft_body_md, cover_caption)"
```

---

### Task 2: Add fields to ArticlePO

**Files:**
- Modify: `sealpi-blog/blog-infra/src/main/java/com/seal/blog/infra/article/po/ArticlePO.java`

- [ ] **Step 1: Add three fields after existing `coverImageUrl`**

Insert after the `coverImageUrl` field (around line 43):

```java
    // Markdown body (published + draft variants).
    private String bodyMd;
    private String draftBodyMd;

    // Excalidraw cover caption (handwriting annotation under hero).
    private String coverCaption;
```

- [ ] **Step 2: Compile to verify**

```bash
cd sealpi-blog && ./mvnw -q compile -pl blog-infra -am
```

Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit**

```bash
git add sealpi-blog/blog-infra/src/main/java/com/seal/blog/infra/article/po/ArticlePO.java
git commit -m "feat(infra): add bodyMd/draftBodyMd/coverCaption to ArticlePO"
```

---

### Task 3: Extend Article domain aggregate

**Files:**
- Modify: `sealpi-blog/blog-domain/src/main/java/com/seal/blog/domain/article/model/Article.java`

- [ ] **Step 1: Add three private fields after existing `viewCount`**

Insert after `private Integer viewCount;` (around line 21):

```java
    // v2: Markdown body + Excalidraw hero caption.
    private String bodyMd;
    private String draftBodyMd;
    private String coverCaption;
```

- [ ] **Step 2: Extend `saveDraft()` signature and body**

Replace the existing `saveDraft` method (lines 52–58) with:

```java
    public void saveDraft(String draftJson, String coverImageUrl, String draftBodyMd, String coverCaption) {
        this.draftJson = draftJson;
        if (coverImageUrl != null && !coverImageUrl.isBlank()) {
            this.coverImageUrl = coverImageUrl;
        }
        this.draftBodyMd = draftBodyMd;
        if (coverCaption != null) {
            this.coverCaption = coverCaption;
        }
        this.lastmod = LocalDate.now().toString();
    }
```

Rationale: `coverCaption` treated like `coverImageUrl` (shared field; null means "don't clear"); `draftBodyMd` overwrites unconditionally so deletes are respected.

- [ ] **Step 3: Update `publishFromDraft()` to copy Markdown body**

Replace the existing `publishFromDraft` method (lines 60–68):

```java
    public void publishFromDraft(String coverImageUrl) {
        // Copy draft -> content for published view.
        this.contentJson = this.draftJson;
        this.bodyMd = this.draftBodyMd;
        if (coverImageUrl != null && !coverImageUrl.isBlank()) {
            this.coverImageUrl = coverImageUrl;
        }
        this.draft = ArticleStatus.PUBLISHED;
        this.lastmod = LocalDate.now().toString();
    }
```

Note: `offlineToDraft()` NOT changed — `bodyMd` is preserved on offline, same pattern as existing `contentJson`.

- [ ] **Step 4: Extend `reconstruct()` with three new parameters**

Replace the existing `reconstruct` static factory (lines 94–118):

```java
    public static Article reconstruct(
            Integer id,
            String title, String summary, String url,
            String date, String lastmod,
            ArticleStatus draft, Integer count,
            String contentJson,
            String draftJson,
            String coverImageUrl,
            Integer viewCount,
            String bodyMd,
            String draftBodyMd,
            String coverCaption
    ) {
        Article article = new Article(title, summary, url);

        article.articleId = id;
        article.date = date;
        article.lastmod = lastmod;
        article.draft = draft;
        article.count = count;

        article.contentJson = contentJson;
        article.draftJson = draftJson;
        article.coverImageUrl = coverImageUrl;
        article.viewCount = viewCount;

        article.bodyMd = bodyMd;
        article.draftBodyMd = draftBodyMd;
        article.coverCaption = coverCaption;

        return article;
    }
```

- [ ] **Step 5: Compile domain module (will fail — callers not updated yet)**

```bash
cd sealpi-blog && ./mvnw -q compile -pl blog-domain -am
```

Expected: `blog-domain` itself compiles; other modules will break until Tasks 4–6 done. That's fine; commit this task independently.

- [ ] **Step 6: Commit**

```bash
git add sealpi-blog/blog-domain/src/main/java/com/seal/blog/domain/article/model/Article.java
git commit -m "feat(domain): add bodyMd/draftBodyMd/coverCaption to Article aggregate"
```

---

### Task 4: Update ArticleInfraConverter (manual mapper)

**Files:**
- Modify: `sealpi-blog/blog-infra/src/main/java/com/seal/blog/infra/article/converter/ArticleInfraConverter.java`

- [ ] **Step 1: Add three setters to `toPO()`**

Insert after the existing `po.setViewCount(entity.getViewCount());` line:

```java
        // v2 fields.
        po.setBodyMd(entity.getBodyMd());
        po.setDraftBodyMd(entity.getDraftBodyMd());
        po.setCoverCaption(entity.getCoverCaption());
```

- [ ] **Step 2: Add three arguments to `toEntity()` `Article.reconstruct()` call**

Replace the existing `Article.reconstruct(...)` call inside `toEntity()`:

```java
        Article entity = Article.reconstruct(
                po.getArticleId(),
                po.getTitle(),
                po.getSummary(),
                po.getUrl(),
                po.getDate(),
                po.getLastmod(),
                ArticleStatus.of(po.getDraft()),
                po.getCount(),
                po.getContentJson(),
                po.getDraftJson(),
                po.getCoverImageUrl(),
                po.getViewCount(),
                po.getBodyMd(),
                po.getDraftBodyMd(),
                po.getCoverCaption()
        );
```

- [ ] **Step 3: Compile infra**

```bash
cd sealpi-blog && ./mvnw -q compile -pl blog-infra -am
```

Expected: BUILD SUCCESS.

- [ ] **Step 4: Commit**

```bash
git add sealpi-blog/blog-infra/src/main/java/com/seal/blog/infra/article/converter/ArticleInfraConverter.java
git commit -m "feat(infra): wire new workbook fields through ArticleInfraConverter"
```

---

### Task 5: Extend DTOs

**Files:**
- Modify: `sealpi-blog/blog-client/src/main/java/com/seal/blog/client/article/dto/vo/ArticleVO.java`
- Modify: `sealpi-blog/blog-client/src/main/java/com/seal/blog/client/article/dto/cmd/ArticleDraftSaveCmd.java`
- Modify: `sealpi-blog/blog-client/src/main/java/com/seal/blog/client/article/dto/cmd/ArticleDraftUpdateCmd.java`

- [ ] **Step 1: ArticleVO — add three fields**

Insert after `private Integer viewCount;` (around line 33):

```java
    // v2: Markdown body + cover caption.
    private String bodyMd;
    private String draftBodyMd;
    private String coverCaption;
```

- [ ] **Step 2: ArticleDraftSaveCmd — add two fields**

Insert after `private String draftJson;` (before the closing brace):

```java
    /** Markdown body for draft. Nullable. */
    private String draftBodyMd;

    /** Handwriting caption under the Excalidraw hero. Nullable. */
    private String coverCaption;
```

- [ ] **Step 3: ArticleDraftUpdateCmd — add the same two fields**

Same as Step 2; mirror `draftBodyMd` + `coverCaption` into the update cmd.

- [ ] **Step 4: Compile client**

```bash
cd sealpi-blog && ./mvnw -q compile -pl blog-client -am
```

Expected: BUILD SUCCESS.

- [ ] **Step 5: Commit**

```bash
git add sealpi-blog/blog-client/src/main/java/com/seal/blog/client/article/dto/
git commit -m "feat(client): add workbook fields to ArticleVO and draft cmds"
```

---

### Task 6: Update ArticleServiceImpl to pass new fields

**Files:**
- Modify: `sealpi-blog/blog-app/src/main/java/com/seal/blog/app/service/ArticleServiceImpl.java`

- [ ] **Step 1: `adminCreate()` — thread new fields into saveDraft call**

Replace the line `article.saveDraft(cmd.getDraftJson(), coverImageUrl);` inside `adminCreate` (around line 88):

```java
        article.saveDraft(cmd.getDraftJson(), coverImageUrl, cmd.getDraftBodyMd(), cmd.getCoverCaption());
```

- [ ] **Step 2: `adminUpdate()` — same change**

Replace the line `article.saveDraft(cmd.getDraftJson(), coverImageUrl);` inside `adminUpdate` (around line 119):

```java
        article.saveDraft(cmd.getDraftJson(), coverImageUrl, cmd.getDraftBodyMd(), cmd.getCoverCaption());
```

- [ ] **Step 3: Compile app**

```bash
cd sealpi-blog && ./mvnw -q compile -pl blog-app -am
```

Expected: BUILD SUCCESS.

- [ ] **Step 4: Commit**

```bash
git add sealpi-blog/blog-app/src/main/java/com/seal/blog/app/service/ArticleServiceImpl.java
git commit -m "feat(app): forward draftBodyMd/coverCaption to Article.saveDraft"
```

---

### Task 7: Update ArticleAdminController multipart endpoints

**Files:**
- Modify: `sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/article/ArticleAdminController.java`

- [ ] **Step 1: `adminCreateMultipart` — add two `@RequestParam` args and wire to cmd**

Replace the `adminCreateMultipart` method body. Add the two new params to the signature (after `draftJson`) and replace the `new ArticleDraftSaveCmd(...)` construction:

```java
    @PostMapping(value = "/articles", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Response adminCreateMultipart(
            @RequestParam("title") String title,
            @RequestParam(name = "summary", required = false) String summary,
            @RequestParam("url") String url,
            @RequestParam("draftJson") String draftJson,
            @RequestParam(name = "draftBodyMd", required = false) String draftBodyMd,
            @RequestParam(name = "coverCaption", required = false) String coverCaption,
            @RequestParam(name = "previewImage", required = false) MultipartFile previewImage,
            @RequestParam(name = "action", defaultValue = "draft") String action,
            @RequestParam(name = "coverImageUrl", required = false) String coverImageUrl
    ) {
        String finalCoverUrl = coverImageUrl;
        if (previewImage != null && !previewImage.isEmpty()) {
            try {
                finalCoverUrl = objectStorage.upload(
                        previewImage.getInputStream(),
                        previewImage.getSize(),
                        previewImage.getContentType(),
                        previewImage.getOriginalFilename()
                );
            } catch (IOException e) {
                throw new IllegalStateException("previewImage read failed", e);
            }
        }

        ArticleDraftSaveCmd cmd = new ArticleDraftSaveCmd();
        cmd.setTitle(title);
        cmd.setSummary(summary);
        cmd.setUrl(url);
        cmd.setDraftJson(draftJson);
        cmd.setDraftBodyMd(draftBodyMd);
        cmd.setCoverCaption(coverCaption);

        return articleService.adminCreate(cmd, action, finalCoverUrl);
    }
```

Note: this also switches from the positional `new ArticleDraftSaveCmd(...)` to setter-based construction for clarity. Since the cmd uses Lombok `@NoArgsConstructor`, this works.

- [ ] **Step 2: `adminUpdateMultipart` — add same two params and wire through**

Replace signature (add `draftBodyMd`, `coverCaption` after `draftJson`) and add two setter calls to the existing `cmd` build:

```java
        cmd.setDraftBodyMd(draftBodyMd);
        cmd.setCoverCaption(coverCaption);
```

- [ ] **Step 3: Compile adapter**

```bash
cd sealpi-blog && ./mvnw -q compile -pl blog-adapter -am
```

Expected: BUILD SUCCESS.

- [ ] **Step 4: Commit**

```bash
git add sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/article/ArticleAdminController.java
git commit -m "feat(adapter): accept draftBodyMd and coverCaption in admin multipart endpoints"
```

---

### Task 8: Add adapter integration test (multipart field capture)

**Files:**
- Modify: `sealpi-blog/blog-adapter/src/test/java/com/seal/blog/adapter/BlogAdapterApplicationTests.java`

- [ ] **Step 1: Add imports**

Add after existing imports:

```java
import com.seal.blog.client.article.dto.cmd.ArticleDraftSaveCmd;
import org.mockito.ArgumentCaptor;
```

- [ ] **Step 2: Write the test (FAIL first)**

Insert after the `adminApi_withoutPreviewImage_doesNotUploadCover` test:

```java
    @Test
    void adminCreateMultipart_forwardsDraftBodyMdAndCoverCaption() throws Exception {
        when(articleService.adminCreate(any(), anyString(), any())).thenReturn(Response.buildSuccess());

        mvc.perform(
                multipart("/api/v1/admin/articles")
                        .header("Authorization", bearerToken("123"))
                        .param("title", "t")
                        .param("url", "u")
                        .param("draftJson", "{}")
                        .param("draftBodyMd", "# Hello\n\n:::note\nsidenote\n:::")
                        .param("coverCaption", "图示：架构")
                        .param("action", "draft")
        ).andExpect(status().isOk());

        ArgumentCaptor<ArticleDraftSaveCmd> cmdCaptor = ArgumentCaptor.forClass(ArticleDraftSaveCmd.class);
        verify(articleService).adminCreate(cmdCaptor.capture(), anyString(), any());
        ArticleDraftSaveCmd captured = cmdCaptor.getValue();
        org.assertj.core.api.Assertions.assertThat(captured.getDraftBodyMd()).isEqualTo("# Hello\n\n:::note\nsidenote\n:::");
        org.assertj.core.api.Assertions.assertThat(captured.getCoverCaption()).isEqualTo("图示：架构");
    }
```

- [ ] **Step 3: Run the test**

```bash
cd sealpi-blog && ./mvnw -q test -pl blog-adapter -Dtest=BlogAdapterApplicationTests#adminCreateMultipart_forwardsDraftBodyMdAndCoverCaption
```

Expected: PASS (Tasks 2–7 already wired the behavior; this is verification of the integration).

- [ ] **Step 4: Commit**

```bash
git add sealpi-blog/blog-adapter/src/test/java/com/seal/blog/adapter/BlogAdapterApplicationTests.java
git commit -m "test(adapter): verify workbook fields are captured by admin controller"
```

---

### Task 9: Add service-layer tests for publishFromDraft copy + 120KB boundary

**Files:**
- Modify: `sealpi-blog/blog-app/src/test/java/com/seal/blog/app/service/ArticleServiceImplTest.java`

- [ ] **Step 1: Read the file first to confirm test pattern**

```bash
# (Read this file — it uses Mockito with ArticleGateway mock. Confirm the test pattern matches your existing cases.)
```

Then write these three tests:

- [ ] **Step 2: Draft path — draftBodyMd persisted, bodyMd null**

```java
    @Test
    void adminCreate_draft_persistsDraftBodyMdOnly() {
        ArticleDraftSaveCmd cmd = new ArticleDraftSaveCmd("t", null, "u", "{}");
        cmd.setDraftBodyMd("# draft body");
        cmd.setCoverCaption("cap");
        when(articleGateway.findBySlug("u")).thenReturn(null);

        service.adminCreate(cmd, "draft", null);

        ArgumentCaptor<Article> captor = ArgumentCaptor.forClass(Article.class);
        verify(articleGateway).save(captor.capture());
        Article saved = captor.getValue();
        assertThat(saved.getDraftBodyMd()).isEqualTo("# draft body");
        assertThat(saved.getBodyMd()).isNull();
        assertThat(saved.getCoverCaption()).isEqualTo("cap");
    }
```

- [ ] **Step 3: Publish path — bodyMd == draftBodyMd after publishFromDraft**

```java
    @Test
    void adminCreate_publish_copiesDraftBodyMdToBodyMd() {
        ArticleDraftSaveCmd cmd = new ArticleDraftSaveCmd("t", null, "u", "{}");
        cmd.setDraftBodyMd("# published body");
        when(articleGateway.findBySlug("u")).thenReturn(null);

        service.adminCreate(cmd, "publish", null);

        ArgumentCaptor<Article> captor = ArgumentCaptor.forClass(Article.class);
        verify(articleGateway).save(captor.capture());
        Article saved = captor.getValue();
        assertThat(saved.getBodyMd()).isEqualTo("# published body");
        assertThat(saved.getDraftBodyMd()).isEqualTo("# published body");
    }
```

- [ ] **Step 4: Boundary — 120KB body not truncated**

```java
    @Test
    void adminCreate_draft_handlesLargeBodyMd() {
        String big = "x".repeat(120_000);
        ArticleDraftSaveCmd cmd = new ArticleDraftSaveCmd("t", null, "u", "{}");
        cmd.setDraftBodyMd(big);
        when(articleGateway.findBySlug("u")).thenReturn(null);

        service.adminCreate(cmd, "draft", null);

        ArgumentCaptor<Article> captor = ArgumentCaptor.forClass(Article.class);
        verify(articleGateway).save(captor.capture());
        assertThat(captor.getValue().getDraftBodyMd()).hasSize(120_000);
    }
```

- [ ] **Step 5: Run the tests**

```bash
cd sealpi-blog && ./mvnw -q test -pl blog-app -Dtest=ArticleServiceImplTest
```

Expected: all three tests PASS.

- [ ] **Step 6: Commit**

```bash
git add sealpi-blog/blog-app/src/test/java/com/seal/blog/app/service/ArticleServiceImplTest.java
git commit -m "test(app): cover publishFromDraft body copy and 120KB body boundary"
```

---

### Task 10: Frontend type additions

**Files:**
- Modify: `tailwind-nextjs-starter-blog-sealpi/lib/blog-api-types.ts`
- Modify: `tailwind-nextjs-starter-blog-sealpi/lib/admin-api.ts`

- [ ] **Step 1: Extend `AdminArticle` type**

In `lib/blog-api-types.ts`, add to the `AdminArticle` type:

```typescript
  bodyMd?: string
  draftBodyMd?: string
  coverCaption?: string
```

- [ ] **Step 2: Extend `AdminArticleFormPayload`**

In `lib/admin-api.ts`, extend the exported type:

```typescript
export type AdminArticleFormPayload = {
  title: string
  url: string
  draftJson: string
  summary?: string
  coverImageUrl?: string
  previewImage?: Blob | null
  draftBodyMd?: string
  coverCaption?: string
}
```

- [ ] **Step 3: Wire into `toArticleFormData`**

Append before the `previewImage` block:

```typescript
  appendIfPresent(formData, 'draftBodyMd', payload.draftBodyMd)
  appendIfPresent(formData, 'coverCaption', payload.coverCaption)
```

- [ ] **Step 4: Typecheck**

```bash
cd tailwind-nextjs-starter-blog-sealpi && npx next lint --dir lib
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add tailwind-nextjs-starter-blog-sealpi/lib/blog-api-types.ts tailwind-nextjs-starter-blog-sealpi/lib/admin-api.ts
git commit -m "feat(frontend): add workbook fields to admin API types"
```

---

### Task 11: Register Workbook fonts via next/font

**Files:**
- Modify: `tailwind-nextjs-starter-blog-sealpi/app/layout.tsx`

- [ ] **Step 1: Import the four fonts**

Replace the existing `Space_Grotesk` import line with:

```tsx
import { Space_Grotesk, Fraunces, Inter, Caveat, Geist_Mono } from 'next/font/google'
```

- [ ] **Step 2: Instantiate the fonts with variable names**

Replace the existing `space_grotesk` const block with:

```tsx
const space_grotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces-loaded',
  style: ['normal', 'italic'],
  axes: ['opsz'],
})

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter-loaded',
})

const caveat = Caveat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-caveat-loaded',
  weight: ['400', '600', '700'],
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-mono-loaded',
})
```

- [ ] **Step 3: Add variables to `<html>` className**

Replace the existing `className={`${space_grotesk.variable} scroll-smooth`}` with:

```tsx
      className={`${space_grotesk.variable} ${fraunces.variable} ${inter.variable} ${caveat.variable} ${geistMono.variable} scroll-smooth`}
```

- [ ] **Step 4: Build to verify**

```bash
cd tailwind-nextjs-starter-blog-sealpi && npx next build
```

Expected: build succeeds; fonts downloaded at build time.

- [ ] **Step 5: Commit**

```bash
git add tailwind-nextjs-starter-blog-sealpi/app/layout.tsx
git commit -m "feat(frontend): load Fraunces/Inter/Caveat/Geist Mono via next/font"
```

---

### Task 12: Register Workbook Tailwind v4 tokens

**Files:**
- Modify: `tailwind-nextjs-starter-blog-sealpi/css/tailwind.css`

- [ ] **Step 1: Append to the `@theme` block**

Inside the existing `@theme { ... }` block (before the closing `}` around line 56), add:

```css
  /* === Workbook tokens === */
  --color-wb-paper: #f5ece1;
  --color-wb-canvas: #fbf5ec;
  --color-wb-ink: #1f1a15;
  --color-wb-ink-soft: #2a241e;
  --color-wb-meta: #7d6955;
  --color-wb-accent: #a6582b;
  --color-wb-rule: #c9b597;
  --color-wb-rule-soft: #ded7cc;
  --color-wb-card-shadow: #e6d6bd;

  --font-fraunces: var(--font-fraunces-loaded), 'Times New Roman', serif;
  --font-caveat: var(--font-caveat-loaded), cursive;
  --font-geist-mono: var(--font-geist-mono-loaded), ui-monospace, monospace;
  --font-inter: var(--font-inter-loaded), system-ui, sans-serif;

  --duration-micro: 150ms;
  --duration-ui: 250ms;
  --duration-reveal: 400ms;
  --duration-page: 600ms;
```

- [ ] **Step 2: Build to verify tokens generate utilities**

```bash
cd tailwind-nextjs-starter-blog-sealpi && npx next build
```

Expected: build succeeds; `bg-wb-paper`, `font-fraunces`, `duration-reveal` available as utility classes.

- [ ] **Step 3: Commit**

```bash
git add tailwind-nextjs-starter-blog-sealpi/css/tailwind.css
git commit -m "feat(frontend): register Workbook color/font/motion tokens in @theme"
```

---

### Task 13: Create `lib/workbook/tokens.ts`

**Files:**
- Create: `tailwind-nextjs-starter-blog-sealpi/lib/workbook/tokens.ts`

- [ ] **Step 1: Write the file**

```typescript
/**
 * Workbook motion constants for JS-side consumers (Framer Motion, JS animation).
 * Color/font tokens live in css/tailwind.css @theme — consume via Tailwind utility classes.
 */
export const wbMotion = {
  micro: 150,
  ui: 250,
  reveal: 400,
  page: 600,
  ease: [0.2, 0.8, 0.2, 1] as const,
} as const

export const wbEase = 'cubic-bezier(.2,.8,.2,1)'
```

- [ ] **Step 2: Commit**

```bash
git add tailwind-nextjs-starter-blog-sealpi/lib/workbook/tokens.ts
git commit -m "feat(frontend): add wbMotion tokens for JS-side consumers"
```

---

## Phase 1.5 · Admin Route Pruning (parallel with Phase 1)

Small, pre-approved cleanup. Can run anywhere after Task 13; no dependencies with Workbook work.

### Task 14: Collapse admin sidebar to 5 items

**Files:**
- Modify: `tailwind-nextjs-starter-blog-sealpi/components/admin/AdminSidebar.tsx`

- [ ] **Step 1: Update `navItems` array**

Replace the existing `navItems` array with:

```tsx
const navItems = [
  { href: '/admin', label: '仪表盘' },
  { href: '/admin/ops', label: '运维' },
  { href: '/admin/editor', label: '新建' },
  { href: '/admin/articles', label: '文章管理' },
  { href: '/admin/drafts', label: '草稿箱' },
]
```

- [ ] **Step 2: Commit (see Task 16 for combined commit after ops page exists)**

Hold this change until Task 15 creates the placeholder page, then commit together.

---

### Task 15: Create `/admin/ops` placeholder page

**Files:**
- Create: `tailwind-nextjs-starter-blog-sealpi/app/admin/ops/page.tsx`

- [ ] **Step 1: Write the placeholder**

```tsx
export const metadata = { title: '运维' }

export default function OpsPage() {
  return (
    <section className="space-y-4">
      <div className="rounded-[2rem] border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-950">
        <p className="text-xs tracking-[0.24em] text-gray-500 uppercase dark:text-gray-400">
          运维
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-950 dark:text-gray-50">
          运维控制台
        </h1>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          站点健康检查、日志查看、MinIO / MySQL 管理入口将在此汇总。当前为占位页，逐步接入中。
        </p>
      </div>
    </section>
  )
}
```

---

### Task 16: Delete `/admin/login/page.tsx` and AdminShell login branch

**Files:**
- Delete: `tailwind-nextjs-starter-blog-sealpi/app/admin/login/page.tsx`
- Modify: `tailwind-nextjs-starter-blog-sealpi/components/admin/AdminShell.tsx` (remove any `isLoginPage` / `pathname === '/admin/login'` branch — middleware now handles unauth'd redirects to `/login`)
- Modify: `tailwind-nextjs-starter-blog-sealpi/app/admin/drafts/page.tsx` (remove "返回后台首页" button if present — sidebar already has 仪表盘 link)

- [ ] **Step 1: Delete the login page**

```bash
rm tailwind-nextjs-starter-blog-sealpi/app/admin/login/page.tsx
```

- [ ] **Step 2: Grep AdminShell for login-related branches**

Read `AdminShell.tsx`, remove any conditional rendering branch that hides sidebar/topbar when pathname is `/admin/login`. The pattern to remove is typically a ternary or early return keyed on `pathname === '/admin/login'`.

- [ ] **Step 3: Grep drafts/page.tsx for "返回后台首页" button**

Read the drafts page, locate and remove the button + its handler (typically a `<Link href="/admin">` with text "返回后台首页" or similar).

- [ ] **Step 4: Build + lint**

```bash
cd tailwind-nextjs-starter-blog-sealpi && npx next lint --dir app --dir components && npx next build
```

Expected: builds and passes lint.

- [ ] **Step 5: Single commit for Phase 1.5**

```bash
git add tailwind-nextjs-starter-blog-sealpi/components/admin/AdminSidebar.tsx \
        tailwind-nextjs-starter-blog-sealpi/app/admin/ops/page.tsx \
        tailwind-nextjs-starter-blog-sealpi/app/admin/login/page.tsx \
        tailwind-nextjs-starter-blog-sealpi/components/admin/AdminShell.tsx \
        tailwind-nextjs-starter-blog-sealpi/app/admin/drafts/page.tsx
git commit -m "refactor(admin): collapse nav to 5 items, drop /admin/login and redundant buttons"
```

---

## Phase 2 · Workbook Article Page

Phase 2 replaces the article detail page with the new Workbook layout. Requires Phase 1 tokens + fonts.

### Task 17: Install Markdown render dependencies

**Files:**
- Modify: `tailwind-nextjs-starter-blog-sealpi/package.json` (via npm install)

- [ ] **Step 1: Install**

```bash
cd tailwind-nextjs-starter-blog-sealpi && npm install react-markdown remark-gfm remark-directive rehype-highlight rehype-slug mdast-util-directive
```

- [ ] **Step 2: Commit**

```bash
git add tailwind-nextjs-starter-blog-sealpi/package.json tailwind-nextjs-starter-blog-sealpi/package-lock.json
git commit -m "chore(frontend): add markdown + directive deps for workbook body"
```

---

### Task 18: Create `MarginNote` component

**Files:**
- Create: `tailwind-nextjs-starter-blog-sealpi/components/workbook/MarginNote.tsx`

- [ ] **Step 1: Write the file**

```tsx
import type { ReactNode } from 'react'

type MarginNoteProps = {
  children: ReactNode
}

export default function MarginNote({ children }: MarginNoteProps) {
  return (
    <aside className="relative my-8 ml-3 border-l-2 border-dashed border-wb-rule py-1 pr-0 pl-5">
      <span
        className="inline-block font-caveat text-[22px] leading-snug text-wb-accent"
        style={{ transform: 'rotate(-0.5deg)' }}
      >
        <span className="opacity-70">← </span>
        {children}
      </span>
    </aside>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add tailwind-nextjs-starter-blog-sealpi/components/workbook/MarginNote.tsx
git commit -m "feat(workbook): add MarginNote component (:::note render target)"
```

---

### Task 19: Create `BodyMarkdown` with `:::note` directive plugin

**Files:**
- Create: `tailwind-nextjs-starter-blog-sealpi/components/workbook/BodyMarkdown.tsx`

- [ ] **Step 1: Write the component**

```tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkDirective from 'remark-directive'
import rehypeSlug from 'rehype-slug'
import rehypeHighlight from 'rehype-highlight'
import { visit } from 'unist-util-visit'
import type { Plugin } from 'unified'
import type { Root } from 'mdast'
import MarginNote from './MarginNote'

/**
 * remark-directive emits containerDirective/leafDirective/textDirective nodes.
 * We transform `:::note` (container) into a custom hast element `<margin-note>` so
 * react-markdown's `components` map can render it as our React component.
 */
const remarkNoteDirective: Plugin<[], Root> = () => (tree) => {
  visit(tree, (node) => {
    if (node.type === 'containerDirective' && node.name === 'note') {
      const data = node.data || (node.data = {})
      data.hName = 'margin-note'
      data.hProperties = {}
    }
  })
}

type BodyMarkdownProps = {
  markdown: string
}

export default function BodyMarkdown({ markdown }: BodyMarkdownProps) {
  return (
    <div className="wb-body max-w-[64ch] font-fraunces text-[18px] leading-[1.75] text-wb-ink-soft">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkDirective, remarkNoteDirective]}
        rehypePlugins={[rehypeSlug, rehypeHighlight]}
        components={{
          'margin-note': ({ children }) => <MarginNote>{children}</MarginNote>,
        } as never}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
```

- [ ] **Step 2: Add drop-cap CSS to `css/tailwind.css` after the `@theme` block**

```css
.wb-body > p:first-of-type::first-letter {
  font-family: var(--font-fraunces);
  font-size: 48px;
  font-weight: 500;
  font-style: italic;
  float: left;
  line-height: 0.92;
  margin: 4px 6px 0 0;
  color: var(--color-wb-accent);
}
```

- [ ] **Step 3: Commit**

```bash
git add tailwind-nextjs-starter-blog-sealpi/components/workbook/BodyMarkdown.tsx \
        tailwind-nextjs-starter-blog-sealpi/css/tailwind.css
git commit -m "feat(workbook): BodyMarkdown with :::note directive and drop cap"
```

---

### Task 20: Create `ExcalidrawHero` (SSR img + client viewer)

**Files:**
- Create: `tailwind-nextjs-starter-blog-sealpi/components/workbook/ExcalidrawHero.tsx`

- [ ] **Step 1: Write the component (reuses existing `ExcalidrawViewer` for client-side hydration)**

```tsx
import ExcalidrawViewer from '@/components/ExcalidrawViewer'

type ExcalidrawHeroProps = {
  contentJson?: string
  coverImageUrl?: string
  coverCaption?: string
  title: string
}

export default function ExcalidrawHero({
  contentJson,
  coverImageUrl,
  coverCaption,
  title,
}: ExcalidrawHeroProps) {
  return (
    <div className="relative mb-10">
      <div
        className="relative flex aspect-video items-center justify-center overflow-hidden rounded-[10px] border border-wb-rule bg-wb-canvas"
        style={{ boxShadow: '3px 4px 0 var(--color-wb-card-shadow)' }}
      >
        {contentJson ? (
          <ExcalidrawViewer contentJson={contentJson} title={title} />
        ) : coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverImageUrl} alt={title} className="h-[88%] w-[88%] object-contain" />
        ) : null}
      </div>
      {coverCaption ? (
        <span
          className="absolute -bottom-6 left-3 font-caveat text-[16px] text-wb-accent"
          style={{ transform: 'rotate(-1deg)' }}
        >
          {coverCaption}
        </span>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add tailwind-nextjs-starter-blog-sealpi/components/workbook/ExcalidrawHero.tsx
git commit -m "feat(workbook): ExcalidrawHero with caption"
```

---

### Task 21: Create `WbDivider` and `WbMeta`

**Files:**
- Create: `tailwind-nextjs-starter-blog-sealpi/components/workbook/WbDivider.tsx`
- Create: `tailwind-nextjs-starter-blog-sealpi/components/workbook/WbMeta.tsx`

- [ ] **Step 1: Write `WbDivider.tsx`**

```tsx
export default function WbDivider() {
  return (
    <div className="mb-8 text-wb-accent opacity-60">
      <svg viewBox="0 0 120 16" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="block h-4 w-[120px]">
        <path d="M2 8 Q 10 3 20 8 T 40 8 T 60 8 T 80 8 T 100 8 T 118 8" />
      </svg>
    </div>
  )
}
```

- [ ] **Step 2: Write `WbMeta.tsx`**

```tsx
type WbMetaProps = {
  date: string
  readMinutes?: number
  tags?: string[]
}

export default function WbMeta({ date, readMinutes, tags = [] }: WbMetaProps) {
  return (
    <div className="mb-7 flex flex-wrap items-center gap-3.5 font-inter text-[13px] text-wb-meta">
      <span>{date}</span>
      {readMinutes != null ? (
        <>
          <span className="opacity-40">·</span>
          <span>{readMinutes} min read</span>
        </>
      ) : null}
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded border border-wb-rule px-2.5 py-0.5 font-geist-mono text-[11.5px] text-[#8a6a48]"
        >
          #{tag}
        </span>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add tailwind-nextjs-starter-blog-sealpi/components/workbook/WbDivider.tsx \
        tailwind-nextjs-starter-blog-sealpi/components/workbook/WbMeta.tsx
git commit -m "feat(workbook): WbDivider (squiggle) and WbMeta"
```

---

### Task 22: Create `WorkbookArticleLayout`

**Files:**
- Create: `tailwind-nextjs-starter-blog-sealpi/components/workbook/WorkbookArticleLayout.tsx`

- [ ] **Step 1: Write the layout**

```tsx
import type { ReactNode } from 'react'
import ExcalidrawHero from './ExcalidrawHero'
import WbMeta from './WbMeta'
import WbDivider from './WbDivider'
import BodyMarkdown from './BodyMarkdown'

type WorkbookArticleLayoutProps = {
  title: string
  date: string
  tags?: string[]
  readMinutes?: number
  contentJson?: string
  coverImageUrl?: string
  coverCaption?: string
  bodyMd?: string
  eyebrow?: string
  children?: ReactNode
}

export default function WorkbookArticleLayout({
  title,
  date,
  tags,
  readMinutes,
  contentJson,
  coverImageUrl,
  coverCaption,
  bodyMd,
  eyebrow = 'Essay',
  children,
}: WorkbookArticleLayoutProps) {
  return (
    <article className="relative mx-auto my-10 max-w-[820px] rounded-2xl bg-wb-paper px-8 py-12 text-wb-ink-soft md:px-16 md:py-14">
      <p className="mb-5 font-inter text-[11px] font-medium tracking-[0.18em] text-wb-accent uppercase">
        {eyebrow}
      </p>

      <ExcalidrawHero
        contentJson={contentJson}
        coverImageUrl={coverImageUrl}
        coverCaption={coverCaption}
        title={title}
      />

      <h1 className="mt-12 mb-5 font-fraunces text-[48px] leading-[1.08] font-medium text-wb-ink italic tracking-[-0.02em]">
        {title}
      </h1>

      <WbMeta date={date} readMinutes={readMinutes} tags={tags} />
      <WbDivider />

      {bodyMd ? <BodyMarkdown markdown={bodyMd} /> : null}

      {children}
    </article>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add tailwind-nextjs-starter-blog-sealpi/components/workbook/WorkbookArticleLayout.tsx
git commit -m "feat(workbook): WorkbookArticleLayout composition"
```

---

### Task 23: Create `useReveal` hook

**Files:**
- Create: `tailwind-nextjs-starter-blog-sealpi/hooks/useReveal.ts`

- [ ] **Step 1: Write the hook**

```tsx
'use client'

import { useEffect } from 'react'

/**
 * Attaches a single IntersectionObserver that reveals elements marked
 * [data-reveal]. Start state (CSS): opacity-[0.35] blur-[8px]. On intersect,
 * the `data-revealed` attribute is set; CSS transitions to final state.
 *
 * Respects prefers-reduced-motion by skipping the observer entirely.
 */
export default function useReveal() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const targets = document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-revealed])')

    if (prefersReduced) {
      targets.forEach((el) => el.setAttribute('data-revealed', 'true'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-revealed', 'true')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15 }
    )

    targets.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}
```

- [ ] **Step 2: Add global CSS for reveal animation**

Append to `css/tailwind.css`:

```css
[data-reveal] {
  opacity: 0.35;
  filter: blur(8px);
  transition:
    opacity var(--duration-reveal) cubic-bezier(0.2, 0.8, 0.2, 1),
    filter var(--duration-reveal) cubic-bezier(0.2, 0.8, 0.2, 1);
}
[data-reveal][data-revealed='true'] {
  opacity: 1;
  filter: blur(0);
}
@media (prefers-reduced-motion: reduce) {
  [data-reveal] {
    opacity: 1;
    filter: none;
    transition: none;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add tailwind-nextjs-starter-blog-sealpi/hooks/useReveal.ts \
        tailwind-nextjs-starter-blog-sealpi/css/tailwind.css
git commit -m "feat(workbook): useReveal hook + data-reveal CSS"
```

---

### Task 24: Switch `/blog/[...slug]` to WorkbookArticleLayout

**Files:**
- Modify: `tailwind-nextjs-starter-blog-sealpi/app/blog/[...slug]/page.tsx`

- [ ] **Step 1: Replace `DynamicPostLayout` usage**

Replace the entire `return` block (lines 140–183) with:

```tsx
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <WorkbookArticleLayout
        title={article.title}
        date={new Date(date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
        tags={
          article.tags
            ?.map((tag) => tag.name)
            .filter((name): name is string => Boolean(name)) || []
        }
        readMinutes={undefined}
        contentJson={article.contentJson || article.draftJson}
        coverImageUrl={article.coverImageUrl}
        coverCaption={article.coverCaption}
        bodyMd={article.bodyMd}
      />
      {/* TODO: reintroduce prev/next nav once Workbook has its own footer component.
          Previously routed via DynamicPostLayout; intentionally omitted for v1 per spec. */}
    </>
  )
```

- [ ] **Step 2: Update imports — remove `DynamicPostLayout`, add `WorkbookArticleLayout`**

At the top of the file, remove:

```tsx
import DynamicPostLayout from '@/layouts/DynamicPostLayout'
import ExcalidrawViewer from '@/components/ExcalidrawViewer'
```

Add:

```tsx
import WorkbookArticleLayout from '@/components/workbook/WorkbookArticleLayout'
```

Also remove the unused `prev`/`next` computation since we drop prev/next for v1.

- [ ] **Step 3: Build**

```bash
cd tailwind-nextjs-starter-blog-sealpi && npx next build
```

Expected: build succeeds. Visit a published article locally to confirm Workbook rendering.

- [ ] **Step 4: Commit**

```bash
git add tailwind-nextjs-starter-blog-sealpi/app/blog/[...slug]/page.tsx
git commit -m "feat(blog): render articles with WorkbookArticleLayout"
```

---

## Phase 3 · Admin Editor + Preview

### Task 25: Add `bodyMd` + `coverCaption` inputs to AdminEditorClient

**Files:**
- Modify: `tailwind-nextjs-starter-blog-sealpi/components/admin/AdminEditorClient.tsx`

This task requires reading the existing component first — its form state/submit logic must be preserved. Below are the minimal surgical changes.

- [ ] **Step 1: Extend `EditorState` type**

Locate the `type EditorState` declaration (around line 58) and add two fields:

```tsx
type EditorState = {
  title: string
  url: string
  summary: string
  coverImageUrl: string
  draftBodyMd: string
  coverCaption: string
}
```

- [ ] **Step 2: Initialize new state fields**

Find the `useState<EditorState>` initializer; include the new fields from `article?.draftBodyMd`, `article?.coverCaption` (defaulting to `''`).

- [ ] **Step 3: Include new fields in submit payload**

Find where `createAdminArticle` / `updateAdminArticle` is called. Extend the `AdminArticleFormPayload` object:

```tsx
{
  title: state.title,
  url: state.url,
  draftJson,
  summary: state.summary || undefined,
  coverImageUrl: state.coverImageUrl || undefined,
  previewImage,
  draftBodyMd: state.draftBodyMd || undefined,
  coverCaption: state.coverCaption || undefined,
}
```

- [ ] **Step 4: Render two new inputs below the Excalidraw canvas**

At the end of the editor JSX (after the Excalidraw canvas, before the close of the editor section), insert:

```tsx
<div className="mt-4 space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
  <label className="block">
    <span className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase">
      画布注释（Caveat 手写体显示）
    </span>
    <input
      type="text"
      value={state.coverCaption}
      onChange={(e) => setState((prev) => ({ ...prev, coverCaption: e.target.value }))}
      maxLength={200}
      placeholder="例：DDD 分层一张图就够了"
      className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
    />
  </label>
  <label className="block">
    <span className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase">
      Markdown 正文
    </span>
    <textarea
      value={state.draftBodyMd}
      onChange={(e) => setState((prev) => ({ ...prev, draftBodyMd: e.target.value }))}
      placeholder={'# 正文\n\n支持 Markdown，:::note 块会渲染为手写批注。'}
      className="mt-1 min-h-[200px] w-full resize-y rounded border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-700 dark:bg-gray-900"
    />
  </label>
</div>
```

- [ ] **Step 5: Build**

```bash
cd tailwind-nextjs-starter-blog-sealpi && npx next build
```

Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add tailwind-nextjs-starter-blog-sealpi/components/admin/AdminEditorClient.tsx
git commit -m "feat(admin): add Markdown body + cover caption inputs to editor"
```

---

### Task 26: Create `/admin/preview/[id]` route

**Files:**
- Create: `tailwind-nextjs-starter-blog-sealpi/app/admin/preview/[id]/page.tsx`

Note: `/admin/*` is already protected by `middleware.ts`, so this route inherits admin gating.

- [ ] **Step 1: Write the preview page (RSC)**

```tsx
import { notFound } from 'next/navigation'
import WorkbookArticleLayout from '@/components/workbook/WorkbookArticleLayout'
import { buildApiUrl } from '@/lib/api-config'
import type { AdminArticle, ApiResult } from '@/lib/blog-api-types'
import { proxyAdminRequest } from '@/app/api/admin/_utils'

type PreviewPageProps = {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

async function fetchArticleForPreview(id: string): Promise<AdminArticle | null> {
  const response = await proxyAdminRequest(`/api/v1/articles/${id}`, 'GET')
  if (!response || !response.ok) return null
  const payload = (await response.json()) as ApiResult<AdminArticle>
  return payload.data || null
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { id } = await params
  const article = await fetchArticleForPreview(id)
  if (!article) return notFound()

  return (
    <WorkbookArticleLayout
      title={article.title || '（无标题草稿）'}
      date={new Date(article.date || Date.now()).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}
      tags={article.tags?.map((t) => t.name).filter((n): n is string => Boolean(n)) || []}
      contentJson={article.draftJson || article.contentJson}
      coverImageUrl={article.coverImageUrl}
      coverCaption={article.coverCaption}
      bodyMd={article.draftBodyMd || article.bodyMd}
      eyebrow="Draft preview"
    />
  )
}
```

- [ ] **Step 2: Build**

```bash
cd tailwind-nextjs-starter-blog-sealpi && npx next build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add tailwind-nextjs-starter-blog-sealpi/app/admin/preview/[id]/page.tsx
git commit -m "feat(admin): add /admin/preview/[id] draft workbook preview"
```

---

## Final Verification

### Task 27: Full-stack integration check

- [ ] **Step 1: Backend tests**

```bash
cd sealpi-blog && ./mvnw -q test
```

Expected: all tests PASS.

- [ ] **Step 2: Frontend build + lint**

```bash
cd tailwind-nextjs-starter-blog-sealpi && npx next lint --dir app --dir components --dir lib --dir layouts && npx next build
```

Expected: lint clean, build succeeds.

- [ ] **Step 3: Smoke test locally**

```powershell
# From project root
.\start-local-test.ps1
```

Checklist:
- [ ] Visit `http://localhost:13311/blog/<existing-slug>` — renders in Workbook style; no body_md for legacy posts (正文区不渲染)
- [ ] Log in as admin → `/admin/editor` for a new article → enter title/url/Excalidraw/caption/`draftBodyMd` → save draft → 200 OK
- [ ] Visit `/admin/preview/<articleId>` — shows Workbook draft preview with caption + Markdown body
- [ ] Publish → visit `/blog/<url>` — now shows published bodyMd
- [ ] Sidebar shows 5 items: 仪表盘 / 运维 / 新建 / 文章管理 / 草稿箱

- [ ] **Step 4: Final commit of any lint/typo fixups discovered during smoke**

```bash
git commit -am "chore: workbook refresh final fixups"
```

---

## Out of Scope (explicitly NOT in this plan)

- Mobile responsive layout (V1.5)
- Live Markdown preview inside AdminEditorClient (V1.5)
- `pretext` library integration (future)
- Turbopack performance optimization (separate task)
- `allowLegacyJwt` dead field fix (separate bug fix)
- RSS feed rendering of `body_md` (separate, small task; text-mode Markdown → plain excerpt)
