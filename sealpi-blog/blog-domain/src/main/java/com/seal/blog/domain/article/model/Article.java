package com.seal.blog.domain.article.model;

import lombok.Getter;

import java.time.LocalDate;

@Getter
public class Article {

    private Integer articleId;
    private String title;
    private String date;
    private String lastmod;
    private String summary;
    private String url;

    // v1: Excalidraw payloads + OG cover + explicit view count.
    private String contentJson;
    private String draftJson;
    private String coverImageUrl;
    private Integer viewCount;

    private ArticleStatus draft;
    private Integer count;

    public Article(String title, String summary, String url) {
        this.title = title;
        this.summary = summary;
        this.url = url;

        this.draft = ArticleStatus.DRAFT;
        this.date = LocalDate.now().toString();
        this.lastmod = LocalDate.now().toString();
        this.count = 0;

        // v1 defaults
        this.viewCount = 0;

        this.initValidation();
    }

    public void modify(String title, String summary, String url) {
        this.title = title;
        this.summary = summary;
        this.url = url;

        this.lastmod = LocalDate.now().toString();

        this.initValidation();
    }

    public void saveDraft(String draftJson, String coverImageUrl) {
        this.draftJson = draftJson;
        if (coverImageUrl != null && !coverImageUrl.isBlank()) {
            this.coverImageUrl = coverImageUrl;
        }
        this.lastmod = LocalDate.now().toString();
    }

    public void publishFromDraft(String coverImageUrl) {
        // Copy draft -> content for published view.
        this.contentJson = this.draftJson;
        if (coverImageUrl != null && !coverImageUrl.isBlank()) {
            this.coverImageUrl = coverImageUrl;
        }
        this.draft = ArticleStatus.PUBLISHED;
        this.lastmod = LocalDate.now().toString();
    }

    public void delete() {
        this.draft = ArticleStatus.ARCHIVED;
    }

    public void publish() {
        this.draft = ArticleStatus.PUBLISHED;
    }

    public void offlineToDraft() {
        this.draft = ArticleStatus.DRAFT;
        this.lastmod = LocalDate.now().toString();
    }

    public void updateCount(Integer count) {
        this.count = count;
    }

    public void assignId(Integer id) {
        if (this.articleId != null) {
            throw new IllegalStateException("已有id，不能重复赋值");
        }
        this.articleId = id;
    }

    public static Article reconstruct(
            Integer id,
            String title, String summary, String url,
            String date, String lastmod,
            ArticleStatus draft, Integer count,
            String contentJson,
            String draftJson,
            String coverImageUrl,
            Integer viewCount
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

        return article;
    }

    private void initValidation() {
        if (title == null || title.length() < 2) {
            throw new IllegalArgumentException("标题不能少于2个字");
        }
    }
}
