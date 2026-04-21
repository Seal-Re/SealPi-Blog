package com.seal.blog.domain.article.model;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Pure unit tests for the Article domain model — no Spring context required.
 */
class ArticleTest {

    private Article newArticle() {
        return new Article("My Title", "A summary", "my-title");
    }

    // -----------------------------------------------------------------------
    // Constructor validation
    // -----------------------------------------------------------------------

    @Test
    void constructor_nullTitle_throwsIllegalArgument() {
        assertThatThrownBy(() -> new Article(null, "summary", "url"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("标题不能为空");
    }

    @Test
    void constructor_blankTitle_throwsIllegalArgument() {
        assertThatThrownBy(() -> new Article("   ", "summary", "url"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void constructor_setsInitialStatusToDraft() {
        Article a = newArticle();
        assertThat(a.getDraft()).isEqualTo(ArticleStatus.DRAFT);
    }

    @Test
    void constructor_setsInitialViewCountToZero() {
        Article a = newArticle();
        assertThat(a.getViewCount()).isEqualTo(0);
    }

    // -----------------------------------------------------------------------
    // saveDraft
    // -----------------------------------------------------------------------

    @Test
    void saveDraft_nullCoverImageUrl_doesNotOverwriteExisting() {
        Article a = newArticle();
        a.saveDraft("{}", "https://existing.png", null, null);

        // Null coverImageUrl on second call must not clear the value set by first call
        a.saveDraft("{updated}", null, null, null);

        assertThat(a.getCoverImageUrl()).isEqualTo("https://existing.png");
    }

    @Test
    void saveDraft_blankCoverImageUrl_doesNotOverwriteExisting() {
        Article a = newArticle();
        a.saveDraft("{}", "https://existing.png", null, null);
        a.saveDraft("{}", "   ", null, null);

        assertThat(a.getCoverImageUrl()).isEqualTo("https://existing.png");
    }

    @Test
    void saveDraft_nonBlankCoverImageUrl_overwrites() {
        Article a = newArticle();
        a.saveDraft("{}", "https://first.png", null, null);
        a.saveDraft("{}", "https://second.png", null, null);

        assertThat(a.getCoverImageUrl()).isEqualTo("https://second.png");
    }

    @Test
    void saveDraft_nullCoverCaption_doesNotOverwriteExisting() {
        Article a = newArticle();
        a.saveDraft("{}", null, null, "My Caption");
        a.saveDraft("{}", null, null, null);

        assertThat(a.getCoverCaption()).isEqualTo("My Caption");
    }

    @Test
    void saveDraft_emptyCoverCaption_overwritesExisting() {
        // null is treated as "no-op" but empty string is an intentional clear
        Article a = newArticle();
        a.saveDraft("{}", null, null, "My Caption");
        a.saveDraft("{}", null, null, "");

        assertThat(a.getCoverCaption()).isEqualTo("");
    }

    @Test
    void saveDraft_setsDraftJson() {
        Article a = newArticle();
        a.saveDraft("{\"el\":[]}", null, null, null);
        assertThat(a.getDraftJson()).isEqualTo("{\"el\":[]}");
    }

    @Test
    void saveDraft_setsDraftBodyMd() {
        Article a = newArticle();
        a.saveDraft("{}", null, "## Hello", null);
        assertThat(a.getDraftBodyMd()).isEqualTo("## Hello");
    }

    // -----------------------------------------------------------------------
    // publishFromDraft
    // -----------------------------------------------------------------------

    @Test
    void publishFromDraft_copiesDraftJsonToContentJson() {
        Article a = newArticle();
        a.saveDraft("{\"el\":[1,2,3]}", null, null, null);
        a.publishFromDraft(null);

        assertThat(a.getContentJson()).isEqualTo("{\"el\":[1,2,3]}");
    }

    @Test
    void publishFromDraft_copiesDraftBodyMdToBodyMd() {
        Article a = newArticle();
        a.saveDraft("{}", null, "## Published Body", null);
        a.publishFromDraft(null);

        assertThat(a.getBodyMd()).isEqualTo("## Published Body");
    }

    @Test
    void publishFromDraft_setsStatusToPublished() {
        Article a = newArticle();
        a.publishFromDraft(null);
        assertThat(a.getDraft()).isEqualTo(ArticleStatus.PUBLISHED);
    }

    @Test
    void publishFromDraft_nullCoverUrl_preservesExistingCoverImageUrl() {
        Article a = newArticle();
        a.saveDraft("{}", "https://cover.png", null, null);
        a.publishFromDraft(null);

        assertThat(a.getCoverImageUrl()).isEqualTo("https://cover.png");
    }

    @Test
    void publishFromDraft_nonBlankCoverUrl_overwritesCoverImageUrl() {
        Article a = newArticle();
        a.saveDraft("{}", "https://old.png", null, null);
        a.publishFromDraft("https://new.png");

        assertThat(a.getCoverImageUrl()).isEqualTo("https://new.png");
    }

    @Test
    void publishFromDraft_blankCoverUrl_preservesExistingCoverImageUrl() {
        Article a = newArticle();
        a.saveDraft("{}", "https://cover.png", null, null);
        a.publishFromDraft("   ");

        assertThat(a.getCoverImageUrl()).isEqualTo("https://cover.png");
    }

    // -----------------------------------------------------------------------
    // offlineToDraft / delete
    // -----------------------------------------------------------------------

    @Test
    void offlineToDraft_setsStatusToDraft() {
        Article a = newArticle();
        a.publishFromDraft(null);
        assertThat(a.getDraft()).isEqualTo(ArticleStatus.PUBLISHED);

        a.offlineToDraft();
        assertThat(a.getDraft()).isEqualTo(ArticleStatus.DRAFT);
    }

    @Test
    void delete_setsStatusToArchived() {
        Article a = newArticle();
        a.delete();
        assertThat(a.getDraft()).isEqualTo(ArticleStatus.ARCHIVED);
    }

    // -----------------------------------------------------------------------
    // assignId
    // -----------------------------------------------------------------------

    @Test
    void assignId_setsIdWhenNull() {
        Article a = newArticle();
        a.assignId(42);
        assertThat(a.getArticleId()).isEqualTo(42);
    }

    @Test
    void assignId_throwsWhenIdAlreadySet() {
        Article a = Article.reconstruct(1, "T", "s", "t", "2026-01-01", "2026-01-01",
                ArticleStatus.DRAFT, 0, null, null, null, 0, null, null, null);
        assertThatThrownBy(() -> a.assignId(2))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("已有id");
    }

    // -----------------------------------------------------------------------
    // modify
    // -----------------------------------------------------------------------

    @Test
    void modify_updatesFieldsAndLastmod() {
        Article a = newArticle();
        a.modify("New Title", "New Summary", "new-slug");

        assertThat(a.getTitle()).isEqualTo("New Title");
        assertThat(a.getSummary()).isEqualTo("New Summary");
        assertThat(a.getUrl()).isEqualTo("new-slug");
    }

    @Test
    void modify_blankTitle_throwsIllegalArgument() {
        Article a = newArticle();
        assertThatThrownBy(() -> a.modify("  ", "summary", "url"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
