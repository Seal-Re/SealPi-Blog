package com.seal.blog.client.article.dto.vo;

import lombok.Data;

import java.util.List;

@Data
public class ArticleVO {

    private String articleId;
    private String title;

    /**
     * Domain layer currently stores date/lastmod as ISO-8601 date string (e.g. 2026-03-25).
     * Keep DTO aligned to avoid runtime parsing errors.
     */
    private String date;
    private String lastmod;

    private String url;

    // Markdown summary for list/SEO.
    private String summary;

    // Excalidraw JSON payloads.
    private String contentJson;
    private String draftJson;

    // Static preview image URL for OG/list fallback.
    private String coverImageUrl;

    // Read count (explicit v1 field; may later replace/alias the existing count).
    private Integer viewCount;

    private Integer draft;
    private Integer count;
    private List<TagVO> tags;

}
