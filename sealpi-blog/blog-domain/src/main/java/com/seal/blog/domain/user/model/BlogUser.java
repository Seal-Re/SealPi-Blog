package com.seal.blog.domain.user.model;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class BlogUser {

    private Long userId;
    private Long githubId;
    private String githubLogin;
    private String nickname;
    private String email;
    private String avatarUrl;
    private String bio;
    private String websiteUrl;
    private String githubProfileUrl;
    private String syncPolicyJson;
    private String commentPermission;
    private boolean banned;
    private LocalDateTime createdAt;
    private LocalDateTime lastLoginAt;
}
