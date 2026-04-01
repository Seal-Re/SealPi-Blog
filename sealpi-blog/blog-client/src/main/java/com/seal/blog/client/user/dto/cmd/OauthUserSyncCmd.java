package com.seal.blog.client.user.dto.cmd;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class OauthUserSyncCmd {

    @NotNull
    private Long githubId;

    @NotBlank
    private String githubLogin;

    private String nickname;

    private String email;

    private String avatarUrl;

    private String bio;

    private String websiteUrl;

    private String githubProfileUrl;
}
