package com.seal.blog.start;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@Disabled("Requires a live MySQL connection — run via docker-compose for integration testing")
@SpringBootTest
class BlogStartApplicationTests {

    @Test
    void contextLoads() {
    }

}
