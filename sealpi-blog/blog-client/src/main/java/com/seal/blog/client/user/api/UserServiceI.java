package com.seal.blog.client.user.api;

import com.seal.blog.client.common.SingleResponse;
import com.seal.blog.client.user.dto.cmd.OauthUserSyncCmd;
import com.seal.blog.client.user.dto.vo.UserProfileVO;

public interface UserServiceI {

    SingleResponse<UserProfileVO> syncFromOauth(OauthUserSyncCmd cmd);
}
