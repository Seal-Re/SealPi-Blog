package com.seal.blog.adapter.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * 保护 /api/v1/internal/**：仅允许携带正确 X-Blog-Internal-Sync-Secret 的服务端调用（如 Next.js Server）。
 */
public class InternalSyncAuthFilter extends OncePerRequestFilter {

    public static final String HEADER_NAME = "X-Blog-Internal-Sync-Secret";

    private final String expectedSecret;

    public InternalSyncAuthFilter(String expectedSecret) {
        this.expectedSecret = expectedSecret == null ? "" : expectedSecret;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String uri = request.getRequestURI();
        return uri == null || !uri.startsWith("/api/v1/internal/");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }
        if (expectedSecret.isEmpty()) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"success\":false,\"errCode\":\"INTERNAL_SECRET_NOT_CONFIGURED\",\"errMessage\":\"internal sync disabled\"}");
            return;
        }
        String provided = request.getHeader(HEADER_NAME);
        if (provided == null || !expectedSecret.equals(provided)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"success\":false,\"errCode\":\"UNAUTHORIZED\",\"errMessage\":\"invalid internal secret\"}");
            return;
        }
        filterChain.doFilter(request, response);
    }
}
