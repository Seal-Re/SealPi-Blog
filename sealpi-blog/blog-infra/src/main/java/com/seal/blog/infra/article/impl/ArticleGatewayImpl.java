package com.seal.blog.infra.article.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.seal.blog.client.common.PageResponse;
import com.seal.blog.client.article.dto.qry.ArticlePageQry;
import com.seal.blog.domain.article.gateway.ArticleGateway;
import com.seal.blog.domain.article.model.Article;
import com.seal.blog.infra.article.converter.ArticleInfraConverter;
import com.seal.blog.infra.article.mapper.ArticleMapper;
import com.seal.blog.infra.article.mapper.RelyMapper;
import com.seal.blog.infra.article.po.ArticlePO;
import com.seal.blog.infra.article.po.RelyPO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
public class ArticleGatewayImpl implements ArticleGateway {

    @Autowired
    ArticleInfraConverter converter;

    @Autowired
    ArticleMapper articleMapper;

    @Autowired
    RelyMapper relyMapper;

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
        return converter.toEntity(articlePO);
    }

    @Override
    public void remove(Integer id) {
        ArticlePO articlePO = articleMapper.selectById(id);
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

        if(articlePageQry.getTagId() != null){
            LambdaQueryWrapper<RelyPO> relyWrapper = new LambdaQueryWrapper<>();
            relyWrapper.select(RelyPO::getArticleId)
                    .eq(RelyPO::getTagId, articlePageQry.getTagId());
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

        Collection<Article> entities = pageResult.getRecords().stream()
                .map(converter::toEntity)
                .collect(Collectors.toList());

        return PageResponse.of(
                entities,
                (int) pageResult.getTotal(),
                (int) pageResult.getSize(),
                (int) pageResult.getCurrent()
        );

    }

}
