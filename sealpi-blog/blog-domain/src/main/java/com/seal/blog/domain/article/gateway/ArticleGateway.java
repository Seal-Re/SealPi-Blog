package com.seal.blog.domain.article.gateway;

import com.seal.blog.client.common.PageResponse;
import com.seal.blog.client.article.dto.qry.ArticlePageQry;
import com.seal.blog.domain.article.model.Article;
import com.seal.blog.domain.article.model.Tag;

import java.util.List;

public interface ArticleGateway {

    /**
     * 新增或更新文章
     * @param article
     */
    void save(Article article);

    /**
     * 删除文章(逻辑删）
     * @param id
     */
    void remove(Integer id);

    /**
     * 根据id查找文章
     * @param articleId
     * @return
     */
    Article findById(Integer articleId);

    /**
     * 根据 slug/url 查找文章
     * @param slug
     * @return
     */
    Article findBySlug(String slug);

    /**
     * 分页
     * @param articlePageQry
     * @return
     */
    PageResponse<Article> PageQuery(ArticlePageQry articlePageQry);

    /**
     * 浏览量 +1（best-effort，不影响主流程）
     * @param articleId
     */
    void incrementViewCount(Integer articleId);

    /**
     * 返回至少有一篇已发布文章的所有标签，按文章数降序排列。
     */
    List<Tag> getAllPublishedTags();

}
