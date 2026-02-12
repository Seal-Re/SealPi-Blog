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
    private ArticleStatus draft;
    private Integer count;

    public Article(String title, String summary, String url) {
        this.title = title;
        this.summary = summary;
        this.url = url;

        this.draft = ArticleStatus.DRAFT;
        this.date  = LocalDate.now().toString();
        this.lastmod = LocalDate.now().toString();
        this.count = 0;

        this.initValidation();
    }

    public void modify(String title, String summary, String url) {
        this.title = title;
        this.summary = summary;
        this.url = url;

        this.draft = ArticleStatus.DRAFT;
        this.lastmod = LocalDate.now().toString();

        this.initValidation();
    }

    public void delete() {
        this.draft = ArticleStatus.ARCHIVED;
    }

    public void publish() {
        this.draft = ArticleStatus.PUBLISHED;
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
            ArticleStatus draft, Integer count
    ) {
        Article article = new Article(title, summary, url);

        article.articleId = id;
        article.date = date;
        article.lastmod = lastmod;
        article.draft = draft;
        article.count = count;

        return article;
    }

    private void initValidation() {
        if (title == null || title.length() < 2) {
            throw new IllegalArgumentException("标题不能少于2个字");
        }
    }
}
