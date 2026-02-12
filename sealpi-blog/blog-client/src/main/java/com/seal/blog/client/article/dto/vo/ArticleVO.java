package com.seal.blog.client.article.dto.vo;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class ArticleVO {

    private String articleId;
    private String title;
    private LocalDateTime date;
    private LocalDateTime lastmod;
    private String url;
    private String summary;
    private Integer draft;
    private Integer count;
    private List<TagVO> tags;

}
