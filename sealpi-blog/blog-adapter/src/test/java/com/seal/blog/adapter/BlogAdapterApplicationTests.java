package com.seal.blog.adapter;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.seal.blog.client.article.api.ArticleServiceI;
import com.seal.blog.client.article.dto.cmd.ArticleDraftSaveCmd;
import com.seal.blog.client.common.Response;
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
        when(articleService.adminCreate(any(), anyString(), anyString())).thenReturn(Response.buildSuccess());
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
        ).andExpect(status().isOk());

        verify(objectStorage).upload(any(), anyLong(), anyString(), anyString());
        verify(articleService).adminCreate(any(), anyString(), anyString());
    }

    @Test
    void adminApi_withoutPreviewImage_doesNotUploadCover() throws Exception {
        when(articleService.adminCreate(any(), anyString(), anyString())).thenReturn(Response.buildSuccess());

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
        when(articleService.adminCreate(any(), anyString(), any())).thenReturn(Response.buildSuccess());

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
        when(articleService.adminCreate(any(), anyString(), any())).thenReturn(Response.buildSuccess());

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
    void publicArticles_withExplicitStatusAll_doesNotOverride() throws Exception {
        when(articleService.getPage(any(com.seal.blog.client.article.dto.qry.ArticlePageQry.class)))
                .thenReturn(com.seal.blog.client.common.PageResponse.empty());

        mvc.perform(get("/api/v1/articles").param("status", "all"))
                .andExpect(status().isOk());

        ArgumentCaptor<com.seal.blog.client.article.dto.qry.ArticlePageQry> captor =
                ArgumentCaptor.forClass(com.seal.blog.client.article.dto.qry.ArticlePageQry.class);
        verify(articleService).getPage(captor.capture());
        // Explicit status=all must be preserved — this is used by the admin listing pages.
        org.assertj.core.api.Assertions.assertThat(captor.getValue().getStatus()).isEqualTo("all");
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
}
