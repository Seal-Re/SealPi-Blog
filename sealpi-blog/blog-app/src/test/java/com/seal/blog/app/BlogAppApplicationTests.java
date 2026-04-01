package com.seal.blog.app;

import com.seal.blog.domain.article.gateway.ArticleGateway;
import com.seal.blog.domain.user.gateway.UserGateway;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

@SpringBootTest
class BlogAppApplicationTests {

	@MockBean
	private ArticleGateway articleGateway;

	@MockBean
	private UserGateway userGateway;

	@Test
	void contextLoads() {
	}

}
