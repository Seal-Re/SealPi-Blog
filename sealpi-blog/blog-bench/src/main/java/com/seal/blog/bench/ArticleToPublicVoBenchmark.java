package com.seal.blog.bench;

import com.seal.blog.app.assembler.ArticleAssembler;
import com.seal.blog.client.article.dto.vo.ArticleVO;
import com.seal.blog.domain.article.model.Article;
import org.mapstruct.factory.Mappers;
import org.openjdk.jmh.annotations.*;

import java.util.concurrent.TimeUnit;

@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.MICROSECONDS)
@State(Scope.Benchmark)
@Fork(value = 1, jvmArgsAppend = {"-Xms512m", "-Xmx512m"})
@Warmup(iterations = 3, time = 2)
@Measurement(iterations = 5, time = 3)
public class ArticleToPublicVoBenchmark {

    private ArticleAssembler assembler;
    private Article article;

    @Setup(Level.Trial)
    public void setup() {
        assembler = Mappers.getMapper(ArticleAssembler.class);
        article = new Article("Bench Title", "Bench summary", "/blog/bench");
        // Realistic mixed CJK + Latin body of ~10 KB to exercise computeReadMinutes.
        StringBuilder body = new StringBuilder();
        for (int i = 0; i < 100; i++) {
            body.append("这是一段中文测试内容，用来模拟博客正文。 ");
            body.append("This is some Latin text mixed in to simulate a real article body. ");
        }
        String draftBodyMd = body.toString();
        String draftJson = "{\"type\":\"excalidraw\",\"elements\":[],\"version\":2}";
        article.saveDraft(draftJson, "https://example.com/cover.png", draftBodyMd, "cover-caption");
        article.publishFromDraft(null);
    }

    @Benchmark
    public ArticleVO toPublicVoStrip() {
        return assembler.toPublicVO(article);
    }

}
