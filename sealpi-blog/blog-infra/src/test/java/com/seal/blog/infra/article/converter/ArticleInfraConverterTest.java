package com.seal.blog.infra.article.converter;

import com.seal.blog.domain.article.model.Article;
import com.seal.blog.domain.article.model.ArticleStatus;
import com.seal.blog.infra.article.po.ArticlePO;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ArticleInfraConverterTest {

    @Test
    void toEntity_should_map_v1_fields() {
        ArticleInfraConverter converter = new ArticleInfraConverter();

        ArticlePO po = new ArticlePO();
        po.setArticleId(1);
        po.setTitle("title");
        po.setSummary("summary");
        po.setUrl("/blog/1");
        po.setDate("2026-03-16");
        po.setLastmod("2026-03-16");
        po.setDraft(ArticleStatus.DRAFT.getCode());
        po.setCount(7);

        po.setContentJson("{\"type\":\"excalidraw\"}");
        po.setDraftJson("{\"draft\":true}");
        po.setCoverImageUrl("https://cdn.example.com/covers/1.webp");
        po.setViewCount(123);

        Article entity = converter.toEntity(po);

        assertNotNull(entity);
        assertEquals(po.getArticleId(), entity.getArticleId());
        assertEquals(po.getTitle(), entity.getTitle());
        assertEquals(po.getSummary(), entity.getSummary());
        assertEquals(po.getUrl(), entity.getUrl());
        assertEquals(po.getDate(), entity.getDate());
        assertEquals(po.getLastmod(), entity.getLastmod());
        assertEquals(ArticleStatus.DRAFT, entity.getDraft());
        assertEquals(po.getCount(), entity.getCount());

        assertEquals(po.getContentJson(), entity.getContentJson());
        assertEquals(po.getDraftJson(), entity.getDraftJson());
        assertEquals(po.getCoverImageUrl(), entity.getCoverImageUrl());
        assertEquals(po.getViewCount(), entity.getViewCount());
    }

    @Test
    void toPo_should_map_v1_fields() {
        ArticleInfraConverter converter = new ArticleInfraConverter();

        Article entity = Article.reconstruct(
                2,
                "title", "s", "/blog/2",
                "2026-03-16", "2026-03-16",
                ArticleStatus.PUBLISHED, 9,
                "{\"type\":\"excalidraw\"}",
                "{\"draft\":false}",
                "https://cdn.example.com/covers/2.webp",
                456,
                null, null, null
        );

        ArticlePO po = converter.toPO(entity);

        assertNotNull(po);
        assertEquals(entity.getArticleId(), po.getArticleId());
        assertEquals(entity.getTitle(), po.getTitle());
        assertEquals(entity.getSummary(), po.getSummary());
        assertEquals(entity.getUrl(), po.getUrl());
        assertEquals(entity.getDate(), po.getDate());
        assertEquals(entity.getLastmod(), po.getLastmod());
        assertEquals(ArticleStatus.PUBLISHED.getCode(), po.getDraft());
        assertEquals(entity.getCount(), po.getCount());

        assertEquals(entity.getContentJson(), po.getContentJson());
        assertEquals(entity.getDraftJson(), po.getDraftJson());
        assertEquals(entity.getCoverImageUrl(), po.getCoverImageUrl());
        assertEquals(entity.getViewCount(), po.getViewCount());
    }
}
