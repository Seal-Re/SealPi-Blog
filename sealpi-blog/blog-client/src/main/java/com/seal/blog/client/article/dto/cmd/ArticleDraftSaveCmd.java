package com.seal.blog.client.article.dto.cmd;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * v1 admin write API: save draft / publish article.
 *
 * Note: previewImage is uploaded via multipart (see adapter controller) so the DTO only carries
 * metadata and Excalidraw JSON payload.
 */
@Getter
@Setter
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

    /** Markdown body for draft. Nullable. */
    private String draftBodyMd;

    /** Handwriting caption under the Excalidraw hero. Nullable. */
    private String coverCaption;

    /** Optional tag names. When present, replaces all existing tags for this article. */
    private List<String> tags;
}
