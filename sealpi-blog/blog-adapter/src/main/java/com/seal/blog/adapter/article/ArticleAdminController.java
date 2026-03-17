package com.seal.blog.adapter.article;

import com.seal.blog.client.article.api.ArticleServiceI;
import com.seal.blog.client.article.dto.cmd.ArticleCreateCmd;
import com.seal.blog.client.article.dto.cmd.ArticleDraftSaveCmd;
import com.seal.blog.client.article.dto.cmd.ArticleDraftUpdateCmd;
import com.seal.blog.client.article.dto.cmd.ArticleUpdateCmd;
import com.seal.blog.client.common.Response;
import com.seal.blog.infra.oss.MinioObjectStorage;
import jakarta.validation.Valid;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/admin")
public class ArticleAdminController {

    @Autowired
    private ArticleServiceI articleService;

    @Autowired
    private MinioObjectStorage objectStorage;

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
     * v1 admin write (deprecated JSON form): create article draft / publish.
     *
     * Deprecated in favor of multipart form: `draftJson` + optional `previewImage`.
     * Keep for one compatibility release.
     */
    @Deprecated
    @PostMapping("/articles")
    public Response adminCreate(
            @Valid @RequestBody ArticleDraftSaveCmd cmd,
            @RequestParam(name = "action", defaultValue = "draft") String action,
            @RequestParam(name = "coverImageUrl", required = false) String coverImageUrl
    ) {
        return articleService.adminCreate(cmd, action, coverImageUrl);
    }

    /**
     * v1 admin write (multipart form): create article draft / publish.
     *
     * Form fields:
     * - title, url, summary(optional), draftJson
     * - previewImage(optional): image file, uploaded to OSS to produce coverImageUrl
     */
    @PostMapping(value = "/articles", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Response adminCreateMultipart(
            @RequestParam("title") String title,
            @RequestParam(name = "summary", required = false) String summary,
            @RequestParam("url") String url,
            @RequestParam("draftJson") String draftJson,
            @RequestParam(name = "previewImage", required = false) MultipartFile previewImage,
            @RequestParam(name = "action", defaultValue = "draft") String action,
            @RequestParam(name = "coverImageUrl", required = false) String coverImageUrl
    ) {
        // v1: multipart accepts a preview image; if provided, upload it and use returned URL as coverImageUrl.
        String finalCoverUrl = coverImageUrl;
        if (previewImage != null && !previewImage.isEmpty()) {
            try {
                finalCoverUrl = objectStorage.upload(
                        previewImage.getInputStream(),
                        previewImage.getSize(),
                        previewImage.getContentType(),
                        previewImage.getOriginalFilename()
                );
            } catch (IOException e) {
                throw new IllegalStateException("previewImage read failed", e);
            }
        }

        return articleService.adminCreate(
                new ArticleDraftSaveCmd(title, summary, url, draftJson),
                action,
                finalCoverUrl
        );
    }

    /**
     * v1 admin write (deprecated JSON form): update article draft / publish.
     */
    @Deprecated
    @PutMapping("/articles/{id}")
    public Response adminUpdate(
            @PathVariable("id") Integer id,
            @Valid @RequestBody ArticleDraftUpdateCmd cmd,
            @RequestParam(name = "action", defaultValue = "draft") String action,
            @RequestParam(name = "coverImageUrl", required = false) String coverImageUrl
    ) {
        // keep path id as the source of truth, but still allow cmd to carry it for DTO compatibility
        cmd.setArticleId(id);
        return articleService.adminUpdate(cmd, action, coverImageUrl);
    }

    /**
     * v1 admin write (multipart form): update article draft / publish.
     */
    @PutMapping(value = "/articles/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Response adminUpdateMultipart(
            @PathVariable("id") Integer id,
            @RequestParam("title") String title,
            @RequestParam(name = "summary", required = false) String summary,
            @RequestParam("url") String url,
            @RequestParam("draftJson") String draftJson,
            @RequestParam(name = "previewImage", required = false) MultipartFile previewImage,
            @RequestParam(name = "action", defaultValue = "draft") String action,
            @RequestParam(name = "coverImageUrl", required = false) String coverImageUrl
    ) {
        String finalCoverUrl = coverImageUrl;
        if (previewImage != null && !previewImage.isEmpty()) {
            try {
                finalCoverUrl = objectStorage.upload(
                        previewImage.getInputStream(),
                        previewImage.getSize(),
                        previewImage.getContentType(),
                        previewImage.getOriginalFilename()
                );
            } catch (IOException e) {
                throw new IllegalStateException("previewImage read failed", e);
            }
        }

        ArticleDraftUpdateCmd cmd = new ArticleDraftUpdateCmd();
        cmd.setArticleId(id);
        cmd.setTitle(title);
        cmd.setSummary(summary);
        cmd.setUrl(url);
        cmd.setDraftJson(draftJson);
        return articleService.adminUpdate(cmd, action, finalCoverUrl);
    }

    @DeleteMapping("/articles/{id}")
    public Response delete(@PathVariable("id") Integer id) {
        return articleService.delete(id);
    }
}
