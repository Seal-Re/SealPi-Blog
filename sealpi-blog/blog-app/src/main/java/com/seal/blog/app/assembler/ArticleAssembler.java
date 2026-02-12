package com.seal.blog.app.assembler;

import com.seal.blog.client.article.dto.cmd.ArticleCreateCmd;
import com.seal.blog.client.common.PageResponse;
import com.seal.blog.client.article.dto.vo.ArticleVO;
import com.seal.blog.domain.article.model.Article;
import com.seal.blog.domain.article.model.ArticleStatus;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

import java.util.Collection;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ArticleAssembler {

    /**
     * Cmd -> Entity
     */
    default Article toEntity(ArticleCreateCmd cmd) {
        if (cmd == null) {
            return null;
        }
        return new Article(cmd.getTitle(), cmd.getSummary(), cmd.getUrl());
    }

    /**
     * Entity -> VO
     */
    ArticleVO toVO(Article article);

    /**
     * 列表转换 (Collection -> Collection)
     */
    Collection<ArticleVO> toVOList(Collection<Article> articles);

    /**
     * 分页转换
     */
    default PageResponse<ArticleVO> toPageResponse(PageResponse<Article> pages) {
        if (pages == null) {
            return PageResponse.empty();
        }

        Collection<ArticleVO> voList = toVOList(pages.getData());

        return PageResponse.of(
                voList,
                pages.getTotalCount(),
                pages.getPageSize(),
                pages.getPageIndex()
        );
    }

    /**
     * 枚举 -> Integer
     */
    default Integer map(ArticleStatus draft) {
        if (draft == null) {
            return null;
        }
        return draft.getCode();
    }
}