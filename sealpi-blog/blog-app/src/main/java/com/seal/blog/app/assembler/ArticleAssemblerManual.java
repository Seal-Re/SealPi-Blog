package com.seal.blog.app.assembler;

import com.seal.blog.client.article.dto.vo.ArticleVO;
import com.seal.blog.client.article.dto.vo.TagVO;
import com.seal.blog.domain.article.model.Article;
import com.seal.blog.domain.article.model.Tag;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

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
        vo.setBodyMd(article.getBodyMd());
        vo.setDraftBodyMd(article.getDraftBodyMd());
        vo.setCoverCaption(article.getCoverCaption());
        vo.setDraft(map(article.getDraft()));
        vo.setCount(article.getCount());
        if (article.getTags() != null) {
            List<TagVO> tagVOs = article.getTags().stream()
                    .map(this::toTagVO)
                    .collect(Collectors.toList());
            vo.setTags(tagVOs);
        }
        return vo;
    }

    @Override
    public TagVO toTagVO(Tag tag) {
        if (tag == null) {
            return null;
        }
        TagVO vo = new TagVO();
        vo.setTagId(tag.getTagId());
        vo.setName(tag.getName());
        vo.setCount(tag.getCount());
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
