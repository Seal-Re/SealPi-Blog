package com.seal.blog.adapter;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.seal.blog.infra.oss.MinioObjectStorage;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
        properties = {
                // Minimal config to let AdminAuthFilter/AdminJwtVerifier start in test context.
                "admin.jwt.secret=test-secret",
                "admin.github.userIds=123",
                "admin.jwt.githubUserIdClaim=githubUserId"
        }
)
@AutoConfigureMockMvc
class BlogAdapterApplicationTests {

    @Autowired
    private MockMvc mvc;

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
}
