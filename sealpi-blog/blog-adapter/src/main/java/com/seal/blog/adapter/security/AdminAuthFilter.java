package com.seal.blog.adapter.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * v1 admin auth filter.
 *
 * Validates Bearer JWT (HS256) and checks github user id against a whitelist.
 *
 * This is intentionally lightweight for v1; no Spring Security is introduced.
 */
public class AdminAuthFilter extends OncePerRequestFilter {

    private final AdminJwtVerifier verifier;

    public AdminAuthFilter(AdminJwtVerifier verifier) {
        this.verifier = verifier;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String uri = request.getRequestURI();
        return uri == null || !uri.startsWith("/api/v1/admin/");
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
        String header = request.getHeader("Authorization");
        try {
            verifier.verifyAuthorizationHeader(header);
        } catch (AdminAuthException ex) {
            response.setStatus(ex.getHttpStatus());
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"success\":false,\"errCode\":\"" + ex.getCode() + "\",\"errMessage\":\"" + ex.getMessage() + "\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }
}
