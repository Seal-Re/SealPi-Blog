package com.seal.blog.domain.article.gateway;

import com.seal.blog.client.common.PageResponse;
import com.seal.blog.client.article.dto.qry.ArticlePageQry;
import com.seal.blog.domain.article.model.Article;

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
     * 分页
     * @param articlePageQry
     * @return
     */
    PageResponse<Article> PageQuery(ArticlePageQry articlePageQry);



}
