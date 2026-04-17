package com.seal.blog.client.article.dto.vo;

import lombok.Data;

/** Aggregated article counts returned by the admin stats endpoint. */
@Data
public class ArticleStatsVO {

    private int total;
    private int published;
    private int draft;
    private int archived;

    /** Sum of view_count across all articles (any status). */
    private long totalViews;

}
