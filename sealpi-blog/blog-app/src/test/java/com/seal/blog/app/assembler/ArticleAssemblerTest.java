package com.seal.blog.app.assembler;

import com.seal.blog.client.article.dto.vo.ArticleVO;
import com.seal.blog.client.common.PageResponse;
import com.seal.blog.domain.article.model.Article;
import com.seal.blog.domain.article.model.ArticleStatus;
import com.seal.blog.domain.article.gateway.ArticleGateway;
import com.seal.blog.domain.user.gateway.UserGateway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies that toPublicPageResponse() strips large fields (bodyMd, contentJson)
 * that list consumers never use, keeping list API payloads lean.
 */
@SpringBootTest
class ArticleAssemblerTest {

    @Autowired
    private ArticleAssembler assembler;

    @MockBean
    private ArticleGateway articleGateway;

    @MockBean
    private UserGateway userGateway;

    @Test
    void toPublicPageResponse_stripsBodyMdAndContentJson() {
        Article article = Article.reconstruct(
                1,
                "Test Title", "summary", "test-slug",
                "2026-01-01", "2026-01-01",
                ArticleStatus.PUBLISHED, 0,
                "{\"type\":\"excalidraw\"}",
                "{\"draft\":true}",
                "https://cdn.example.com/cover.webp",
                42,
                "## Published Body",
                "## Draft Body",
                "caption text"
        );

        PageResponse<Article> input = PageResponse.of(List.of(article), 1, 10, 1);
        PageResponse<ArticleVO> result = assembler.toPublicPageResponse(input);

        assertThat(result.getData()).hasSize(1);
        ArticleVO vo = result.getData().iterator().next();

        // Large payload fields must be stripped from list responses
        assertThat(vo.getBodyMd()).isNull();
        assertThat(vo.getContentJson()).isNull();

        // Draft-only fields stripped by toPublicVO
        assertThat(vo.getDraftJson()).isNull();
        assertThat(vo.getDraftBodyMd()).isNull();

        // Fields actually needed by list consumers must be present
        assertThat(vo.getTitle()).isEqualTo("Test Title");
        assertThat(vo.getSummary()).isEqualTo("summary");
        assertThat(vo.getCoverImageUrl()).isEqualTo("https://cdn.example.com/cover.webp");
        assertThat(vo.getViewCount()).isEqualTo(42);
        assertThat(vo.getCoverCaption()).isEqualTo("caption text");
    }
}
