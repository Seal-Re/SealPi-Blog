package com.seal.blog.infra;

import com.baomidou.mybatisplus.generator.FastAutoGenerator;
import com.baomidou.mybatisplus.generator.config.OutputFile;
import com.baomidou.mybatisplus.generator.config.rules.DateType;
import com.baomidou.mybatisplus.generator.engine.VelocityTemplateEngine;

import java.util.HashMap;
import java.util.Map;

public class CodeGenerator {

    private static final String URL = "jdbc:mysql://localhost:3306/sealpi_blog?useUnicode=true&characterEncoding=utf-8&serverTimezone=Asia/Shanghai";
    private static final String USERNAME = "root";
    private static final String PASSWORD = "Fastop@123";
    private static final String PARENT_PACKAGE = "com.seal.blog.infra";
    private static final String MODULE_NAME = "article";
    private static final String[] TABLES = {"t_article", "t_tag", "t_rely"};

    public static void main(String[] args) {
        String cwd = System.getProperty("user.dir");
        String outputDir = cwd.endsWith("blog-infra") ? cwd : cwd + "/blog-infra";
        String javaDir = outputDir + "/src/main/java";
        String resourcesDir = outputDir + "/src/main/resources";

        Map<OutputFile, String> pathInfo = new HashMap<>();
        pathInfo.put(OutputFile.xml, resourcesDir + "/mapper/" + MODULE_NAME);

        FastAutoGenerator.create(URL, USERNAME, PASSWORD)
                .globalConfig(builder -> {
                    builder.author("MyBatisPlus")
                            .outputDir(javaDir)
                            .disableOpenDir()
                            .dateType(DateType.ONLY_DATE);
                })
                .packageConfig(builder -> {
                    builder.parent(PARENT_PACKAGE)
                            .moduleName(MODULE_NAME)
                            .entity("po")
                            .mapper("mapper")
                            .pathInfo(pathInfo);
                })
                .strategyConfig(builder -> {
                    builder.addInclude(TABLES)
                            .addTablePrefix("t_", "sys_");

                    builder.entityBuilder()
                            .enableLombok()
                            .enableTableFieldAnnotation()
                            .formatFileName("%sPO")
                            .enableFileOverride();

                    builder.mapperBuilder()
                            .enableMapperAnnotation()
                            .formatMapperFileName("%sMapper")
                            .formatXmlFileName("%sMapper")
                            .enableFileOverride();
                })
                .templateConfig(builder -> {
                    builder.controller(null)
                            .service(null)
                            .serviceImpl(null);
                })
                .templateEngine(new VelocityTemplateEngine())
                .execute();

        System.out.println("Generation Completed Successfully.");
    }
}