package com.seal.blog.client.article.dto.cmd;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class ArticleCreateCmd {

    @NotBlank(message = "标题不能为空")
    private String title;

    private String summary;

    @NotBlank(message = "url不能为空")
    private String url;

    @NotEmpty(message = "至少有一个标签")
    private List<String> tags;

}
