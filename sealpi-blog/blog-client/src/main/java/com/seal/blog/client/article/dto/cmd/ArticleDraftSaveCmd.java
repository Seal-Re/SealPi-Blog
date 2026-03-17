package com.seal.blog.client.article.dto.cmd;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * v1 admin write API: save draft / publish article.
 *
 * Note: previewImage is uploaded via multipart (see adapter controller) so the DTO only carries
 * metadata and Excalidraw JSON payload.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ArticleDraftSaveCmd {

    @NotBlank(message = "标题不能为空")
    private String title;

    private String summary;

    @NotBlank(message = "url不能为空")
    private String url;

    /** Excalidraw scene JSON (string) */
    @NotBlank(message = "draftJson不能为空")
    private String draftJson;
}
