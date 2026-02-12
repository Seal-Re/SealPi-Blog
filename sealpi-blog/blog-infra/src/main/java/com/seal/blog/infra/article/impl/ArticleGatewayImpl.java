package com.seal.blog.infra.article.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
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
        articleMapper.insert(articlePO);
        article.assignId(articlePO.getArticleId());
    }

    @Override
    public Article findById(Integer articleId) {
        ArticlePO articlePO = articleMapper.selectById(articleId);
        Article article = converter.toEntity(articlePO);
        return article;
    }

    @Override
    public void remove(Integer id) {
        ArticlePO articlePO = articleMapper.selectById(id);
        articleMapper.deleteById(id);
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
        if(articlePageQry.getKeyword() != null){
            queryWrapper.and(w -> w
                    .like(ArticlePO::getTitle, articlePageQry.getKeyword())
                    .or()
                    .like(ArticlePO::getSummary, articlePageQry.getKeyword())
            );
        }
        if(articlePageQry.getDraft() != null){
            queryWrapper.eq(ArticlePO::getDraft, articlePageQry.getDraft());
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
