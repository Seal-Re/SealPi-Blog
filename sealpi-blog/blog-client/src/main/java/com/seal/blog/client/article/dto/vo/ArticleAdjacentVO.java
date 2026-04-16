package com.seal.blog.client.article.dto.vo;

import lombok.Data;

import java.util.List;

/**
 * Response VO for the GET /api/v1/articles/adjacent endpoint.
 * Returns the previous (newer) and next (older) published articles relative to the
 * current one, plus up to 3 articles that share at least one tag.
 */
@Data
public class ArticleAdjacentVO {

    /** The published article that comes before this one (newer, higher in the list). */
    private ArticleSummary prev;

    /** The published article that comes after this one (older, lower in the list). */
    private ArticleSummary next;

    /** Up to 3 published articles that share at least one tag with the current article. */
    private List<ArticleSummary> related;

    @Data
    public static class ArticleSummary {
        private String title;
        private String url;
        private String summary;
        private String coverImageUrl;
        private List<String> tags;
        /** ISO date string (yyyy-MM-dd) of the article's original publish date. */
        private String date;
    }
}
