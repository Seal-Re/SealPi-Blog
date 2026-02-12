package com.seal.blog.client.article.dto.qry;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

@Data
public class ArticlePageQry {

    @Min(value = 1, message = "最小页数为1")
    private Integer pageIndex = 1;

    @Min(value = 1, message = "每页数量不能小于1")
    @Max(value = 50, message = "每页数量不能超过50")
    private Integer pageSize = 10;

    private String keyword;
    private Integer tagId;
    private Integer draft;
}
