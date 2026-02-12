package com.seal.blog.client.article.dto.cmd;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ArticleUpdateCmd {

    @NotNull(message = "id不能为空")
    private Integer articleId;

    @NotBlank(message = "标题不能为空")
    private String title;

    private String summary;

    @NotBlank(message = "url不能为空")
    private String url;

}
