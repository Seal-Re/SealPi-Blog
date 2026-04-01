package com.seal.blog.client.user.dto.vo;

import lombok.Data;

@Data
public class UserProfileVO {

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
    /**
     * ALLOWED | READ_ONLY
     */
    private String commentPermission;
    private boolean banned;
    private String createdAt;
    private String lastLoginAt;
}
