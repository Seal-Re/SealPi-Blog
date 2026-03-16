package com.seal.blog.client.article.dto.vo;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class ArticleVO {

    private String articleId;
    private String title;

    // Keep as-is for now; later we can normalize to String/LocalDateTime consistently across layers.
    private LocalDateTime date;
    private LocalDateTime lastmod;

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
