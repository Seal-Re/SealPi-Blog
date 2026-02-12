package com.seal.blog.app.service;

import com.seal.blog.app.assembler.ArticleAssembler;
import com.seal.blog.client.article.api.ArticleServiceI;
import com.seal.blog.client.article.dto.cmd.ArticleCreateCmd;
import com.seal.blog.client.article.dto.cmd.ArticleUpdateCmd;
import com.seal.blog.client.article.dto.qry.ArticleByIdQry;
import com.seal.blog.client.article.dto.qry.ArticlePageQry;
import com.seal.blog.client.article.dto.vo.ArticleVO;
import com.seal.blog.client.common.PageResponse;
import com.seal.blog.client.common.Response;
import com.seal.blog.client.common.SingleResponse;
import com.seal.blog.domain.article.gateway.ArticleGateway;
import com.seal.blog.domain.article.model.Article;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ArticleServiceImpl implements ArticleServiceI {

    @Autowired
    private final ArticleAssembler articleAssembler;

    @Autowired
    private final ArticleGateway articleGateway;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response create(ArticleCreateCmd articleCreateCmd) {
        Article article = articleAssembler.toEntity(articleCreateCmd);
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
        Article article = articleGateway.findById(qry.getArticleid());

        if (article == null) {
            return SingleResponse.buildSingleFailure("404", "文章不存在");
        }

        return SingleResponse.of(articleAssembler.toVO(article));
    }

    @Override
    public PageResponse<ArticleVO> getPage(ArticlePageQry qry) {
        PageResponse<Article> articlePage = articleGateway.PageQuery(qry);

        return articleAssembler.toPageResponse(articlePage);
    }

}