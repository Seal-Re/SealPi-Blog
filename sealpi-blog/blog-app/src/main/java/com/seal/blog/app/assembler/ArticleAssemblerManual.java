package com.seal.blog.app.assembler;

import com.seal.blog.client.article.dto.vo.ArticleVO;
import com.seal.blog.domain.article.model.Article;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collection;

/**
 * Fallback assembler used when MapStruct generated implementation is unavailable at runtime.
 */
@Primary
@Component
public class ArticleAssemblerManual implements ArticleAssembler {

    @Override
    public ArticleVO toVO(Article article) {
        if (article == null) {
            return null;
        }
        ArticleVO vo = new ArticleVO();
        if (article.getArticleId() != null) {
            vo.setArticleId(String.valueOf(article.getArticleId()));
        }
        vo.setTitle(article.getTitle());
        vo.setDate(article.getDate());
        vo.setLastmod(article.getLastmod());
        vo.setUrl(article.getUrl());
        vo.setSummary(article.getSummary());
        vo.setContentJson(article.getContentJson());
        vo.setDraftJson(article.getDraftJson());
        vo.setCoverImageUrl(article.getCoverImageUrl());
        vo.setViewCount(article.getViewCount());
        vo.setDraft(map(article.getDraft()));
        vo.setCount(article.getCount());
        return vo;
    }

    @Override
    public Collection<ArticleVO> toVOList(Collection<Article> articles) {
        if (articles == null) {
            return null;
        }
        Collection<ArticleVO> out = new ArrayList<>(articles.size());
        for (Article article : articles) {
            out.add(toVO(article));
        }
        return out;
    }
}
