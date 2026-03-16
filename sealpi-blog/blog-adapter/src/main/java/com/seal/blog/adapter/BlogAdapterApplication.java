package com.seal.blog.adapter;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {"com.seal.blog"})
public class BlogAdapterApplication {

	public static void main(String[] args) {
		SpringApplication.run(BlogAdapterApplication.class, args);
	}

}
