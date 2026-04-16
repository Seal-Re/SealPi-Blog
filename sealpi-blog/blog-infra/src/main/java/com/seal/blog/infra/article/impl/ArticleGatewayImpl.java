package com.seal.blog.infra.article.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.seal.blog.client.common.PageResponse;
import com.seal.blog.client.article.dto.qry.ArticlePageQry;
import com.seal.blog.domain.article.gateway.ArticleGateway;
import com.seal.blog.domain.article.model.Article;
import com.seal.blog.domain.article.model.Tag;
import com.seal.blog.infra.article.converter.ArticleInfraConverter;
import com.seal.blog.infra.article.mapper.ArticleMapper;
import com.seal.blog.infra.article.mapper.RelyMapper;
import com.seal.blog.infra.article.mapper.TagMapper;
import com.seal.blog.infra.article.po.ArticlePO;
import com.seal.blog.infra.article.po.RelyPO;
import com.seal.blog.infra.article.po.TagPO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
public class ArticleGatewayImpl implements ArticleGateway {

    private final ArticleInfraConverter converter;

    private final ArticleMapper articleMapper;

    private final RelyMapper relyMapper;

    private final TagMapper tagMapper;

    @Override
    public void save(Article article) {
        ArticlePO articlePO = converter.toPO(article);

        // Treat save() as upsert: insert when id is null, otherwise update.
        // This matches the application-layer semantics for create/update flows.
        if (articlePO.getArticleId() == null) {
            articleMapper.insert(articlePO);
            article.assignId(articlePO.getArticleId());
            return;
        }

        articleMapper.updateById(articlePO);
    }

    @Override
    public Article findById(Integer articleId) {
        ArticlePO articlePO = articleMapper.selectById(articleId);
        Article article = converter.toEntity(articlePO);
        if (article != null) {
            Map<Integer, List<Tag>> tagsMap = loadTagsForArticles(List.of(articleId));
            article.withTags(tagsMap.getOrDefault(articleId, Collections.emptyList()));
        }
        return article;
    }

    @Override
    public Article findBySlug(String slug) {
        if (slug == null || slug.isBlank()) {
            return null;
        }

        LambdaQueryWrapper<ArticlePO> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(ArticlePO::getUrl, slug)
                .last("limit 1");
        ArticlePO articlePO = articleMapper.selectOne(queryWrapper);
        Article article = converter.toEntity(articlePO);
        if (article != null && article.getArticleId() != null) {
            Map<Integer, List<Tag>> tagsMap = loadTagsForArticles(List.of(article.getArticleId()));
            article.withTags(tagsMap.getOrDefault(article.getArticleId(), Collections.emptyList()));
        }
        return article;
    }

    @Override
    public void remove(Integer id) {
        // Clean up tag relationships before removing the article
        LambdaQueryWrapper<RelyPO> relyWrapper = new LambdaQueryWrapper<>();
        relyWrapper.eq(RelyPO::getArticleId, id);
        relyMapper.delete(relyWrapper);

        articleMapper.deleteById(id);
    }

    @Override
    public void incrementViewCount(Integer articleId) {
        if (articleId == null) {
            return;
        }
        LambdaUpdateWrapper<ArticlePO> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(ArticlePO::getArticleId, articleId)
               .setSql("view_count = COALESCE(view_count, 0) + 1");
        articleMapper.update(null, wrapper);
    }

    @Override
    public PageResponse<Article> PageQuery(ArticlePageQry articlePageQry){
        List<Integer> articleIds = null;

        // Resolve tag name → tagId if a tag name was provided
        Integer resolvedTagId = articlePageQry.getTagId();
        if (resolvedTagId == null && articlePageQry.getTag() != null && !articlePageQry.getTag().isBlank()) {
            LambdaQueryWrapper<TagPO> tagWrapper = new LambdaQueryWrapper<>();
            tagWrapper.eq(TagPO::getName, articlePageQry.getTag()).last("limit 1");
            TagPO tagPO = tagMapper.selectOne(tagWrapper);
            if (tagPO == null) {
                return PageResponse.of(
                        Collections.emptyList(),
                        0,
                        articlePageQry.getPageSize(),
                        articlePageQry.getPageIndex()
                );
            }
            resolvedTagId = tagPO.getTagId();
        }

        if (resolvedTagId != null) {
            LambdaQueryWrapper<RelyPO> relyWrapper = new LambdaQueryWrapper<>();
            relyWrapper.select(RelyPO::getArticleId)
                    .eq(RelyPO::getTagId, resolvedTagId);
            List<Object> ids = relyMapper.selectObjs(relyWrapper);

            if (ids.isEmpty()) {
                return PageResponse.of(
                        Collections.emptyList(),
                        0,
                        articlePageQry.getPageSize(),
                        articlePageQry.getPageIndex()
                );
            }

            articleIds = ids.stream()
                    .map(id -> (Integer) id)
                    .collect(Collectors.toList());
        }

        LambdaQueryWrapper<ArticlePO> queryWrapper = new LambdaQueryWrapper<>();
        String keyword = articlePageQry.resolveKeyword();
        Integer draft = articlePageQry.resolveDraft();
        if(keyword != null && !keyword.isBlank()){
            queryWrapper.and(w -> w
                    .like(ArticlePO::getTitle, keyword)
                    .or()
                    .like(ArticlePO::getSummary, keyword)
                    .or()
                    .like(ArticlePO::getUrl, keyword)
            );
        }
        if(draft != null){
            queryWrapper.eq(ArticlePO::getDraft, draft);
        }
        if(articleIds != null){
            queryWrapper.in(ArticlePO::getArticleId, articleIds);
        }

        queryWrapper.orderByDesc(ArticlePO::getDate);

        Page<ArticlePO> pageRequest = new Page<>(
                articlePageQry.getPageIndex(),
                articlePageQry.getPageSize());
        Page<ArticlePO> pageResult = articleMapper.selectPage(pageRequest, queryWrapper);

        List<Article> entities = pageResult.getRecords().stream()
                .map(converter::toEntity)
                .collect(Collectors.toList());

        // Batch-load tags for all returned articles
        List<Integer> resultIds = entities.stream()
                .filter(a -> a.getArticleId() != null)
                .map(Article::getArticleId)
                .collect(Collectors.toList());
        Map<Integer, List<Tag>> tagsMap = loadTagsForArticles(resultIds);
        entities.forEach(a -> a.withTags(tagsMap.getOrDefault(a.getArticleId(), Collections.emptyList())));

        return PageResponse.of(
                entities,
                (int) pageResult.getTotal(),
                (int) pageResult.getSize(),
                (int) pageResult.getCurrent()
        );

    }

    @Override
    public List<Tag> getAllPublishedTags() {
        List<TagPO> tagPos = tagMapper.selectPublishedTagsWithCount();
        return tagPos.stream()
                .map(po -> Tag.reconstruct(po.getTagId(), po.getName(), po.getCount()))
                .collect(Collectors.toList());
    }

    @Override
    public void setTagsForArticle(Integer articleId, List<String> tagNames) {
        if (articleId == null) {
            return;
        }

        // 1. Clear existing article-tag relationships
        LambdaQueryWrapper<RelyPO> deleteWrapper = new LambdaQueryWrapper<>();
        deleteWrapper.eq(RelyPO::getArticleId, articleId);
        relyMapper.delete(deleteWrapper);

        if (tagNames == null || tagNames.isEmpty()) {
            return;
        }

        // 2. Normalize: trim, filter empty, deduplicate (preserve order)
        List<String> normalized = tagNames.stream()
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .distinct()
                .collect(Collectors.toList());

        for (String tagName : normalized) {
            // 3. Find or create the tag by name
            LambdaQueryWrapper<TagPO> tagWrapper = new LambdaQueryWrapper<>();
            tagWrapper.eq(TagPO::getName, tagName).last("limit 1");
            TagPO tagPO = tagMapper.selectOne(tagWrapper);

            if (tagPO == null) {
                tagPO = new TagPO();
                tagPO.setName(tagName);
                tagPO.setCount(0);
                tagMapper.insert(tagPO);
            }

            // 4. Create the article-tag relationship
            RelyPO relyPO = new RelyPO();
            relyPO.setArticleId(articleId);
            relyPO.setTagId(tagPO.getTagId());
            relyMapper.insert(relyPO);
        }
    }

    private Map<Integer, List<Tag>> loadTagsForArticles(List<Integer> articleIds) {
        if (articleIds == null || articleIds.isEmpty()) {
            return Collections.emptyMap();
        }

        LambdaQueryWrapper<RelyPO> relyWrapper = new LambdaQueryWrapper<>();
        relyWrapper.in(RelyPO::getArticleId, articleIds);
        List<RelyPO> relies = relyMapper.selectList(relyWrapper);

        if (relies.isEmpty()) {
            return Collections.emptyMap();
        }

        List<Integer> tagIds = relies.stream()
                .map(RelyPO::getTagId)
                .distinct()
                .collect(Collectors.toList());

        LambdaQueryWrapper<TagPO> tagWrapper = new LambdaQueryWrapper<>();
        tagWrapper.in(TagPO::getTagId, tagIds);
        List<TagPO> tagPos = tagMapper.selectList(tagWrapper);

        Map<Integer, TagPO> tagPoMap = tagPos.stream()
                .collect(Collectors.toMap(TagPO::getTagId, t -> t));

        Map<Integer, List<Tag>> result = new HashMap<>();
        for (RelyPO rely : relies) {
            TagPO tagPO = tagPoMap.get(rely.getTagId());
            if (tagPO != null) {
                Tag tag = Tag.reconstruct(tagPO.getTagId(), tagPO.getName(), tagPO.getCount());
                result.computeIfAbsent(rely.getArticleId(), k -> new ArrayList<>()).add(tag);
            }
        }

        return result;
    }

}
