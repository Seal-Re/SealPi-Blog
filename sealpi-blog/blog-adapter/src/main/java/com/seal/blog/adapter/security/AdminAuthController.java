package com.seal.blog.adapter.security;

import com.seal.blog.client.common.SingleResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/auth")
public class AdminAuthController {

    @GetMapping("/check")
    public SingleResponse<Boolean> check() {
        return SingleResponse.of(Boolean.TRUE);
    }
}
