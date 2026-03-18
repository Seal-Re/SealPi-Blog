package com.seal.blog.client.article.dto.qry;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ArticleBySlugQry {

    @NotBlank(message = "slug不能为空")
    private String slug;
}
