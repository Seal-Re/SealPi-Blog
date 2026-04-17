package com.seal.blog.client.article.api;

import com.seal.blog.client.article.dto.cmd.ArticleCreateCmd;
import com.seal.blog.client.article.dto.cmd.ArticleDraftSaveCmd;
import com.seal.blog.client.article.dto.cmd.ArticleDraftUpdateCmd;
import com.seal.blog.client.article.dto.cmd.ArticleUpdateCmd;
import com.seal.blog.client.article.dto.qry.ArticleByIdQry;
import com.seal.blog.client.article.dto.qry.ArticleBySlugQry;
import com.seal.blog.client.article.dto.qry.ArticlePageQry;
import com.seal.blog.client.article.dto.vo.ArticleAdjacentVO;
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
    /** Creates an article and returns its generated ID. */
    SingleResponse<Integer> adminCreate(ArticleDraftSaveCmd cmd, String action, String coverImageUrl);

    Response adminUpdate(ArticleDraftUpdateCmd cmd, String action, String coverImageUrl);

    Response adminOffline(Integer id);

    /**
     * Archives a published article (soft-delete: transitions status to ARCHIVED without removing data).
     * ARCHIVED is a terminal state — the article is no longer visible on the public site.
     */
    Response adminArchive(Integer id);

    /**
     * Promotes a draft article to published status without a full payload update.
     * Copies draftJson→contentJson, draftBodyMd→bodyMd, and sets status=PUBLISHED.
     * Returns 400 if the article has no real title or no URL set.
     * Returns 404 if the article does not exist.
     */
    Response adminPublish(Integer id);

    SingleResponse<ArticleVO> getSingleById(ArticleByIdQry articleByIdQry);

    /** Admin-only: returns any article regardless of status, with full draft fields. */
    SingleResponse<ArticleVO> adminGetSingleById(Integer id);

    SingleResponse<ArticleVO> getSingleBySlug(ArticleBySlugQry articleBySlugQry);

    PageResponse<ArticleVO> getPage(ArticlePageQry articlePageQry);

    List<TagVO> getTags();

    /**
     * 返回指定 slug 文章的上一篇（更新）、下一篇（更旧）及相关文章（共享标签）。
     * 若文章不存在或未发布，返回空的 ArticleAdjacentVO（不返回 404）。
     *
     * @param slug     当前文章的 slug/url
     * @param tagNames 当前文章的标签名称列表，用于查找相关文章（可为空）
     */
    SingleResponse<ArticleAdjacentVO> getAdjacentBySlug(String slug, List<String> tagNames);

    /**
     * 浏览量 +1（best-effort，不影响主流程，供前端客户端主动上报）
     */
    Response incrementViewCount(Integer articleId);

}
