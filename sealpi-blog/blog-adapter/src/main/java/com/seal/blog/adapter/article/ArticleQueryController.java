package com.seal.blog.adapter.article;

import com.seal.blog.client.article.api.ArticleServiceI;
import com.seal.blog.client.article.dto.qry.ArticleByIdQry;
import com.seal.blog.client.article.dto.qry.ArticleBySlugQry;
import com.seal.blog.client.article.dto.qry.ArticlePageQry;
import com.seal.blog.client.article.dto.vo.ArticleAdjacentVO;
import com.seal.blog.client.article.dto.vo.ArticleVO;
import com.seal.blog.client.article.dto.vo.TagVO;
import com.seal.blog.client.common.PageResponse;
import com.seal.blog.client.common.Response;
import com.seal.blog.client.common.SingleResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ArticleQueryController {

    private final ArticleServiceI articleService;

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
        // Public endpoint ALWAYS returns published articles only.
        // Draft/archived enumeration requires the admin-authenticated endpoint (/api/v1/admin/articles).
        qry.setStatus("published");
        qry.setDraft(null);
        return articleService.getPage(qry);
    }

    /**
     * Returns prev/next adjacent published articles and up to 3 related articles (by shared tag).
     * Always returns 200 with an empty payload if the slug is not found or not published.
     *
     * @param slug     the current article's URL slug
     * @param tags     optional comma-separated or repeated tag names for related-articles lookup
     */
    @GetMapping("/articles/adjacent")
    public SingleResponse<ArticleAdjacentVO> adjacent(
            @RequestParam("slug") String slug,
            @RequestParam(value = "tags", required = false) List<String> tags) {
        return articleService.getAdjacentBySlug(slug, tags);
    }

    @GetMapping("/tags")
    public List<TagVO> tags() {
        return articleService.getTags();
    }

    @PostMapping("/articles/{id}/view")
    public Response recordView(@PathVariable("id") Integer id) {
        return articleService.incrementViewCount(id);
    }
}
