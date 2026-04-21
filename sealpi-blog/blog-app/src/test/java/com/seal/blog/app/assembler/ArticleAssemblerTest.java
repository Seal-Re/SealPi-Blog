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
import java.util.stream.Collectors;
import java.util.Collections;

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

    // -----------------------------------------------------------------------
    // computeReadMinutes
    // -----------------------------------------------------------------------

    @Test
    void computeReadMinutes_nullInput_returnsNull() {
        assertThat(assembler.computeReadMinutes(null)).isNull();
    }

    @Test
    void computeReadMinutes_blankInput_returnsNull() {
        assertThat(assembler.computeReadMinutes("   \n\t  ")).isNull();
    }

    @Test
    void computeReadMinutes_shortContent_returnsMinimumOne() {
        // A single CJK character (1 char / 300 chars·min⁻¹ ≈ 0.003 min → rounds to 1)
        assertThat(assembler.computeReadMinutes("字")).isEqualTo(1);
    }

    @Test
    void computeReadMinutes_pureCjk_300Chars_returnsOneMinute() {
        String text = "字".repeat(300);
        assertThat(assembler.computeReadMinutes(text)).isEqualTo(1);
    }

    @Test
    void computeReadMinutes_pureCjk_600Chars_returnsTwoMinutes() {
        String text = "字".repeat(600);
        assertThat(assembler.computeReadMinutes(text)).isEqualTo(2);
    }

    @Test
    void computeReadMinutes_pureEnglish_220Words_returnsOneMinute() {
        // 220 words of "word" separated by spaces → 220 / 220 = 1 minute
        String text = Collections.nCopies(220, "word").stream().collect(Collectors.joining(" "));
        assertThat(assembler.computeReadMinutes(text)).isEqualTo(1);
    }

    @Test
    void computeReadMinutes_pureEnglish_440Words_returnsTwoMinutes() {
        String text = Collections.nCopies(440, "word").stream().collect(Collectors.joining(" "));
        assertThat(assembler.computeReadMinutes(text)).isEqualTo(2);
    }

    @Test
    void computeReadMinutes_mixedCjkAndEnglish_computesBothRates() {
        // 300 CJK (1 min) + 220 English words (1 min) = 2 minutes
        String cjk = "字".repeat(300);
        String eng = Collections.nCopies(220, "word").stream().collect(Collectors.joining(" "));
        String text = cjk + " " + eng;
        assertThat(assembler.computeReadMinutes(text)).isEqualTo(2);
    }
}
