package com.seal.blog.adapter.user;

import com.seal.blog.client.common.SingleResponse;
import com.seal.blog.client.user.api.UserServiceI;
import com.seal.blog.client.user.dto.cmd.OauthUserSyncCmd;
import com.seal.blog.client.user.dto.vo.UserProfileVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/internal/users")
@RequiredArgsConstructor
public class InternalUserSyncController {

    private final UserServiceI userService;

    @PostMapping("/oauth-sync")
    public SingleResponse<UserProfileVO> oauthSync(@Valid @RequestBody OauthUserSyncCmd cmd) {
        return userService.syncFromOauth(cmd);
    }
}
