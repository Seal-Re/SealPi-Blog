package com.seal.blog.adapter;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.seal.blog.client.article.api.ArticleServiceI;
import com.seal.blog.client.article.dto.cmd.ArticleDraftSaveCmd;
import com.seal.blog.client.article.dto.vo.ArticleAdjacentVO;
import com.seal.blog.client.common.Response;
import com.seal.blog.client.common.SingleResponse;
import com.seal.blog.client.user.api.UserServiceI;
import com.seal.blog.client.user.dto.qry.UserPageQry;
import org.mockito.ArgumentCaptor;
import com.seal.blog.infra.oss.MinioObjectStorage;
import java.nio.charset.StandardCharsets;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
        properties = {
                // Minimal config to let AdminAuthFilter/AdminJwtVerifier start in test context.
                "admin.jwt.secret=test-secret",
                "admin.github.userIds=123",
                "admin.jwt.githubUserIdClaim=githubUserId",
                // Tests still assert legacy self-signed JWT behavior.
                "admin.auth.allowLegacyJwt=true",
                "blog.internal.sync.secret=test-internal",
                // Use H2 in-memory DB so blog-infra beans can load without MySQL.
                "spring.datasource.url=jdbc:h2:mem:testdb;MODE=MySQL;DB_CLOSE_DELAY=-1",
                "spring.datasource.driver-class-name=org.h2.Driver",
                "spring.datasource.username=sa",
                "spring.datasource.password=",
                // Flyway migrations use MySQL-specific DDL — skip in unit tests.
                "spring.flyway.enabled=false"
        }
)
@AutoConfigureMockMvc
class BlogAdapterApplicationTests {

    @Autowired
    private MockMvc mvc;

    @MockBean
    private ArticleServiceI articleService;

    @MockBean
    private UserServiceI userService;

    // ArticleAdminController requires this bean; mock it to avoid pulling full blog-infra context.
    @MockBean
    private MinioObjectStorage objectStorage;

    @Test
    void adminApi_withoutAuthHeader_returns401() throws Exception {
        mvc.perform(
                multipart("/api/v1/admin/articles")
                        .param("title", "t")
                        .param("url", "u")
                        .param("draftJson", "{}")
                        .param("action", "draft")
        ).andExpect(status().isUnauthorized());
    }

    @Test
    void adminApi_withGarbageAuthHeader_returns401() throws Exception {
        mvc.perform(
                multipart("/api/v1/admin/articles")
                        .header("Authorization", "Bearer not-a-jwt")
                        .param("title", "t")
                        .param("url", "u")
                        .param("draftJson", "{}")
                        .param("action", "draft")
        ).andExpect(status().isUnauthorized());
    }

    @Test
    void adminApi_withValidSignatureButNonWhitelistedUser_returns403() throws Exception {
        mvc.perform(
                multipart("/api/v1/admin/articles")
                        .header("Authorization", bearerToken("999"))
                        .param("title", "t")
                        .param("url", "u")
                        .param("draftJson", "{}")
                        .param("action", "draft")
        )
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errCode").value("403"));
    }

    @Test
    void adminApi_withPreviewImage_overridesCoverImageUrl() throws Exception {
        when(articleService.adminCreate(any(), anyString(), anyString())).thenReturn(SingleResponse.of(1));
        when(objectStorage.upload(any(), anyLong(), anyString(), anyString())).thenReturn("https://cdn.example.com/preview.webp");

        MockMultipartFile previewImage = new MockMultipartFile(
                "previewImage",
                "cover.png",
                "image/png",
                "png".getBytes(StandardCharsets.UTF_8)
        );

        mvc.perform(
                multipart("/api/v1/admin/articles")
                        .file(previewImage)
                        .header("Authorization", bearerToken("123"))
                        .param("title", "t")
                        .param("url", "u")
                        .param("draftJson", "{}")
                        .param("action", "draft")
                        .param("coverImageUrl", "https://cdn.example.com/fallback.webp")
        ).andExpect(status().isOk())
         .andExpect(jsonPath("$.data").value(1));

        verify(objectStorage).upload(any(), anyLong(), anyString(), anyString());
        verify(articleService).adminCreate(any(), anyString(), anyString());
    }

    @Test
    void adminApi_withoutPreviewImage_doesNotUploadCover() throws Exception {
        when(articleService.adminCreate(any(), anyString(), anyString())).thenReturn(SingleResponse.of(1));

        mvc.perform(
                multipart("/api/v1/admin/articles")
                        .header("Authorization", bearerToken("123"))
                        .param("title", "t")
                        .param("url", "u")
                        .param("draftJson", "{}")
                        .param("action", "draft")
                        .param("coverImageUrl", "https://cdn.example.com/fallback.webp")
        ).andExpect(status().isOk());

        verify(objectStorage, never()).upload(any(), anyLong(), anyString(), anyString());
        verify(articleService).adminCreate(any(), anyString(), anyString());
    }

    @Test
    void adminCreateMultipart_forwardsDraftBodyMdAndCoverCaption() throws Exception {
        when(articleService.adminCreate(any(), anyString(), any())).thenReturn(SingleResponse.of(1));

        mvc.perform(
                multipart("/api/v1/admin/articles")
                        .header("Authorization", bearerToken("123"))
                        .param("title", "t")
                        .param("url", "u")
                        .param("draftJson", "{}")
                        .param("draftBodyMd", "# Hello\n\n:::note\nsidenote\n:::")
                        .param("coverCaption", "图示：架构")
                        .param("action", "draft")
        ).andExpect(status().isOk());

        ArgumentCaptor<ArticleDraftSaveCmd> cmdCaptor = ArgumentCaptor.forClass(ArticleDraftSaveCmd.class);
        verify(articleService).adminCreate(cmdCaptor.capture(), anyString(), any());
        ArticleDraftSaveCmd captured = cmdCaptor.getValue();
        org.assertj.core.api.Assertions.assertThat(captured.getDraftBodyMd()).isEqualTo("# Hello\n\n:::note\nsidenote\n:::");
        org.assertj.core.api.Assertions.assertThat(captured.getCoverCaption()).isEqualTo("图示：架构");
    }

    @Test
    void adminCreateMultipart_forwardsTags() throws Exception {
        when(articleService.adminCreate(any(), anyString(), any())).thenReturn(SingleResponse.of(1));

        mvc.perform(
                multipart("/api/v1/admin/articles")
                        .header("Authorization", bearerToken("123"))
                        .param("title", "t")
                        .param("url", "u")
                        .param("draftJson", "{}")
                        .param("tags", "spring, ddd, java")
                        .param("action", "draft")
        ).andExpect(status().isOk());

        ArgumentCaptor<ArticleDraftSaveCmd> cmdCaptor = ArgumentCaptor.forClass(ArticleDraftSaveCmd.class);
        verify(articleService).adminCreate(cmdCaptor.capture(), anyString(), any());
        ArticleDraftSaveCmd captured = cmdCaptor.getValue();
        org.assertj.core.api.Assertions.assertThat(captured.getTags())
                .containsExactly("spring", "ddd", "java");
    }

    @Test
    void adminUsers_withoutAuth_returns401() throws Exception {
        mvc.perform(get("/api/v1/admin/users"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminUsers_withWhitelistedUser_returnsOk() throws Exception {
        when(userService.getUsers(any(UserPageQry.class))).thenReturn(
                com.seal.blog.client.common.PageResponse.empty()
        );

        mvc.perform(
                get("/api/v1/admin/users")
                        .header("Authorization", bearerToken("123"))
        ).andExpect(status().isOk());

        verify(userService).getUsers(any());
    }

    @Test
    void adminOffline_withWhitelistedUser_callsService() throws Exception {
        when(articleService.adminOffline(7)).thenReturn(Response.buildSuccess());

        mvc.perform(
                post("/api/v1/admin/articles/7/offline")
                        .header("Authorization", bearerToken("123"))
        ).andExpect(status().isOk());

        verify(articleService).adminOffline(7);
    }

    @Test
    void publicArticles_withoutStatusParam_defaultsToPublishedOnly() throws Exception {
        when(articleService.getPage(any(com.seal.blog.client.article.dto.qry.ArticlePageQry.class)))
                .thenReturn(com.seal.blog.client.common.PageResponse.empty());

        mvc.perform(get("/api/v1/articles"))
                .andExpect(status().isOk());

        ArgumentCaptor<com.seal.blog.client.article.dto.qry.ArticlePageQry> captor =
                ArgumentCaptor.forClass(com.seal.blog.client.article.dto.qry.ArticlePageQry.class);
        verify(articleService).getPage(captor.capture());
        // Without an explicit status= param the controller must default to "published"
        // so that draft articles are not exposed to unauthenticated callers.
        org.assertj.core.api.Assertions.assertThat(captor.getValue().getStatus()).isEqualTo("published");
    }

    @Test
    void publicArticles_withExplicitStatusAll_isOverriddenToPublished() throws Exception {
        when(articleService.getPage(any(com.seal.blog.client.article.dto.qry.ArticlePageQry.class)))
                .thenReturn(com.seal.blog.client.common.PageResponse.empty());

        mvc.perform(get("/api/v1/articles").param("status", "all"))
                .andExpect(status().isOk());

        ArgumentCaptor<com.seal.blog.client.article.dto.qry.ArticlePageQry> captor =
                ArgumentCaptor.forClass(com.seal.blog.client.article.dto.qry.ArticlePageQry.class);
        verify(articleService).getPage(captor.capture());
        // Public endpoint always forces status=published regardless of caller-supplied value.
        // Draft enumeration requires the admin endpoint (/api/v1/admin/articles).
        org.assertj.core.api.Assertions.assertThat(captor.getValue().getStatus()).isEqualTo("published");
    }

    @Test
    void publicArticlesAdjacent_returnsAdjacentVO() throws Exception {
        ArticleAdjacentVO vo = new ArticleAdjacentVO();
        vo.setRelated(Collections.emptyList());
        when(articleService.getAdjacentBySlug(eq("my-slug"), any()))
                .thenReturn(SingleResponse.of(vo));

        mvc.perform(get("/api/v1/articles/adjacent").param("slug", "my-slug"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(articleService).getAdjacentBySlug(eq("my-slug"), any());
    }

    @Test
    void publicArticles_withExplicitStatusDraft_isOverriddenToPublished() throws Exception {
        when(articleService.getPage(any(com.seal.blog.client.article.dto.qry.ArticlePageQry.class)))
                .thenReturn(com.seal.blog.client.common.PageResponse.empty());

        mvc.perform(get("/api/v1/articles").param("status", "draft"))
                .andExpect(status().isOk());

        ArgumentCaptor<com.seal.blog.client.article.dto.qry.ArticlePageQry> captor =
                ArgumentCaptor.forClass(com.seal.blog.client.article.dto.qry.ArticlePageQry.class);
        verify(articleService).getPage(captor.capture());
        org.assertj.core.api.Assertions.assertThat(captor.getValue().getStatus()).isEqualTo("published");
    }

    @Test
    void publicViewCount_returnsOk() throws Exception {
        when(articleService.incrementViewCount(5)).thenReturn(Response.buildSuccess());

        mvc.perform(post("/api/v1/articles/5/view"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(articleService).incrementViewCount(5);
    }

    @Test
    void publicTags_returnsOk() throws Exception {
        when(articleService.getTags()).thenReturn(java.util.Collections.emptyList());

        mvc.perform(get("/api/v1/tags"))
                .andExpect(status().isOk());

        verify(articleService).getTags();
    }

    @Test
    void adminGetById_withWhitelistedUser_returnsArticle() throws Exception {
        com.seal.blog.client.article.dto.vo.ArticleVO vo =
                new com.seal.blog.client.article.dto.vo.ArticleVO();
        when(articleService.adminGetSingleById(42))
                .thenReturn(SingleResponse.of(vo));

        mvc.perform(
                get("/api/v1/admin/articles/42")
                        .header("Authorization", bearerToken("123"))
        ).andExpect(status().isOk())
         .andExpect(jsonPath("$.success").value(true));

        verify(articleService).adminGetSingleById(42);
    }

    @Test
    void adminGetById_withoutAuth_returns401() throws Exception {
        mvc.perform(get("/api/v1/admin/articles/42"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminUpdateMultipart_withWhitelistedUser_callsService() throws Exception {
        when(articleService.adminUpdate(any(), anyString(), any())).thenReturn(Response.buildSuccess());

        mvc.perform(
                multipart("/api/v1/admin/articles/10")
                        .with(request -> { request.setMethod("PUT"); return request; })
                        .header("Authorization", bearerToken("123"))
                        .param("title", "Updated Title")
                        .param("url", "updated-slug")
                        .param("draftJson", "{\"elements\":[]}")
                        .param("draftBodyMd", "## Updated")
                        .param("action", "draft")
        ).andExpect(status().isOk());

        ArgumentCaptor<com.seal.blog.client.article.dto.cmd.ArticleDraftUpdateCmd> cmdCaptor =
                ArgumentCaptor.forClass(com.seal.blog.client.article.dto.cmd.ArticleDraftUpdateCmd.class);
        verify(articleService).adminUpdate(cmdCaptor.capture(), eq("draft"), any());
        org.assertj.core.api.Assertions.assertThat(cmdCaptor.getValue().getArticleId()).isEqualTo(10);
        org.assertj.core.api.Assertions.assertThat(cmdCaptor.getValue().getDraftBodyMd()).isEqualTo("## Updated");
    }

    @Test
    void adminDelete_withWhitelistedUser_callsService() throws Exception {
        when(articleService.delete(15)).thenReturn(Response.buildSuccess());

        mvc.perform(
                delete("/api/v1/admin/articles/15")
                        .header("Authorization", bearerToken("123"))
        ).andExpect(status().isOk());

        verify(articleService).delete(15);
    }

    @Test
    void publicArticleById_returnsOk() throws Exception {
        com.seal.blog.client.article.dto.vo.ArticleVO vo =
                new com.seal.blog.client.article.dto.vo.ArticleVO();
        when(articleService.getSingleById(any(com.seal.blog.client.article.dto.qry.ArticleByIdQry.class)))
                .thenReturn(SingleResponse.of(vo));

        mvc.perform(get("/api/v1/articles/99"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        ArgumentCaptor<com.seal.blog.client.article.dto.qry.ArticleByIdQry> captor =
                ArgumentCaptor.forClass(com.seal.blog.client.article.dto.qry.ArticleByIdQry.class);
        verify(articleService).getSingleById(captor.capture());
        org.assertj.core.api.Assertions.assertThat(captor.getValue().getArticleId()).isEqualTo(99);
    }

    @Test
    void publicArticleBySlug_returnsOk() throws Exception {
        com.seal.blog.client.article.dto.vo.ArticleVO vo =
                new com.seal.blog.client.article.dto.vo.ArticleVO();
        when(articleService.getSingleBySlug(any(com.seal.blog.client.article.dto.qry.ArticleBySlugQry.class)))
                .thenReturn(SingleResponse.of(vo));

        mvc.perform(get("/api/v1/articles/slug/my-slug"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        ArgumentCaptor<com.seal.blog.client.article.dto.qry.ArticleBySlugQry> captor =
                ArgumentCaptor.forClass(com.seal.blog.client.article.dto.qry.ArticleBySlugQry.class);
        verify(articleService).getSingleBySlug(captor.capture());
        org.assertj.core.api.Assertions.assertThat(captor.getValue().getSlug()).isEqualTo("my-slug");
    }

    @Test
    void adminList_withWhitelistedUser_returnsPage() throws Exception {
        when(articleService.getPage(any(com.seal.blog.client.article.dto.qry.ArticlePageQry.class)))
                .thenReturn(com.seal.blog.client.common.PageResponse.empty());

        mvc.perform(
                get("/api/v1/admin/articles")
                        .header("Authorization", bearerToken("123"))
                        .param("pageIndex", "1")
                        .param("pageSize", "10")
        ).andExpect(status().isOk());

        verify(articleService).getPage(any());
    }

    @Test
    void adminUpload_withoutAuth_returns401() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "image.png", "image/png", "png".getBytes(StandardCharsets.UTF_8));

        mvc.perform(
                multipart("/api/v1/admin/upload").file(file)
        ).andExpect(status().isUnauthorized());
    }

    @Test
    void adminUpload_withValidAuth_returnsUploadedUrl() throws Exception {
        when(objectStorage.upload(any(), anyLong(), anyString(), anyString()))
                .thenReturn("https://cdn.example.com/uploaded.png");

        MockMultipartFile file = new MockMultipartFile(
                "file", "image.png", "image/png", "png".getBytes(StandardCharsets.UTF_8));

        mvc.perform(
                multipart("/api/v1/admin/upload")
                        .file(file)
                        .header("Authorization", bearerToken("123"))
        ).andExpect(status().isOk())
         .andExpect(jsonPath("$.data").value("https://cdn.example.com/uploaded.png"));

        verify(objectStorage).upload(any(), anyLong(), anyString(), anyString());
    }

    @Test
    void adminUpdateMultipart_withPreviewImage_uploadsCover() throws Exception {
        when(articleService.adminUpdate(any(), anyString(), anyString())).thenReturn(Response.buildSuccess());
        when(objectStorage.upload(any(), anyLong(), anyString(), anyString()))
                .thenReturn("https://cdn.example.com/new-cover.webp");

        MockMultipartFile previewImage = new MockMultipartFile(
                "previewImage", "cover.png", "image/png", "png".getBytes(StandardCharsets.UTF_8));

        mvc.perform(
                multipart("/api/v1/admin/articles/20")
                        .file(previewImage)
                        .with(request -> { request.setMethod("PUT"); return request; })
                        .header("Authorization", bearerToken("123"))
                        .param("title", "Updated")
                        .param("url", "updated-slug")
                        .param("draftJson", "{}")
                        .param("action", "draft")
        ).andExpect(status().isOk());

        verify(objectStorage).upload(any(), anyLong(), anyString(), anyString());
        org.mockito.ArgumentCaptor<String> urlCaptor = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(articleService).adminUpdate(any(), anyString(), urlCaptor.capture());
        org.assertj.core.api.Assertions.assertThat(urlCaptor.getValue())
                .isEqualTo("https://cdn.example.com/new-cover.webp");
    }

    @Test
    void internalSync_withoutSecret_returns401() throws Exception {
        mvc.perform(
                post("/api/v1/internal/users/oauth-sync")
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"githubId\":1,\"githubLogin\":\"seal\"}")
        ).andExpect(status().isUnauthorized());
    }

    @Test
    void internalSync_withWrongSecret_returns401() throws Exception {
        mvc.perform(
                post("/api/v1/internal/users/oauth-sync")
                        .header("X-Blog-Internal-Sync-Secret", "wrong-secret")
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"githubId\":1,\"githubLogin\":\"seal\"}")
        ).andExpect(status().isUnauthorized());
    }

    @Test
    void internalSync_withValidSecret_callsService() throws Exception {
        com.seal.blog.client.user.dto.vo.UserProfileVO profile =
                new com.seal.blog.client.user.dto.vo.UserProfileVO();
        when(userService.syncFromOauth(any())).thenReturn(
                com.seal.blog.client.common.SingleResponse.of(profile));

        mvc.perform(
                post("/api/v1/internal/users/oauth-sync")
                        .header("X-Blog-Internal-Sync-Secret", "test-internal")
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"githubId\":1,\"githubLogin\":\"seal\"}")
        ).andExpect(status().isOk())
         .andExpect(jsonPath("$.success").value(true));

        verify(userService).syncFromOauth(any());
    }

    private static String bearerToken(String githubUserId) throws Exception {
        String headerJson = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
        String payloadJson = "{\"githubUserId\":\"" + githubUserId + "\"}";
        String header = base64UrlEncode(headerJson.getBytes(StandardCharsets.UTF_8));
        String payload = base64UrlEncode(payloadJson.getBytes(StandardCharsets.UTF_8));
        String signingInput = header + "." + payload;
        String signature = base64UrlEncode(hmacSha256(signingInput.getBytes(StandardCharsets.UTF_8), "test-secret".getBytes(StandardCharsets.UTF_8)));
        return "Bearer " + signingInput + "." + signature;
    }

    private static byte[] hmacSha256(byte[] data, byte[] secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret, "HmacSHA256"));
        return mac.doFinal(data);
    }

    private static String base64UrlEncode(byte[] bytes) {
        return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    @Test
    void adminPublish_withWhitelistedUser_callsService() throws Exception {
        when(articleService.adminPublish(9)).thenReturn(Response.buildSuccess());

        mvc.perform(
                post("/api/v1/admin/articles/9/publish")
                        .header("Authorization", bearerToken("123"))
        ).andExpect(status().isOk())
         .andExpect(jsonPath("$.success").value(true));

        verify(articleService).adminPublish(9);
    }

    @Test
    void adminPublish_withoutAuth_returns401() throws Exception {
        mvc.perform(post("/api/v1/admin/articles/9/publish"))
                .andExpect(status().isUnauthorized());
    }
}
