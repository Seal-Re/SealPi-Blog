package com.seal.blog.adapter.article;

import com.seal.blog.client.article.api.ArticleServiceI;
import com.seal.blog.client.article.dto.cmd.ArticleCreateCmd;
import com.seal.blog.client.article.dto.cmd.ArticleUpdateCmd;
import com.seal.blog.client.common.Response;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
public class ArticleAdminController {

    @Autowired
    private ArticleServiceI articleService;

    // Legacy create/update endpoints (non-admin draft/publish semantics).
    // Keep them for now under /legacy to avoid conflicting with v1 admin write endpoints.
    @PostMapping("/legacy/articles")
    public Response create(@Valid @RequestBody ArticleCreateCmd cmd) {
        return articleService.create(cmd);
    }

    @PutMapping("/legacy/articles")
    public Response update(@Valid @RequestBody ArticleUpdateCmd cmd) {
        return articleService.update(cmd);
    }

    /**
     * v1 admin write: create article draft / publish.
     *
     * Note: coverImageUrl is the exported preview image URL (single cover for OG/list fallback).
     */
    @PostMapping("/articles")
    public Response adminCreate(
            @Valid @RequestBody com.seal.blog.client.article.dto.cmd.ArticleDraftSaveCmd cmd,
            @org.springframework.web.bind.annotation.RequestParam(name = "action", defaultValue = "draft") String action,
            @org.springframework.web.bind.annotation.RequestParam(name = "coverImageUrl", required = false) String coverImageUrl
    ) {
        return articleService.adminCreate(cmd, action, coverImageUrl);
    }

    /**
     * v1 admin write: update article draft / publish.
     */
    @PutMapping("/articles/{id}")
    public Response adminUpdate(
            @PathVariable("id") Integer id,
            @Valid @RequestBody com.seal.blog.client.article.dto.cmd.ArticleDraftUpdateCmd cmd,
            @org.springframework.web.bind.annotation.RequestParam(name = "action", defaultValue = "draft") String action,
            @org.springframework.web.bind.annotation.RequestParam(name = "coverImageUrl", required = false) String coverImageUrl
    ) {
        // keep path id as the source of truth, but still allow cmd to carry it for DTO compatibility
        cmd.setArticleId(id);
        return articleService.adminUpdate(cmd, action, coverImageUrl);
    }

    @DeleteMapping("/articles/{id}")
    public Response delete(@PathVariable("id") Integer id) {
        return articleService.delete(id);
    }
}
