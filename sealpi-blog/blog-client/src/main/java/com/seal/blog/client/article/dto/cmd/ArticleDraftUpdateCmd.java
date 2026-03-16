package com.seal.blog.client.article.dto.cmd;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * v1 admin write API: update existing article draft / publish.
 */
@Data
public class ArticleDraftUpdateCmd {

    @NotNull(message = "id不能为空")
    private Integer articleId;

    @NotBlank(message = "标题不能为空")
    private String title;

    private String summary;

    @NotBlank(message = "url不能为空")
    private String url;

    /** Excalidraw scene JSON (string) */
    @NotBlank(message = "draftJson不能为空")
    private String draftJson;
}
