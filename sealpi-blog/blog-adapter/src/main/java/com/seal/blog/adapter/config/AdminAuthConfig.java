package com.seal.blog.adapter.config;

import com.seal.blog.adapter.security.AdminAuthFilter;
import com.seal.blog.adapter.security.AdminJwtVerifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AdminAuthConfig {

    @Bean
    public AdminJwtVerifier adminJwtVerifier(
            @Value("${admin.jwt.secret:}") String secret,
            @Value("${admin.github.userIds:}") String userIds,
            @Value("${admin.jwt.githubUserIdClaim:githubUserId}") String claim,
            @Value("${admin.github.userApi:https://api.github.com/user}") String githubUserApi,
            @Value("${admin.auth.allowLegacyJwt:false}") boolean allowLegacyJwt
    ) {
        return new AdminJwtVerifier(secret, userIds, claim, githubUserApi, allowLegacyJwt);
    }

    @Bean
    public FilterRegistrationBean<AdminAuthFilter> adminAuthFilter(AdminJwtVerifier verifier) {
        FilterRegistrationBean<AdminAuthFilter> bean = new FilterRegistrationBean<>();
        bean.setFilter(new AdminAuthFilter(verifier));
        bean.addUrlPatterns("/api/v1/admin/*");
        bean.setOrder(1);
        return bean;
    }
}
