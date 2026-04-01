package com.seal.blog.adapter.config;

import com.seal.blog.adapter.security.InternalSyncAuthFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class InternalSyncAuthConfig {

    @Bean
    public FilterRegistrationBean<InternalSyncAuthFilter> internalSyncAuthFilter(
            @Value("${blog.internal.sync.secret:}") String secret
    ) {
        FilterRegistrationBean<InternalSyncAuthFilter> bean = new FilterRegistrationBean<>();
        bean.setFilter(new InternalSyncAuthFilter(secret));
        bean.addUrlPatterns("/api/v1/internal/*");
        bean.setOrder(0);
        return bean;
    }
}
