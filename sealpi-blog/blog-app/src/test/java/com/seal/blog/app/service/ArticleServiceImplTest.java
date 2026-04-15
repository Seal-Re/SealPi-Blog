package com.seal.blog.app.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.seal.blog.app.assembler.ArticleAssembler;
import com.seal.blog.client.article.dto.cmd.ArticleDraftSaveCmd;
import com.seal.blog.client.article.dto.cmd.ArticleDraftUpdateCmd;
import com.seal.blog.client.common.Response;
import com.seal.blog.domain.article.gateway.ArticleGateway;
import com.seal.blog.domain.article.model.Article;
import com.seal.blog.domain.article.model.ArticleStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;

@ExtendWith(MockitoExtension.class)
class ArticleServiceImplTest {

    @Mock
    private ArticleAssembler articleAssembler;

    @Mock
    private ArticleGateway articleGateway;

    private ArticleServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new ArticleServiceImpl(articleAssembler, articleGateway);
    }

    @Test
    void adminCreate_draftAction_allowsEmptyTitle() {
        ArticleDraftSaveCmd cmd = new ArticleDraftSaveCmd("", "s", "slug-a", "{}");
        when(articleGateway.findBySlug("slug-a")).thenReturn(null);

        Response result = service.adminCreate(cmd, "draft", null);

        assertTrue(result.isSuccess());
        verify(articleGateway).save(any(Article.class));
    }

    @Test
    void adminCreate_publishAction_rejectsEmptyTitle() {
        ArticleDraftSaveCmd cmd = new ArticleDraftSaveCmd("", "s", "slug-b", "{}");

        Response result = service.adminCreate(cmd, "publish", null);

        assertFalse(result.isSuccess());
        assertEquals("400", result.getErrorCode());
        verify(articleGateway, never()).save(any(Article.class));
    }

    @Test
    void adminOffline_existingArticle_setsDraftStatus() {
        Article article = Article.reconstruct(
                9,
                "title",
                "summary",
                "slug-c",
                "2026-01-01",
                "2026-01-01",
                ArticleStatus.PUBLISHED,
                0,
                "{}",
                "{}",
                null,
                0
        );
        when(articleGateway.findById(9)).thenReturn(article);

        Response result = service.adminOffline(9);

        assertTrue(result.isSuccess());
        assertEquals(ArticleStatus.DRAFT, article.getDraft());
        verify(articleGateway).save(article);
    }

    @Test
    void adminUpdate_publishAction_rejectsEmptyTitle() {
        Article article = Article.reconstruct(
                10,
                "title",
                "summary",
                "slug-d",
                "2026-01-01",
                "2026-01-01",
                ArticleStatus.DRAFT,
                0,
                "{}",
                "{}",
                null,
                0
        );
        when(articleGateway.findById(10)).thenReturn(article);

        ArticleDraftUpdateCmd cmd = new ArticleDraftUpdateCmd(10, "", "s", "slug-d", "{}");
        Response result = service.adminUpdate(cmd, "publish", null);

        assertFalse(result.isSuccess());
        assertEquals("400", result.getErrorCode());
        verify(articleGateway, never()).save(any(Article.class));
    }
}
