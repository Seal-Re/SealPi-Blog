package com.seal.blog.client.user.dto.qry;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UserPageQry {

    @Min(value = 1, message = "最小页数为1")
    private Integer pageIndex = 1;

    @Min(value = 1, message = "每页数量不能小于1")
    @Max(value = 100, message = "每页数量不能超过100")
    private Integer pageSize = 20;
}
