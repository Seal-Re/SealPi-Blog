package com.seal.blog.client.article.dto.qry;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

class ArticlePageQryTest {

    @Test
    void resolveDraft_statusDraft_returns0() {
        ArticlePageQry qry = new ArticlePageQry();
        qry.setStatus("draft");
        assertEquals(0, qry.resolveDraft(), "draft should map to code 0 (DRAFT)");
    }

    @Test
    void resolveDraft_statusPublished_returns1() {
        ArticlePageQry qry = new ArticlePageQry();
        qry.setStatus("published");
        assertEquals(1, qry.resolveDraft(), "published should map to code 1 (PUBLISHED)");
    }

    @Test
    void resolveDraft_statusAll_returnsNullWhenDraftFieldNull() {
        ArticlePageQry qry = new ArticlePageQry();
        qry.setStatus("all");
        assertNull(qry.resolveDraft(), "all should fall through to draft field (null)");
    }

    @Test
    void resolveDraft_noStatus_returnsDraftField() {
        ArticlePageQry qry = new ArticlePageQry();
        qry.setDraft(2);
        assertNull(qry.getStatus());
        assertEquals(2, qry.resolveDraft(), "no status should return raw draft field");
    }

    @Test
    void resolveDraft_statusArchived_returns2() {
        ArticlePageQry qry = new ArticlePageQry();
        qry.setStatus("archived");
        assertEquals(2, qry.resolveDraft(), "archived should map to code 2 (ARCHIVED)");
    }

    @Test
    void resolveDraft_statusCaseInsensitive() {
        ArticlePageQry qry = new ArticlePageQry();
        qry.setStatus("DRAFT");
        assertEquals(0, qry.resolveDraft());

        qry.setStatus("Published");
        assertEquals(1, qry.resolveDraft());

        qry.setStatus("ARCHIVED");
        assertEquals(2, qry.resolveDraft());
    }

    @Test
    void resolveKeyword_prefersQ() {
        ArticlePageQry qry = new ArticlePageQry();
        qry.setQ("search term");
        qry.setKeyword("fallback");
        assertEquals("search term", qry.resolveKeyword());
    }

    @Test
    void resolveKeyword_fallsBackToKeyword() {
        ArticlePageQry qry = new ArticlePageQry();
        qry.setKeyword("fallback");
        assertEquals("fallback", qry.resolveKeyword());
    }
}
