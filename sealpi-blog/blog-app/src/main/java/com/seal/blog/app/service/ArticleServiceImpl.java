package com.seal.blog.app.service;

import com.seal.blog.app.assembler.ArticleAssembler;
import com.seal.blog.client.article.api.ArticleServiceI;
import com.seal.blog.client.article.dto.cmd.ArticleCreateCmd;
import com.seal.blog.client.article.dto.cmd.ArticleDraftSaveCmd;
import com.seal.blog.client.article.dto.cmd.ArticleDraftUpdateCmd;
import com.seal.blog.client.article.dto.cmd.ArticleUpdateCmd;
import com.seal.blog.client.article.dto.qry.ArticleByIdQry;
import com.seal.blog.client.article.dto.qry.ArticleBySlugQry;
import com.seal.blog.client.article.dto.qry.ArticlePageQry;
import com.seal.blog.client.article.dto.vo.ArticleAdjacentVO;
import com.seal.blog.client.article.dto.vo.ArticleVO;
import com.seal.blog.client.article.dto.vo.TagVO;
import com.seal.blog.client.common.PageResponse;
import com.seal.blog.client.common.Response;
import com.seal.blog.client.common.SingleResponse;
import com.seal.blog.domain.article.gateway.ArticleGateway;
import com.seal.blog.domain.article.model.Article;
import com.seal.blog.domain.article.model.ArticleStatus;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ArticleServiceImpl implements ArticleServiceI {

    private static final String DRAFT_PLACEHOLDER_TITLE = "未命名草稿";

    private final ArticleAssembler articleAssembler;

    private final ArticleGateway articleGateway;

    private Response validateUrlUniqueForCreate(String url) {
        String normalized = url == null ? "" : url.trim();
        if (normalized.isEmpty()) {
            return Response.buildFailure("400", "文章slug不能为空");
        }
        Article existing = articleGateway.findBySlug(normalized);
        if (existing != null) {
            return Response.buildFailure("409", "文章slug已存在，请更换后重试");
        }
        return null;
    }

    private Response validateUrlUniqueForUpdate(Integer articleId, String url) {
        String normalized = url == null ? "" : url.trim();
        if (normalized.isEmpty()) {
            return Response.buildFailure("400", "文章slug不能为空");
        }
        Article existing = articleGateway.findBySlug(normalized);
        if (existing != null && !existing.getArticleId().equals(articleId)) {
            return Response.buildFailure("409", "文章slug已存在，请更换后重试");
        }
        return null;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response create(ArticleCreateCmd articleCreateCmd) {
        Response validation = validateUrlUniqueForCreate(articleCreateCmd.getUrl());
        if (validation != null) {
            return validation;
        }
        Article article = articleAssembler.toEntity(articleCreateCmd);
        articleGateway.save(article);

        return Response.buildSuccess();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public SingleResponse<Integer> adminCreate(ArticleDraftSaveCmd cmd, String action, String coverImageUrl) {
        boolean publishing = "publish".equalsIgnoreCase(action);
        if (publishing && (cmd.getTitle() == null || cmd.getTitle().trim().isEmpty())) {
            return SingleResponse.buildSingleFailure("400", "发布失败：标题不能为空");
        }
        String normalizedTitle = (cmd.getTitle() == null || cmd.getTitle().trim().isEmpty())
                ? DRAFT_PLACEHOLDER_TITLE
                : cmd.getTitle().trim();
        cmd.setTitle(normalizedTitle);

        Response validation = validateUrlUniqueForCreate(cmd.getUrl());
        if (validation != null) {
            return SingleResponse.buildSingleFailure(validation.getErrorCode(), validation.getErrorMessage());
        }
        Article article = new Article(cmd.getTitle(), cmd.getSummary(), cmd.getUrl());
        article.saveDraft(cmd.getDraftJson(), coverImageUrl, cmd.getDraftBodyMd(), cmd.getCoverCaption());

        if (publishing) {
            article.publishFromDraft(coverImageUrl);
        }

        articleGateway.save(article);

        if (cmd.getTags() != null) {
            articleGateway.setTagsForArticle(article.getArticleId(), cmd.getTags());
        }

        return SingleResponse.of(article.getArticleId());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response adminUpdate(ArticleDraftUpdateCmd cmd, String action, String coverImageUrl) {
        Article article = articleGateway.findById(cmd.getArticleId());
        if (article == null) {
            return Response.buildFailure("404", "文章不存在");
        }
        boolean publishing = "publish".equalsIgnoreCase(action);
        if (publishing && (cmd.getTitle() == null || cmd.getTitle().trim().isEmpty())) {
            return Response.buildFailure("400", "发布失败：标题不能为空");
        }
        String normalizedTitle = (cmd.getTitle() == null || cmd.getTitle().trim().isEmpty())
                ? DRAFT_PLACEHOLDER_TITLE
                : cmd.getTitle().trim();
        cmd.setTitle(normalizedTitle);
        Response validation = validateUrlUniqueForUpdate(cmd.getArticleId(), cmd.getUrl());
        if (validation != null) {
            return validation;
        }

        article.modify(cmd.getTitle(), cmd.getSummary(), cmd.getUrl());
        article.saveDraft(cmd.getDraftJson(), coverImageUrl, cmd.getDraftBodyMd(), cmd.getCoverCaption());

        if (publishing) {
            article.publishFromDraft(coverImageUrl);
        }

        articleGateway.save(article);

        if (cmd.getTags() != null) {
            articleGateway.setTagsForArticle(cmd.getArticleId(), cmd.getTags());
        }

        return Response.buildSuccess();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response adminOffline(Integer id) {
        Article article = articleGateway.findById(id);
        if (article == null) {
            return Response.buildFailure("404", "文章不存在");
        }
        article.offlineToDraft();
        articleGateway.save(article);
        return Response.buildSuccess();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response adminPublish(Integer id) {
        Article article = articleGateway.findById(id);
        if (article == null) {
            return Response.buildFailure("404", "文章不存在");
        }
        String title = article.getTitle();
        if (title == null || title.isBlank() || DRAFT_PLACEHOLDER_TITLE.equals(title.trim())) {
            return Response.buildFailure("400", "发布失败：请先在编辑器中设置标题");
        }
        String url = article.getUrl();
        if (url == null || url.isBlank()) {
            return Response.buildFailure("400", "发布失败：请先在编辑器中设置文章 slug");
        }
        article.publishFromDraft(null);
        articleGateway.save(article);
        return Response.buildSuccess();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response update(ArticleUpdateCmd articleUpdateCmd){
        Article article = articleGateway.findById(articleUpdateCmd.getArticleId());
        if(article == null){
            return Response.buildFailure("404", "文章不存在");
        }
        Response validation = validateUrlUniqueForUpdate(articleUpdateCmd.getArticleId(), articleUpdateCmd.getUrl());
        if (validation != null) {
            return validation;
        }

        article.modify(articleUpdateCmd.getTitle(), articleUpdateCmd.getSummary(), articleUpdateCmd.getUrl());

        articleGateway.save(article);

        return Response.buildSuccess();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response delete(Integer articleId) {
        articleGateway.remove(articleId);

        return Response.buildSuccess();
    }

    @Override
    public SingleResponse<ArticleVO> getSingleById(ArticleByIdQry qry) {
        Article article = articleGateway.findById(qry.getArticleId());

        if (article == null || article.getDraft() != ArticleStatus.PUBLISHED) {
            return SingleResponse.buildSingleFailure("404", "文章不存在");
        }

        return SingleResponse.of(articleAssembler.toPublicVO(article));
    }

    @Override
    public SingleResponse<ArticleVO> adminGetSingleById(Integer id) {
        Article article = articleGateway.findById(id);
        if (article == null) {
            return SingleResponse.buildSingleFailure("404", "文章不存在");
        }
        return SingleResponse.of(articleAssembler.toVO(article));
    }

    @Override
    public SingleResponse<ArticleVO> getSingleBySlug(ArticleBySlugQry qry) {
        Article article = articleGateway.findBySlug(qry.getSlug());

        if (article == null || article.getDraft() != ArticleStatus.PUBLISHED) {
            return SingleResponse.buildSingleFailure("404", "文章不存在");
        }

        return SingleResponse.of(articleAssembler.toPublicVO(article));
    }

    @Override
    public PageResponse<ArticleVO> getPage(ArticlePageQry qry) {
        PageResponse<Article> articlePage = articleGateway.PageQuery(qry);

        return articleAssembler.toPublicPageResponse(articlePage);
    }

    @Override
    public List<TagVO> getTags() {
        return articleGateway.getAllPublishedTags().stream()
                .map(articleAssembler::toTagVO)
                .collect(Collectors.toList());
    }

    @Override
    public SingleResponse<ArticleAdjacentVO> getAdjacentBySlug(String slug, List<String> tagNames) {
        Article current = articleGateway.findBySlug(slug);
        if (current == null || current.getDraft() != ArticleStatus.PUBLISHED) {
            ArticleAdjacentVO empty = new ArticleAdjacentVO();
            empty.setRelated(Collections.emptyList());
            return SingleResponse.of(empty);
        }

        String currentDate = current.getDate();
        Integer currentId = current.getArticleId();
        Article prevArticle = articleGateway.findPrevPublished(currentDate, currentId);
        Article nextArticle = articleGateway.findNextPublished(currentDate, currentId);

        Set<Integer> excludeIds = new HashSet<>();
        excludeIds.add(current.getArticleId());
        if (prevArticle != null && prevArticle.getArticleId() != null) {
            excludeIds.add(prevArticle.getArticleId());
        }
        if (nextArticle != null && nextArticle.getArticleId() != null) {
            excludeIds.add(nextArticle.getArticleId());
        }

        List<Article> relatedArticles = (tagNames != null && !tagNames.isEmpty())
                ? articleGateway.findRelatedPublished(tagNames, excludeIds, 3)
                : Collections.emptyList();

        ArticleAdjacentVO vo = buildAdjacentVO(prevArticle, nextArticle, relatedArticles);
        return SingleResponse.of(vo);
    }

    private ArticleAdjacentVO buildAdjacentVO(Article prev, Article next, List<Article> related) {
        ArticleAdjacentVO vo = new ArticleAdjacentVO();
        if (prev != null) {
            vo.setPrev(toAdjacentSummary(prev));
        }
        if (next != null) {
            vo.setNext(toAdjacentSummary(next));
        }
        vo.setRelated(related.stream().map(this::toAdjacentSummary).collect(Collectors.toList()));
        return vo;
    }

    private ArticleAdjacentVO.ArticleSummary toAdjacentSummary(Article article) {
        ArticleAdjacentVO.ArticleSummary s = new ArticleAdjacentVO.ArticleSummary();
        s.setTitle(article.getTitle());
        s.setUrl(article.getUrl());
        s.setSummary(article.getSummary());
        s.setCoverImageUrl(article.getCoverImageUrl());
        s.setDate(article.getDate());
        s.setTags(article.getTags() != null
                ? article.getTags().stream()
                        .map(com.seal.blog.domain.article.model.Tag::getName)
                        .filter(n -> n != null && !n.isBlank())
                        .collect(Collectors.toList())
                : Collections.emptyList());
        return s;
    }

    @Override
    public Response incrementViewCount(Integer articleId) {
        if (articleId == null || articleId <= 0) {
            return Response.buildFailure("400", "文章ID不合法");
        }
        try {
            articleGateway.incrementViewCount(articleId);
        } catch (Exception e) {
            log.warn("浏览量更新失败 articleId={}: {}", articleId, e.getMessage());
        }
        return Response.buildSuccess();
    }

}