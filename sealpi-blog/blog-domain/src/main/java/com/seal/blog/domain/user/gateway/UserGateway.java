package com.seal.blog.domain.user.gateway;

import com.seal.blog.client.common.PageResponse;
import com.seal.blog.client.user.dto.qry.UserPageQry;
import com.seal.blog.domain.user.model.BlogUser;

public interface UserGateway {

    BlogUser findByGithubId(long githubId);

    void save(BlogUser user);

    PageResponse<BlogUser> findPage(UserPageQry qry);

    BlogUser findById(Long userId);
}
