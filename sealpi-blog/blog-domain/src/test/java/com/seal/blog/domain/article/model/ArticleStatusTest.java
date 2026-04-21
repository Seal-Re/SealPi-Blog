package com.seal.blog.domain.article.model;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pure unit tests for ArticleStatus.of() — the code→enum lookup utility.
 */
class ArticleStatusTest {

    @Test
    void of_code0_returnsDraft() {
        assertThat(ArticleStatus.of(0)).isEqualTo(ArticleStatus.DRAFT);
    }

    @Test
    void of_code1_returnsPublished() {
        assertThat(ArticleStatus.of(1)).isEqualTo(ArticleStatus.PUBLISHED);
    }

    @Test
    void of_code2_returnsArchived() {
        assertThat(ArticleStatus.of(2)).isEqualTo(ArticleStatus.ARCHIVED);
    }

    @Test
    void of_null_fallsBackToDraft() {
        assertThat(ArticleStatus.of(null)).isEqualTo(ArticleStatus.DRAFT);
    }

    @Test
    void of_unknownCode_fallsBackToDraft() {
        assertThat(ArticleStatus.of(999)).isEqualTo(ArticleStatus.DRAFT);
    }

    @Test
    void of_negativeCode_fallsBackToDraft() {
        assertThat(ArticleStatus.of(-1)).isEqualTo(ArticleStatus.DRAFT);
    }

    @Test
    void getCode_matchesExpectedIntegers() {
        assertThat(ArticleStatus.DRAFT.getCode()).isEqualTo(0);
        assertThat(ArticleStatus.PUBLISHED.getCode()).isEqualTo(1);
        assertThat(ArticleStatus.ARCHIVED.getCode()).isEqualTo(2);
    }
}
