package com.seal.blog.app.assembler;

import com.seal.blog.client.article.dto.cmd.ArticleCreateCmd;
import com.seal.blog.client.common.PageResponse;
import com.seal.blog.client.article.dto.vo.ArticleVO;
import com.seal.blog.client.article.dto.vo.TagVO;
import com.seal.blog.domain.article.model.Article;
import com.seal.blog.domain.article.model.ArticleStatus;
import com.seal.blog.domain.article.model.Tag;
import org.mapstruct.Mapper;
import org.mapstruct.Named;
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
     * Entity -> VO (full, for admin use — includes draft fields).
     */
    ArticleVO toVO(Article article);

    /**
     * Entity -> VO stripped of draft-only fields (for public endpoints).
     * Prevents in-progress draft content from leaking to unauthenticated callers.
     * @Named prevents MapStruct from picking this up as an implicit collection mapping method.
     */
    @Named("toPublicVO")
    default ArticleVO toPublicVO(Article article) {
        ArticleVO vo = toVO(article);
        if (vo == null) {
            return null;
        }
        vo.setReadMinutes(computeReadMinutes(article.getBodyMd()));
        vo.setDraftJson(null);
        vo.setDraftBodyMd(null);
        return vo;
    }

    /**
     * Estimates reading time in minutes from a Markdown string.
     * Uses separate rates for CJK (~300 chars/min) and Latin (~220 words/min)
     * to handle mixed Chinese/English content accurately. Returns null for blank input.
     */
    default Integer computeReadMinutes(String bodyMd) {
        if (bodyMd == null || bodyMd.isBlank()) {
            return null;
        }
        long cjk = bodyMd.chars()
                .filter(c -> (c >= 0x4E00 && c <= 0x9FFF)
                        || (c >= 0x3400 && c <= 0x4DBF)
                        || (c >= 0xF900 && c <= 0xFAFF))
                .count();
        String stripped = bodyMd.replaceAll("[\\u4E00-\\u9FFF\\u3400-\\u4DBF\\uF900-\\uFAFF]", " ").trim();
        long latinWords = stripped.isBlank() ? 0
                : java.util.Arrays.stream(stripped.split("\\s+")).filter(w -> !w.isBlank()).count();
        return (int) Math.max(1, Math.round(cjk / 300.0 + latinWords / 220.0));
    }

    /**
     * 分页转换 (public — strips draft fields and large body/content fields not used on list pages).
     * bodyMd and contentJson are omitted here because list consumers only need title/summary/tags/cover.
     * The full fields remain available on the individual article detail endpoint.
     */
    default PageResponse<ArticleVO> toPublicPageResponse(PageResponse<Article> pages) {
        if (pages == null) {
            return PageResponse.empty();
        }

        Collection<ArticleVO> voList = pages.getData() == null ? java.util.Collections.emptyList()
                : pages.getData().stream()
                        .map(article -> {
                            ArticleVO vo = toPublicVO(article);
                            if (vo != null) {
                                vo.setBodyMd(null);
                                vo.setContentJson(null);
                            }
                            return vo;
                        })
                        .collect(java.util.stream.Collectors.toList());

        return PageResponse.of(
                voList,
                pages.getTotalCount(),
                pages.getPageSize(),
                pages.getPageIndex()
        );
    }

    /**
     * Domain Tag -> VO
     */
    TagVO toTagVO(Tag tag);

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