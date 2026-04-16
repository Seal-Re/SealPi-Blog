package com.seal.blog.client.article.api;

import com.seal.blog.client.article.dto.cmd.ArticleCreateCmd;
import com.seal.blog.client.article.dto.cmd.ArticleDraftSaveCmd;
import com.seal.blog.client.article.dto.cmd.ArticleDraftUpdateCmd;
import com.seal.blog.client.article.dto.cmd.ArticleUpdateCmd;
import com.seal.blog.client.article.dto.qry.ArticleByIdQry;
import com.seal.blog.client.article.dto.qry.ArticleBySlugQry;
import com.seal.blog.client.article.dto.qry.ArticlePageQry;
import com.seal.blog.client.article.dto.vo.ArticleVO;
import com.seal.blog.client.article.dto.vo.TagVO;
import com.seal.blog.client.common.PageResponse;
import com.seal.blog.client.common.Response;
import com.seal.blog.client.common.SingleResponse;

import java.util.List;

public interface ArticleServiceI {

    Response create(ArticleCreateCmd articleCreateCmd);

    Response update(ArticleUpdateCmd articleUpdateCmd);

    Response delete(Integer id);

    // v1 admin: save draft / publish
    Response adminCreate(ArticleDraftSaveCmd cmd, String action, String coverImageUrl);

    Response adminUpdate(ArticleDraftUpdateCmd cmd, String action, String coverImageUrl);

    Response adminOffline(Integer id);

    SingleResponse<ArticleVO> getSingleById(ArticleByIdQry articleByIdQry);

    SingleResponse<ArticleVO> getSingleBySlug(ArticleBySlugQry articleBySlugQry);

    PageResponse<ArticleVO> getPage(ArticlePageQry articlePageQry);

    List<TagVO> getTags();

    /**
     * 浏览量 +1（best-effort，不影响主流程，供前端客户端主动上报）
     */
    Response incrementViewCount(Integer articleId);

}
