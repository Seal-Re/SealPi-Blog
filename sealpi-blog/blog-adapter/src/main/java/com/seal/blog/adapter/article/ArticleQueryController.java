package com.seal.blog.adapter.article;

import com.seal.blog.client.article.api.ArticleServiceI;
import com.seal.blog.client.article.dto.qry.ArticleByIdQry;
import com.seal.blog.client.article.dto.qry.ArticleBySlugQry;
import com.seal.blog.client.article.dto.qry.ArticlePageQry;
import com.seal.blog.client.article.dto.vo.ArticleVO;
import com.seal.blog.client.article.dto.vo.TagVO;
import com.seal.blog.client.common.PageResponse;
import com.seal.blog.client.common.SingleResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class ArticleQueryController {

    @Autowired
    private ArticleServiceI articleService;

    @GetMapping("/articles/{id}")
    public SingleResponse<ArticleVO> getById(@PathVariable("id") Integer id) {
        ArticleByIdQry qry = new ArticleByIdQry();
        qry.setArticleId(id);
        return articleService.getSingleById(qry);
    }

    @GetMapping("/articles/slug/{slug}")
    public SingleResponse<ArticleVO> getBySlug(@PathVariable("slug") String slug) {
        ArticleBySlugQry qry = new ArticleBySlugQry();
        qry.setSlug(slug);
        return articleService.getSingleBySlug(qry);
    }

    @GetMapping("/articles")
    public PageResponse<ArticleVO> page(@Valid ArticlePageQry qry) {
        return articleService.getPage(qry);
    }

    @GetMapping("/tags")
    public List<TagVO> tags() {
        return articleService.getTags();
    }
}
