package com.seal.blog.client.article.dto.cmd;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * v1 admin write API: update existing article draft / publish.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
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

    /** Markdown body for draft. Nullable. */
    private String draftBodyMd;

    /** Handwriting caption under the Excalidraw hero. Nullable. */
    private String coverCaption;
}
