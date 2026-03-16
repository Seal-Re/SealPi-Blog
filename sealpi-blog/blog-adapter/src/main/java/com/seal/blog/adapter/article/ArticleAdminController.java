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

    @PostMapping("/articles")
    public Response create(@Valid @RequestBody ArticleCreateCmd cmd) {
        return articleService.create(cmd);
    }

    @PutMapping("/articles")
    public Response update(@Valid @RequestBody ArticleUpdateCmd cmd) {
        return articleService.update(cmd);
    }

    @DeleteMapping("/articles/{id}")
    public Response delete(@PathVariable("id") Integer id) {
        return articleService.delete(id);
    }
}
