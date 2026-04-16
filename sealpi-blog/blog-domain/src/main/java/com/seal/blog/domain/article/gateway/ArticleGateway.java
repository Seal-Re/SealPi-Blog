package com.seal.blog.domain.article.gateway;

import com.seal.blog.client.common.PageResponse;
import com.seal.blog.client.article.dto.qry.ArticlePageQry;
import com.seal.blog.domain.article.model.Article;
import com.seal.blog.domain.article.model.Tag;

import java.util.List;
import java.util.Set;

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

    /**
     * 全量替换文章的标签（先清空旧关联，再按名称 findOrCreate 写入）。
     * tagNames 为空时仅执行清空操作，不报错。
     * @param articleId 文章 ID（不能为 null）
     * @param tagNames  标签名列表（null 视为空列表）
     */
    void setTagsForArticle(Integer articleId, List<String> tagNames);

    /**
     * 查找比当前文章更新（在按日期降序的列表中排在前面）的已发布文章。
     * 使用 (date, articleId) 复合比较：date > currentDate，或 date = currentDate 且 articleId > currentArticleId。
     * 按 (date ASC, articleId ASC) LIMIT 1，取最接近的那篇。
     * @param currentDate      当前文章的发布日期字符串（如 2026-03-25）
     * @param currentArticleId 当前文章的 ID，用于同日期时的稳定排序
     * @return 最邻近的更新文章，若无则返回 null
     */
    Article findPrevPublished(String currentDate, Integer currentArticleId);

    /**
     * 查找比当前文章更旧（在按日期降序的列表中排在后面）的已发布文章。
     * 使用 (date, articleId) 复合比较：date < currentDate，或 date = currentDate 且 articleId < currentArticleId。
     * 按 (date DESC, articleId DESC) LIMIT 1，取最接近的那篇。
     * @param currentDate      当前文章的发布日期字符串
     * @param currentArticleId 当前文章的 ID，用于同日期时的稳定排序
     * @return 最邻近的更旧文章，若无则返回 null
     */
    Article findNextPublished(String currentDate, Integer currentArticleId);

    /**
     * 查找相关已发布文章：与给定标签名称中至少一个相匹配，排除指定文章 ID，按日期降序，最多取 limit 篇。
     * @param tagNames   标签名称列表
     * @param excludeIds 需要排除的文章 ID 集合
     * @param limit      最多返回篇数（调用方应传合理值如 3）
     * @return 相关文章列表（可能为空），每篇文章已加载标签
     */
    List<Article> findRelatedPublished(List<String> tagNames, Set<Integer> excludeIds, int limit);

}
