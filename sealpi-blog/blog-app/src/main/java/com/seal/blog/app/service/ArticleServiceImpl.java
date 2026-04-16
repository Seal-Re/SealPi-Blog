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
import com.seal.blog.client.article.dto.vo.ArticleVO;
import com.seal.blog.client.article.dto.vo.TagVO;
import com.seal.blog.client.common.PageResponse;
import com.seal.blog.client.common.Response;
import com.seal.blog.client.common.SingleResponse;
import com.seal.blog.domain.article.gateway.ArticleGateway;
import com.seal.blog.domain.article.model.Article;

import java.util.List;
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
    public Response adminCreate(ArticleDraftSaveCmd cmd, String action, String coverImageUrl) {
        boolean publishing = "publish".equalsIgnoreCase(action);
        if (publishing && (cmd.getTitle() == null || cmd.getTitle().trim().isEmpty())) {
            return Response.buildFailure("400", "发布失败：标题不能为空");
        }
        String normalizedTitle = (cmd.getTitle() == null || cmd.getTitle().trim().isEmpty())
                ? DRAFT_PLACEHOLDER_TITLE
                : cmd.getTitle().trim();
        cmd.setTitle(normalizedTitle);

        Response validation = validateUrlUniqueForCreate(cmd.getUrl());
        if (validation != null) {
            return validation;
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

        return Response.buildSuccess();
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
    public Response delete(Integer aritcleId) {
        articleGateway.remove(aritcleId);

        return Response.buildSuccess();
    }

    @Override
    public SingleResponse<ArticleVO> getSingleById(ArticleByIdQry qry) {
        Article article = articleGateway.findById(qry.getArticleId());

        if (article == null) {
            return SingleResponse.buildSingleFailure("404", "文章不存在");
        }

        return SingleResponse.of(articleAssembler.toVO(article));
    }

    @Override
    public SingleResponse<ArticleVO> getSingleBySlug(ArticleBySlugQry qry) {
        Article article = articleGateway.findBySlug(qry.getSlug());

        if (article == null) {
            return SingleResponse.buildSingleFailure("404", "文章不存在");
        }

        try {
            articleGateway.incrementViewCount(article.getArticleId());
        } catch (Exception e) {
            log.warn("浏览量更新失败 articleId={}: {}", article.getArticleId(), e.getMessage());
        }

        return SingleResponse.of(articleAssembler.toVO(article));
    }

    @Override
    public PageResponse<ArticleVO> getPage(ArticlePageQry qry) {
        PageResponse<Article> articlePage = articleGateway.PageQuery(qry);

        return articleAssembler.toPageResponse(articlePage);
    }

    @Override
    public List<TagVO> getTags() {
        return articleGateway.getAllPublishedTags().stream()
                .map(articleAssembler::toTagVO)
                .collect(Collectors.toList());
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