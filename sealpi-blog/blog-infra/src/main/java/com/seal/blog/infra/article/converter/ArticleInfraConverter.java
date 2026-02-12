package com.seal.blog.infra.article.converter;

import com.seal.blog.domain.article.model.Article;
import com.seal.blog.domain.article.model.ArticleStatus;
import com.seal.blog.infra.article.po.ArticlePO;
import org.springframework.stereotype.Component;

@Component
public class ArticleInfraConverter {

    public ArticlePO toPO(Article entity){
        if(entity==null){
            return null;
        }
        ArticlePO po = new ArticlePO();

        po.setArticleId(entity.getArticleId());
        po.setTitle(entity.getTitle());
        po.setSummary(entity.getSummary());
        po.setUrl(entity.getUrl());
        po.setDate(entity.getDate());
        po.setLastmod(entity.getLastmod());
        po.setCount(entity.getCount());

        po.setDraft(entity.getDraft().getCode());
        return po;
    }

    public Article toEntity(ArticlePO po){
        if(po==null){
            return null;
        }
        Article entity = Article.reconstruct(
                po.getArticleId(),
                po.getTitle(),
                po.getSummary(),
                po.getUrl(),
                po.getDate(),
                po.getLastmod(),
                ArticleStatus.of(po.getDraft()),
                po.getCount()
        );
        return entity;
    }
}
