package com.seal.blog.app.service;

import com.seal.blog.app.assembler.ArticleAssembler;
import com.seal.blog.client.article.dto.cmd.ArticleCreateCmd;
import com.seal.blog.client.article.dto.cmd.ArticleDraftSaveCmd;
import com.seal.blog.client.article.dto.cmd.ArticleDraftUpdateCmd;
import com.seal.blog.client.article.dto.cmd.ArticleUpdateCmd;
import com.seal.blog.client.article.dto.vo.ArticleAdjacentVO;
import com.seal.blog.client.article.dto.vo.ArticleVO;
import com.seal.blog.client.common.PageResponse;
import com.seal.blog.client.common.Response;
import com.seal.blog.client.common.SingleResponse;
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

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
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
    void getSingleBySlug_archivedArticle_returns404() {
        Article archived = Article.reconstruct(
                15,
                "archived title", "summary", "archived-slug",
                "2026-01-01", "2026-01-01",
                ArticleStatus.ARCHIVED, 0,
                "{}", "{}",
                null, 0,
                null, null, null
        );
        when(articleGateway.findBySlug("archived-slug")).thenReturn(archived);

        com.seal.blog.client.article.dto.qry.ArticleBySlugQry qry =
                new com.seal.blog.client.article.dto.qry.ArticleBySlugQry();
        qry.setSlug("archived-slug");
        com.seal.blog.client.common.SingleResponse<?> result = service.getSingleBySlug(qry);

        assertFalse(result.isSuccess());
        assertEquals("404", result.getErrorCode());
        verify(articleAssembler, never()).toVO(any());
    }

    @Test
    void getSingleById_archivedArticle_returns404() {
        Article archived = Article.reconstruct(
                16,
                "archived title", "summary", "archived-slug-2",
                "2026-01-01", "2026-01-01",
                ArticleStatus.ARCHIVED, 0,
                "{}", "{}",
                null, 0,
                null, null, null
        );
        when(articleGateway.findById(16)).thenReturn(archived);

        com.seal.blog.client.article.dto.qry.ArticleByIdQry qry =
                new com.seal.blog.client.article.dto.qry.ArticleByIdQry();
        qry.setArticleId(16);
        com.seal.blog.client.common.SingleResponse<?> result = service.getSingleById(qry);

        assertFalse(result.isSuccess());
        assertEquals("404", result.getErrorCode());
        verify(articleAssembler, never()).toVO(any());
    }

    @Test
    void getAdjacentBySlug_archivedArticle_returnsEmptyVO() {
        Article archived = Article.reconstruct(
                17, "archived", "s", "archived-adj", "2026-01-01", "2026-01-01",
                ArticleStatus.ARCHIVED, 0, null, null, null, 0, null, null, null);
        when(articleGateway.findBySlug("archived-adj")).thenReturn(archived);

        SingleResponse<ArticleAdjacentVO> result = service.getAdjacentBySlug("archived-adj", null);

        assertTrue(result.isSuccess());
        assertNull(result.getData().getPrev());
        assertNull(result.getData().getNext());
        verify(articleGateway, never()).findPrevPublished(any(), any());
    }

    @Test
    void adminGetSingleById_draftArticle_returnsSuccessWithFullVO() {
        Article draft = Article.reconstruct(
                14,
                "draft title", "summary", "draft-slug-3",
                "2026-01-01", "2026-01-01",
                ArticleStatus.DRAFT, 0,
                "{}", "{}",
                null, 0,
                null, null, null
        );
        when(articleGateway.findById(14)).thenReturn(draft);
        when(articleAssembler.toVO(draft)).thenReturn(new com.seal.blog.client.article.dto.vo.ArticleVO());

        com.seal.blog.client.common.SingleResponse<?> result = service.adminGetSingleById(14);

        assertTrue(result.isSuccess());
        verify(articleAssembler).toVO(draft);
    }

    @Test
    void adminGetSingleById_missingArticle_returns404() {
        when(articleGateway.findById(99)).thenReturn(null);

        com.seal.blog.client.common.SingleResponse<?> result = service.adminGetSingleById(99);

        assertFalse(result.isSuccess());
        assertEquals("404", result.getErrorCode());
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

    @Test
    void adminUpdate_draftAction_persistsDraftBodyMd() {
        Article article = Article.reconstruct(
                15,
                "existing title", "summary", "slug-update",
                "2026-01-01", "2026-01-01",
                ArticleStatus.DRAFT, 0,
                "{}", "{}",
                null, 0,
                null, null, null
        );
        when(articleGateway.findById(15)).thenReturn(article);
        when(articleGateway.findBySlug(anyString())).thenReturn(null);

        ArticleDraftUpdateCmd cmd = new ArticleDraftUpdateCmd(15, "new title", "s", "slug-update", "{}", "# updated body", "new caption", null);
        service.adminUpdate(cmd, "draft", null);

        ArgumentCaptor<Article> captor = ArgumentCaptor.forClass(Article.class);
        verify(articleGateway).save(captor.capture());
        Article saved = captor.getValue();
        assertThat(saved.getDraftBodyMd()).isEqualTo("# updated body");
        assertThat(saved.getCoverCaption()).isEqualTo("new caption");
        assertThat(saved.getBodyMd()).isNull(); // not promoted to published body on draft save
    }

    @Test
    void adminOffline_missingArticle_returns404() {
        when(articleGateway.findById(999)).thenReturn(null);

        Response result = service.adminOffline(999);

        assertFalse(result.isSuccess());
        assertEquals("404", result.getErrorCode());
        verify(articleGateway, never()).save(any(Article.class));
    }

    @Test
    void delete_callsGatewayRemove() {
        doNothing().when(articleGateway).remove(5);

        Response result = service.delete(5);

        assertTrue(result.isSuccess());
        verify(articleGateway).remove(5);
    }

    // --- getTags tests ---

    @Test
    void getTags_delegatesToGatewayAndMapsResult() {
        com.seal.blog.domain.article.model.Tag tag =
                com.seal.blog.domain.article.model.Tag.reconstruct(1, "spring", 3);
        com.seal.blog.client.article.dto.vo.TagVO vo = new com.seal.blog.client.article.dto.vo.TagVO();
        vo.setTagId(1);
        vo.setName("spring");
        vo.setCount(3);

        when(articleGateway.getAllPublishedTags()).thenReturn(List.of(tag));
        when(articleAssembler.toTagVO(tag)).thenReturn(vo);

        List<com.seal.blog.client.article.dto.vo.TagVO> result = service.getTags();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("spring");
        verify(articleGateway).getAllPublishedTags();
        verify(articleAssembler).toTagVO(tag);
    }

    // --- Slug uniqueness tests ---

    @Test
    void adminCreate_duplicateSlug_returns409() {
        Article existing = Article.reconstruct(
                5, "existing", "s", "dup-slug", "2026-01-01", "2026-01-01",
                ArticleStatus.PUBLISHED, 0, "{}", "{}", null, 0, null, null, null);
        when(articleGateway.findBySlug("dup-slug")).thenReturn(existing);

        ArticleDraftSaveCmd cmd = new ArticleDraftSaveCmd("title", "s", "dup-slug", "{}", null, null, null);
        Response result = service.adminCreate(cmd, "draft", null);

        assertFalse(result.isSuccess());
        assertEquals("409", result.getErrorCode());
        verify(articleGateway, never()).save(any(Article.class));
    }

    @Test
    void adminCreate_withTags_setsTagsOnGateway() {
        stubGateway();

        ArticleDraftSaveCmd cmd = new ArticleDraftSaveCmd(
                "title", "s", "tags-slug", "{}", null, null, List.of("spring", "ddd"));
        service.adminCreate(cmd, "draft", null);

        ArgumentCaptor<List<String>> tagsCaptor = ArgumentCaptor.forClass((Class) List.class);
        verify(articleGateway).setTagsForArticle(any(), tagsCaptor.capture());
        assertThat(tagsCaptor.getValue()).containsExactly("spring", "ddd");
    }

    // --- getPage tests ---

    @Test
    void getPage_delegatesToGatewayAndAssembler() {
        com.seal.blog.client.article.dto.qry.ArticlePageQry qry =
                new com.seal.blog.client.article.dto.qry.ArticlePageQry();
        qry.setPageIndex(2);
        qry.setPageSize(5);

        PageResponse<Article> articlePage = PageResponse.of(List.of(), 0, 5, 2);
        PageResponse<ArticleVO> voPage = PageResponse.of(List.of(), 0, 5, 2);

        when(articleGateway.PageQuery(qry)).thenReturn(articlePage);
        when(articleAssembler.toPublicPageResponse(articlePage)).thenReturn(voPage);

        PageResponse<ArticleVO> result = service.getPage(qry);

        assertThat(result).isSameAs(voPage);
        verify(articleGateway).PageQuery(qry);
        verify(articleAssembler).toPublicPageResponse(articlePage);
    }

    @Test
    void adminUpdate_withTags_setsTagsOnGateway() {
        Article article = Article.reconstruct(
                16, "title", "s", "slug-tags-update", "2026-01-01", "2026-01-01",
                ArticleStatus.DRAFT, 0, "{}", "{}", null, 0, null, null, null);
        when(articleGateway.findById(16)).thenReturn(article);
        when(articleGateway.findBySlug(anyString())).thenReturn(null);

        ArticleDraftUpdateCmd cmd = new ArticleDraftUpdateCmd(
                16, "title", "s", "slug-tags-update", "{}", null, null, List.of("ddd", "spring"));
        service.adminUpdate(cmd, "draft", null);

        ArgumentCaptor<List<String>> tagsCaptor = ArgumentCaptor.forClass((Class) List.class);
        verify(articleGateway).setTagsForArticle(eq(16), tagsCaptor.capture());
        assertThat(tagsCaptor.getValue()).containsExactly("ddd", "spring");
    }

    // --- getAdjacentBySlug tests ---

    @Test
    void getAdjacentBySlug_missingArticle_returnsEmptyVO() {
        when(articleGateway.findBySlug("missing-adj")).thenReturn(null);

        SingleResponse<ArticleAdjacentVO> result = service.getAdjacentBySlug("missing-adj", null);

        assertTrue(result.isSuccess());
        assertNotNull(result.getData());
        assertNull(result.getData().getPrev());
        assertNull(result.getData().getNext());
        assertThat(result.getData().getRelated()).isEmpty();
        verify(articleGateway, never()).findPrevPublished(any(), any());
        verify(articleGateway, never()).findNextPublished(any(), any());
    }

    @Test
    void getAdjacentBySlug_draftArticle_returnsEmptyVO() {
        Article draft = Article.reconstruct(
                20, "draft", "s", "draft-adj", "2026-01-01", "2026-01-01",
                ArticleStatus.DRAFT, 0, null, null, null, 0, null, null, null);
        when(articleGateway.findBySlug("draft-adj")).thenReturn(draft);

        SingleResponse<ArticleAdjacentVO> result = service.getAdjacentBySlug("draft-adj", null);

        assertTrue(result.isSuccess());
        assertNull(result.getData().getPrev());
        assertNull(result.getData().getNext());
        verify(articleGateway, never()).findPrevPublished(any(), any());
    }

    @Test
    void getAdjacentBySlug_publishedArticle_returnsPrevAndNext() {
        Article current = Article.reconstruct(
                21, "current", "s", "current-adj", "2026-03-01", "2026-03-01",
                ArticleStatus.PUBLISHED, 0, null, null, null, 0, null, null, null);
        Article prev = Article.reconstruct(
                22, "prev article", "s", "prev-adj", "2026-04-01", "2026-04-01",
                ArticleStatus.PUBLISHED, 0, null, null, null, 0, null, null, null);
        Article next = Article.reconstruct(
                23, "next article", "s", "next-adj", "2026-02-01", "2026-02-01",
                ArticleStatus.PUBLISHED, 0, null, null, null, 0, null, null, null);

        when(articleGateway.findBySlug("current-adj")).thenReturn(current);
        when(articleGateway.findPrevPublished(eq("2026-03-01"), eq(21))).thenReturn(prev);
        when(articleGateway.findNextPublished(eq("2026-03-01"), eq(21))).thenReturn(next);
        when(articleGateway.findRelatedPublished(any(), any(), anyInt())).thenReturn(Collections.emptyList());

        SingleResponse<ArticleAdjacentVO> result = service.getAdjacentBySlug("current-adj", List.of("tag1"));

        assertTrue(result.isSuccess());
        assertNotNull(result.getData().getPrev());
        assertNotNull(result.getData().getNext());
        assertEquals("prev article", result.getData().getPrev().getTitle());
        assertEquals("prev-adj", result.getData().getPrev().getUrl());
        assertEquals("2026-04-01", result.getData().getPrev().getDate());
        assertEquals("next article", result.getData().getNext().getTitle());
        assertEquals("next-adj", result.getData().getNext().getUrl());
        assertEquals("2026-02-01", result.getData().getNext().getDate());
    }

    @Test
    void getAdjacentBySlug_passesArticleIdToGateway_enablesSameDateNavigation() {
        // Verifies that both currentDate AND currentArticleId are forwarded to the gateway.
        // This ensures same-date articles can navigate to each other via (date, articleId) composite ordering.
        Article current = Article.reconstruct(
                30, "middle", "s", "middle-adj", "2026-03-15", "2026-03-15",
                ArticleStatus.PUBLISHED, 0, null, null, null, 0, null, null, null);
        Article sameDate = Article.reconstruct(
                31, "same-date newer", "s", "same-date-adj", "2026-03-15", "2026-03-15",
                ArticleStatus.PUBLISHED, 0, null, null, null, 0, null, null, null);

        when(articleGateway.findBySlug("middle-adj")).thenReturn(current);
        when(articleGateway.findPrevPublished(eq("2026-03-15"), eq(30))).thenReturn(sameDate);
        when(articleGateway.findNextPublished(eq("2026-03-15"), eq(30))).thenReturn(null);
        when(articleGateway.findRelatedPublished(any(), any(), anyInt())).thenReturn(Collections.emptyList());

        SingleResponse<ArticleAdjacentVO> result = service.getAdjacentBySlug("middle-adj", List.of("tag1"));

        assertTrue(result.isSuccess());
        assertNotNull(result.getData().getPrev());
        assertEquals("same-date newer", result.getData().getPrev().getTitle());
        assertNull(result.getData().getNext());
        // Confirm gateway was called with both date and ID (not just date as in the old API)
        verify(articleGateway).findPrevPublished("2026-03-15", 30);
        verify(articleGateway).findNextPublished("2026-03-15", 30);
    }

    @Test
    void getAdjacentBySlug_noTags_doesNotCallRelatedLookup() {
        Article current = Article.reconstruct(
                24, "current2", "s", "current-adj2", "2026-03-01", "2026-03-01",
                ArticleStatus.PUBLISHED, 0, null, null, null, 0, null, null, null);
        when(articleGateway.findBySlug("current-adj2")).thenReturn(current);
        when(articleGateway.findPrevPublished(any(), any())).thenReturn(null);
        when(articleGateway.findNextPublished(any(), any())).thenReturn(null);

        SingleResponse<ArticleAdjacentVO> result = service.getAdjacentBySlug("current-adj2", Collections.emptyList());

        assertTrue(result.isSuccess());
        assertThat(result.getData().getRelated()).isEmpty();
        verify(articleGateway, never()).findRelatedPublished(any(), any(), anyInt());
    }

    // --- Legacy create / update tests ---

    @Test
    void legacyCreate_success_callsGatewaySave() {
        Article fakeArticle = Article.reconstruct(
                null, "title", "s", "legacy-slug", "2026-01-01", "2026-01-01",
                ArticleStatus.DRAFT, 0, null, null, null, 0, null, null, null);
        when(articleGateway.findBySlug("legacy-slug")).thenReturn(null);
        when(articleAssembler.toEntity(any(ArticleCreateCmd.class))).thenReturn(fakeArticle);

        ArticleCreateCmd cmd = new ArticleCreateCmd();
        cmd.setTitle("title");
        cmd.setSummary("s");
        cmd.setUrl("legacy-slug");
        cmd.setTags(List.of("java"));

        Response result = service.create(cmd);

        assertTrue(result.isSuccess());
        verify(articleGateway).save(fakeArticle);
    }

    @Test
    void legacyCreate_duplicateSlug_returns409() {
        Article existing = Article.reconstruct(
                5, "existing", "s", "dup-legacy", "2026-01-01", "2026-01-01",
                ArticleStatus.PUBLISHED, 0, null, null, null, 0, null, null, null);
        when(articleGateway.findBySlug("dup-legacy")).thenReturn(existing);

        ArticleCreateCmd cmd = new ArticleCreateCmd();
        cmd.setTitle("title");
        cmd.setSummary("s");
        cmd.setUrl("dup-legacy");
        cmd.setTags(List.of("java"));

        Response result = service.create(cmd);

        assertFalse(result.isSuccess());
        assertEquals("409", result.getErrorCode());
        verify(articleGateway, never()).save(any(Article.class));
    }

    @Test
    void legacyUpdate_missingArticle_returns404() {
        when(articleGateway.findById(99)).thenReturn(null);

        ArticleUpdateCmd cmd = new ArticleUpdateCmd();
        cmd.setArticleId(99);
        cmd.setTitle("title");
        cmd.setUrl("some-slug");

        Response result = service.update(cmd);

        assertFalse(result.isSuccess());
        assertEquals("404", result.getErrorCode());
    }

    @Test
    void legacyUpdate_success_modifiesAndSaves() {
        Article article = Article.reconstruct(
                7, "old title", "s", "old-slug", "2026-01-01", "2026-01-01",
                ArticleStatus.PUBLISHED, 0, null, null, null, 0, null, null, null);
        when(articleGateway.findById(7)).thenReturn(article);
        when(articleGateway.findBySlug("new-slug")).thenReturn(null);

        ArticleUpdateCmd cmd = new ArticleUpdateCmd();
        cmd.setArticleId(7);
        cmd.setTitle("new title");
        cmd.setSummary("new summary");
        cmd.setUrl("new-slug");

        Response result = service.update(cmd);

        assertTrue(result.isSuccess());
        verify(articleGateway).save(article);
        assertEquals("new title", article.getTitle());
        assertEquals("new-slug", article.getUrl());
    }

    // --- adminArchive tests ---

    @Test
    void adminArchive_existingArticle_setsArchivedStatus() {
        Article article = Article.reconstruct(
                12,
                "title", "summary", "slug-d",
                "2026-01-01", "2026-01-01",
                ArticleStatus.PUBLISHED, 0,
                "{}", "{}",
                null, 0,
                null, null, null
        );
        when(articleGateway.findById(12)).thenReturn(article);

        Response result = service.adminArchive(12);

        assertTrue(result.isSuccess());
        assertEquals(ArticleStatus.ARCHIVED, article.getDraft());
        verify(articleGateway).save(article);
    }

    @Test
    void adminArchive_missingArticle_returns404() {
        when(articleGateway.findById(999)).thenReturn(null);

        Response result = service.adminArchive(999);

        assertFalse(result.isSuccess());
        assertEquals("404", result.getErrorCode());
        verify(articleGateway, never()).save(any(Article.class));
    }

    // --- adminPublish tests ---

    private Article buildDraftArticle(String title, String url) {
        Article article = Article.reconstruct(
                5, title, "summary", url,
                "2024-01-01", "2024-01-01",
                ArticleStatus.DRAFT, 0,
                null, "{\"elements\":[]}", null, 0,
                null, "draft body", null
        );
        return article;
    }

    @Test
    void adminPublish_articleNotFound_returns404() {
        when(articleGateway.findById(99)).thenReturn(null);

        Response result = service.adminPublish(99);

        assertFalse(result.isSuccess());
        assertEquals("404", result.getErrorCode());
    }

    @Test
    void adminPublish_placeholderTitle_returns400() {
        Article article = buildDraftArticle("未命名草稿", "some-slug");
        when(articleGateway.findById(5)).thenReturn(article);

        Response result = service.adminPublish(5);

        assertFalse(result.isSuccess());
        assertEquals("400", result.getErrorCode());
        verify(articleGateway, never()).save(any());
    }

    @Test
    void adminPublish_emptyUrl_returns400() {
        Article article = buildDraftArticle("A Real Title", "");
        when(articleGateway.findById(5)).thenReturn(article);

        Response result = service.adminPublish(5);

        assertFalse(result.isSuccess());
        assertEquals("400", result.getErrorCode());
        verify(articleGateway, never()).save(any());
    }

    @Test
    void adminPublish_validDraft_publishesAndSaves() {
        Article article = buildDraftArticle("My Article", "my-article");
        when(articleGateway.findById(5)).thenReturn(article);
        doNothing().when(articleGateway).save(any());

        Response result = service.adminPublish(5);

        assertTrue(result.isSuccess());
        assertEquals(ArticleStatus.PUBLISHED, article.getDraft());
        verify(articleGateway).save(article);
    }

    @Test
    void adminPublish_archivedArticle_returns400() {
        Article archived = Article.reconstruct(
                5, "My Article", "summary", "my-article",
                "2026-01-01", "2026-01-01",
                ArticleStatus.ARCHIVED, 0,
                "{}", "{}", null, 0, null, null, null
        );
        when(articleGateway.findById(5)).thenReturn(archived);

        Response result = service.adminPublish(5);

        assertFalse(result.isSuccess());
        assertEquals("400", result.getErrorCode());
        // ARCHIVED is terminal — must not be persisted as PUBLISHED
        verify(articleGateway, never()).save(any(Article.class));
    }

    @Test
    void adminOffline_archivedArticle_returns400() {
        Article archived = Article.reconstruct(
                7, "Archived Post", "summary", "archived-post",
                "2026-01-01", "2026-01-01",
                ArticleStatus.ARCHIVED, 0,
                "{}", "{}", null, 0, null, null, null
        );
        when(articleGateway.findById(7)).thenReturn(archived);

        Response result = service.adminOffline(7);

        assertFalse(result.isSuccess());
        assertEquals("400", result.getErrorCode());
        // ARCHIVED is terminal — must not be persisted as DRAFT
        verify(articleGateway, never()).save(any(Article.class));
    }

    // --- getAdminStats ---

    @Test
    void getAdminStats_aggregatesCountsFromGateway() {
        when(articleGateway.countByStatus(null)).thenReturn(10);
        when(articleGateway.countByStatus(ArticleStatus.PUBLISHED.getCode())).thenReturn(6);
        when(articleGateway.countByStatus(ArticleStatus.DRAFT.getCode())).thenReturn(3);
        when(articleGateway.countByStatus(ArticleStatus.ARCHIVED.getCode())).thenReturn(1);

        com.seal.blog.client.article.dto.vo.ArticleStatsVO stats = service.getAdminStats();

        assertEquals(10, stats.getTotal());
        assertEquals(6, stats.getPublished());
        assertEquals(3, stats.getDraft());
        assertEquals(1, stats.getArchived());
        verify(articleGateway).countByStatus(null);
        verify(articleGateway).countByStatus(ArticleStatus.PUBLISHED.getCode());
        verify(articleGateway).countByStatus(ArticleStatus.DRAFT.getCode());
        verify(articleGateway).countByStatus(ArticleStatus.ARCHIVED.getCode());
    }

    @Test
    void getAdminStats_includesViewCountFromGateway() {
        when(articleGateway.countByStatus(null)).thenReturn(5);
        when(articleGateway.countByStatus(ArticleStatus.PUBLISHED.getCode())).thenReturn(3);
        when(articleGateway.countByStatus(ArticleStatus.DRAFT.getCode())).thenReturn(2);
        when(articleGateway.countByStatus(ArticleStatus.ARCHIVED.getCode())).thenReturn(0);
        when(articleGateway.sumViewCount()).thenReturn(9876L);

        com.seal.blog.client.article.dto.vo.ArticleStatsVO stats = service.getAdminStats();

        assertEquals(9876L, stats.getTotalViews());
        verify(articleGateway).sumViewCount();
    }

    // --- adminUpdate additional coverage ---

    @Test
    void adminUpdate_missingArticle_returns404() {
        when(articleGateway.findById(777)).thenReturn(null);

        ArticleDraftUpdateCmd cmd = new ArticleDraftUpdateCmd(777, "title", "s", "slug-x", "{}", null, null, null);
        Response result = service.adminUpdate(cmd, "draft", null);

        assertFalse(result.isSuccess());
        assertEquals("404", result.getErrorCode());
        verify(articleGateway, never()).save(any(Article.class));
    }

    @Test
    void adminUpdate_slugBelongsToDifferentArticle_returns409() {
        Article targetArticle = Article.reconstruct(
                20, "My Article", "s", "my-slug", "2026-01-01", "2026-01-01",
                ArticleStatus.DRAFT, 0, "{}", "{}", null, 0, null, null, null);
        Article conflictingArticle = Article.reconstruct(
                21, "Other", "s", "conflict-slug", "2026-01-01", "2026-01-01",
                ArticleStatus.PUBLISHED, 0, null, null, null, 0, null, null, null);

        when(articleGateway.findById(20)).thenReturn(targetArticle);
        // Slug "conflict-slug" is owned by article 21 (different ID)
        when(articleGateway.findBySlug("conflict-slug")).thenReturn(conflictingArticle);

        ArticleDraftUpdateCmd cmd = new ArticleDraftUpdateCmd(20, "My Article", "s", "conflict-slug", "{}", null, null, null);
        Response result = service.adminUpdate(cmd, "draft", null);

        assertFalse(result.isSuccess());
        assertEquals("409", result.getErrorCode());
        verify(articleGateway, never()).save(any(Article.class));
    }

    @Test
    void adminUpdate_slugBelongsToSameArticle_allowsUpdate() {
        // When updating and the slug resolves to the SAME article, it should pass (no 409).
        Article article = Article.reconstruct(
                25, "Title", "s", "own-slug", "2026-01-01", "2026-01-01",
                ArticleStatus.DRAFT, 0, "{}", "{}", null, 0, null, null, null);

        when(articleGateway.findById(25)).thenReturn(article);
        when(articleGateway.findBySlug("own-slug")).thenReturn(article); // same article

        ArticleDraftUpdateCmd cmd = new ArticleDraftUpdateCmd(25, "Title", "s", "own-slug", "{}", null, null, null);
        Response result = service.adminUpdate(cmd, "draft", null);

        assertTrue(result.isSuccess());
        verify(articleGateway).save(article);
    }

    @Test
    void adminUpdate_publishAction_copiesDraftBodyMdToBodyMd() {
        Article article = Article.reconstruct(
                30, "Published Title", "s", "pub-slug", "2026-01-01", "2026-01-01",
                ArticleStatus.DRAFT, 0, "{}", "{}", null, 0, null, "# original draft", null);

        when(articleGateway.findById(30)).thenReturn(article);
        when(articleGateway.findBySlug("pub-slug")).thenReturn(null);

        ArticleDraftUpdateCmd cmd = new ArticleDraftUpdateCmd(
                30, "Published Title", "s", "pub-slug", "{}", "# new draft body", null, null);
        Response result = service.adminUpdate(cmd, "publish", null);

        assertTrue(result.isSuccess());
        assertEquals(ArticleStatus.PUBLISHED, article.getDraft());
        assertThat(article.getBodyMd()).isEqualTo("# new draft body");
        verify(articleGateway).save(article);
    }
}
