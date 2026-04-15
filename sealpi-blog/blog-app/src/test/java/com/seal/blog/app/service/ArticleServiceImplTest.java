package com.seal.blog.app.service;

import com.seal.blog.app.assembler.ArticleAssembler;
import com.seal.blog.client.article.dto.cmd.ArticleDraftSaveCmd;
import com.seal.blog.domain.article.gateway.ArticleGateway;
import com.seal.blog.domain.article.model.Article;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ArticleServiceImplTest {

    @Mock
    private ArticleAssembler articleAssembler;

    @Mock
    private ArticleGateway articleGateway;

    @InjectMocks
    private ArticleServiceImpl service;

    @BeforeEach
    void setUp() {
        when(articleGateway.findBySlug(anyString())).thenReturn(null);
        doNothing().when(articleGateway).save(any());
    }

    @Test
    void adminCreate_draft_persistsDraftBodyMdOnly() {
        ArticleDraftSaveCmd cmd = new ArticleDraftSaveCmd();
        cmd.setTitle("t");
        cmd.setUrl("u");
        cmd.setDraftJson("{}");
        cmd.setDraftBodyMd("# draft body");
        cmd.setCoverCaption("cap");

        service.adminCreate(cmd, "draft", null);

        ArgumentCaptor<Article> captor = ArgumentCaptor.forClass(Article.class);
        verify(articleGateway).save(captor.capture());
        Article saved = captor.getValue();
        assertThat(saved.getDraftBodyMd()).isEqualTo("# draft body");
        assertThat(saved.getBodyMd()).isNull();
        assertThat(saved.getCoverCaption()).isEqualTo("cap");
    }

    @Test
    void adminCreate_publish_copiesDraftBodyMdToBodyMd() {
        ArticleDraftSaveCmd cmd = new ArticleDraftSaveCmd();
        cmd.setTitle("t");
        cmd.setUrl("u");
        cmd.setDraftJson("{}");
        cmd.setDraftBodyMd("# published body");

        service.adminCreate(cmd, "publish", null);

        ArgumentCaptor<Article> captor = ArgumentCaptor.forClass(Article.class);
        verify(articleGateway).save(captor.capture());
        Article saved = captor.getValue();
        assertThat(saved.getBodyMd()).isEqualTo("# published body");
        assertThat(saved.getDraftBodyMd()).isEqualTo("# published body");
    }

    @Test
    void adminCreate_draft_handlesLargeBodyMd() {
        String big = "x".repeat(120_000);
        ArticleDraftSaveCmd cmd = new ArticleDraftSaveCmd();
        cmd.setTitle("t");
        cmd.setUrl("u");
        cmd.setDraftJson("{}");
        cmd.setDraftBodyMd(big);

        service.adminCreate(cmd, "draft", null);

        ArgumentCaptor<Article> captor = ArgumentCaptor.forClass(Article.class);
        verify(articleGateway).save(captor.capture());
        assertThat(captor.getValue().getDraftBodyMd()).hasSize(120_000);
    }
}
