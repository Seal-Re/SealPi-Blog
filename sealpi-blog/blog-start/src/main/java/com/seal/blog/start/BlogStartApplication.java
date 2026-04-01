package com.seal.blog.start;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "com.seal.blog")
@MapperScan("com.seal.blog.infra")
public class BlogStartApplication {

    public static void main(String[] args) {
        SpringApplication.run(BlogStartApplication.class, args);
    }

}
