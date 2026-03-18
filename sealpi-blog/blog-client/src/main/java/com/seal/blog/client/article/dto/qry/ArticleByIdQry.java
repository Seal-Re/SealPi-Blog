package com.seal.blog.client.article.dto.qry;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.validator.constraints.Range;

@Getter
@Setter
public class ArticleByIdQry {

    @NotNull(message = "必须提供Id")
    @Range(min = 0, max = 1000, message = "Id范围为0-1000")
    private Integer articleId;

}
