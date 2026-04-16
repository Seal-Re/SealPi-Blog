package com.seal.blog.app.service;

import com.seal.blog.app.assembler.ArticleAssembler;
import com.seal.blog.client.article.dto.cmd.ArticleDraftSaveCmd;
import com.seal.blog.client.article.dto.cmd.ArticleDraftUpdateCmd;
import com.seal.blog.client.common.Response;
import com.seal.blog.domain.article.gateway.ArticleGateway;
import com.seal.blog.domain.article.model.Article;
import com.seal.blog.domain.article.model.ArticleStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ArticleServiceImplTest {

    @Mock
    private ArticleAssembler articleAssembler;

    @Mock
    private ArticleGateway articleGateway;

    @InjectMocks
    private ArticleServiceImpl service;

    private void stubGateway() {
        when(articleGateway.findBySlug(anyString())).thenReturn(null);
        doNothing().when(articleGateway).save(any());
    }

    // --- Workbook field tests ---

    @Test
    void adminCreate_draft_persistsDraftBodyMdOnly() {
        stubGateway();
        ArticleDraftSaveCmd cmd = new ArticleDraftSaveCmd();
        cmd.setTitle("test title");
        cmd.setUrl("test-slug");
        cmd.setDraftJson("{}");
        cmd.setDraftBodyMd("# draft body");
        cmd.setCoverCaption("cap");

        service.adminCreate(cmd, "draft", null);

        ArgumentCaptor<Article> captor = ArgumentCaptor.forClass(Article.class);
        verify(articleGateway).save(captor.capture());
        Article saved = captor.getValue();
        assertThat(saved.getDraftBodyMd()).isEqualTo("# draft body");
        assertThat(saved.getBodyMd()).isNull();
        assertThat(saved.getCoverCaption()).isEqualTo("cap");
    }

    @Test
    void adminCreate_publish_copiesDraftBodyMdToBodyMd() {
        stubGateway();
        ArticleDraftSaveCmd cmd = new ArticleDraftSaveCmd();
        cmd.setTitle("test title");
        cmd.setUrl("test-slug-pub");
        cmd.setDraftJson("{}");
        cmd.setDraftBodyMd("# published body");

        service.adminCreate(cmd, "publish", null);

        ArgumentCaptor<Article> captor = ArgumentCaptor.forClass(Article.class);
        verify(articleGateway).save(captor.capture());
        Article saved = captor.getValue();
        assertThat(saved.getBodyMd()).isEqualTo("# published body");
        assertThat(saved.getDraftBodyMd()).isEqualTo("# published body");
    }

    @Test
    void adminCreate_draft_handlesLargeBodyMd() {
        stubGateway();
        String big = "x".repeat(120_000);
        ArticleDraftSaveCmd cmd = new ArticleDraftSaveCmd();
        cmd.setTitle("test title");
        cmd.setUrl("test-slug-large");
        cmd.setDraftJson("{}");
        cmd.setDraftBodyMd(big);

        service.adminCreate(cmd, "draft", null);

        ArgumentCaptor<Article> captor = ArgumentCaptor.forClass(Article.class);
        verify(articleGateway).save(captor.capture());
        assertThat(captor.getValue().getDraftBodyMd()).hasSize(120_000);
    }

    // --- Validation tests ---

    @Test
    void adminCreate_draftAction_allowsEmptyTitle() {
        stubGateway();
        ArticleDraftSaveCmd cmd = new ArticleDraftSaveCmd("", "s", "slug-a", "{}", null, null, null);

        Response result = service.adminCreate(cmd, "draft", null);

        assertTrue(result.isSuccess());
        verify(articleGateway).save(any(Article.class));
    }

    @Test
    void adminCreate_publishAction_rejectsEmptyTitle() {
        ArticleDraftSaveCmd cmd = new ArticleDraftSaveCmd("", "s", "slug-b", "{}", null, null, null);

        Response result = service.adminCreate(cmd, "publish", null);

        assertFalse(result.isSuccess());
        assertEquals("400", result.getErrorCode());
        verify(articleGateway, never()).save(any(Article.class));
    }

    @Test
    void adminOffline_existingArticle_setsDraftStatus() {
        Article article = Article.reconstruct(
                9,
                "title", "summary", "slug-c",
                "2026-01-01", "2026-01-01",
                ArticleStatus.PUBLISHED, 0,
                "{}", "{}",
                null, 0,
                null, null, null
        );
        when(articleGateway.findById(9)).thenReturn(article);

        Response result = service.adminOffline(9);

        assertTrue(result.isSuccess());
        assertEquals(ArticleStatus.DRAFT, article.getDraft());
        verify(articleGateway).save(article);
    }

    // --- incrementViewCount tests ---

    @Test
    void incrementViewCount_nullId_returnsFailure() {
        Response result = service.incrementViewCount(null);

        assertFalse(result.isSuccess());
        assertEquals("400", result.getErrorCode());
        verify(articleGateway, never()).incrementViewCount(any());
    }

    @Test
    void incrementViewCount_zeroId_returnsFailure() {
        Response result = service.incrementViewCount(0);

        assertFalse(result.isSuccess());
        assertEquals("400", result.getErrorCode());
        verify(articleGateway, never()).incrementViewCount(any());
    }

    @Test
    void incrementViewCount_negativeId_returnsFailure() {
        Response result = service.incrementViewCount(-1);

        assertFalse(result.isSuccess());
        assertEquals("400", result.getErrorCode());
        verify(articleGateway, never()).incrementViewCount(any());
    }

    @Test
    void incrementViewCount_validId_callsGatewayAndReturnsSuccess() {
        doNothing().when(articleGateway).incrementViewCount(42);

        Response result = service.incrementViewCount(42);

        assertTrue(result.isSuccess());
        verify(articleGateway).incrementViewCount(42);
    }

    @Test
    void incrementViewCount_gatewayThrows_stillReturnsSuccess() {
        doThrow(new RuntimeException("DB error")).when(articleGateway).incrementViewCount(7);

        Response result = service.incrementViewCount(7);

        assertTrue(result.isSuccess());
    }

    // --- getSingleBySlug tests ---

    @Test
    void getSingleBySlug_existingSlug_doesNotIncrementViewCount() {
        Article article = Article.reconstruct(
                11,
                "title", "summary", "slug-e",
                "2026-01-01", "2026-01-01",
                ArticleStatus.PUBLISHED, 5,
                "{}", "{}",
                null, 0,
                null, null, null
        );
        when(articleGateway.findBySlug("slug-e")).thenReturn(article);
        when(articleAssembler.toVO(article)).thenReturn(new com.seal.blog.client.article.dto.vo.ArticleVO());

        com.seal.blog.client.article.dto.qry.ArticleBySlugQry qry =
                new com.seal.blog.client.article.dto.qry.ArticleBySlugQry();
        qry.setSlug("slug-e");
        service.getSingleBySlug(qry);

        // View count must NOT be incremented during a read-only slug lookup;
        // it is the caller's responsibility to POST /articles/{id}/view explicitly.
        verify(articleGateway, never()).incrementViewCount(any());
    }

    @Test
    void getSingleBySlug_draftArticle_returns404() {
        Article draft = Article.reconstruct(
                12,
                "draft title", "summary", "draft-slug",
                "2026-01-01", "2026-01-01",
                ArticleStatus.DRAFT, 0,
                "{}", "{}",
                null, 0,
                null, null, null
        );
        when(articleGateway.findBySlug("draft-slug")).thenReturn(draft);

        com.seal.blog.client.article.dto.qry.ArticleBySlugQry qry =
                new com.seal.blog.client.article.dto.qry.ArticleBySlugQry();
        qry.setSlug("draft-slug");
        com.seal.blog.client.common.SingleResponse<?> result = service.getSingleBySlug(qry);

        assertFalse(result.isSuccess());
        assertEquals("404", result.getErrorCode());
        verify(articleAssembler, never()).toVO(any());
    }

    @Test
    void getSingleById_draftArticle_returns404() {
        Article draft = Article.reconstruct(
                13,
                "draft title", "summary", "draft-slug-2",
                "2026-01-01", "2026-01-01",
                ArticleStatus.DRAFT, 0,
                "{}", "{}",
                null, 0,
                null, null, null
        );
        when(articleGateway.findById(13)).thenReturn(draft);

        com.seal.blog.client.article.dto.qry.ArticleByIdQry qry =
                new com.seal.blog.client.article.dto.qry.ArticleByIdQry();
        qry.setArticleId(13);
        com.seal.blog.client.common.SingleResponse<?> result = service.getSingleById(qry);

        assertFalse(result.isSuccess());
        assertEquals("404", result.getErrorCode());
        verify(articleAssembler, never()).toVO(any());
    }

    @Test
    void adminUpdate_publishAction_rejectsEmptyTitle() {
        Article article = Article.reconstruct(
                10,
                "title", "summary", "slug-d",
                "2026-01-01", "2026-01-01",
                ArticleStatus.DRAFT, 0,
                "{}", "{}",
                null, 0,
                null, null, null
        );
        when(articleGateway.findById(10)).thenReturn(article);

        ArticleDraftUpdateCmd cmd = new ArticleDraftUpdateCmd(10, "", "s", "slug-d", "{}", null, null, null);
        Response result = service.adminUpdate(cmd, "publish", null);

        assertFalse(result.isSuccess());
        assertEquals("400", result.getErrorCode());
        verify(articleGateway, never()).save(any(Article.class));
    }
}
