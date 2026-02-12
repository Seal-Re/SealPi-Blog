package com.seal.blog.client.article.api;

import com.seal.blog.client.article.dto.cmd.ArticleCreateCmd;
import com.seal.blog.client.article.dto.cmd.ArticleUpdateCmd;
import com.seal.blog.client.common.PageResponse;
import com.seal.blog.client.article.dto.qry.ArticleByIdQry;
import com.seal.blog.client.article.dto.qry.ArticlePageQry;
import com.seal.blog.client.article.dto.vo.ArticleVO;
import com.seal.blog.client.common.Response;
import com.seal.blog.client.common.SingleResponse;

public interface ArticleServiceI {

    Response create(ArticleCreateCmd articleCreateCmd);
    Response update(ArticleUpdateCmd articleUpdateCmd);
    Response delete(Integer id);

    SingleResponse<ArticleVO> getSingleById(ArticleByIdQry articleByIdQry);
    PageResponse<ArticleVO> getPage(ArticlePageQry articlePageQry);

}
