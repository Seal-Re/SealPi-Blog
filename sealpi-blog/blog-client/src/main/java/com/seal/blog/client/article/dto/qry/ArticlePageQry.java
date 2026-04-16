package com.seal.blog.client.article.dto.qry;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ArticlePageQry {

    @Min(value = 1, message = "最小页数为1")
    private Integer pageIndex = 1;

    @Min(value = 1, message = "每页数量不能小于1")
    @Max(value = 50, message = "每页数量不能超过50")
    private Integer pageSize = 10;

    private String keyword;
    /**
     * Frontend friendly alias for keyword.
     */
    private String q;
    private Integer tagId;
    /**
     * Tag name for filtering (resolved to tagId by the infra layer).
     */
    private String tag;
    private Integer draft;
    /**
     * Frontend friendly status: all | draft | published.
     */
    private String status;

    /**
     * Sort order: date (default) | lastmod.
     */
    private String sort;

    public String resolveKeyword() {
        if (q != null && !q.trim().isEmpty()) {
            return q.trim();
        }
        return keyword;
    }

    public Integer resolveDraft() {
        if (status == null || status.isBlank() || "all".equalsIgnoreCase(status)) {
            return draft;
        }
        if ("draft".equalsIgnoreCase(status)) {
            return 0;   // ArticleStatus.DRAFT = 0
        }
        if ("published".equalsIgnoreCase(status)) {
            return 1;   // ArticleStatus.PUBLISHED = 1
        }
        return draft;
    }
}
