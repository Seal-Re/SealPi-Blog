package com.seal.blog.domain.user.gateway;

import com.seal.blog.domain.user.model.BlogUser;

public interface UserGateway {

    BlogUser findByGithubId(long githubId);

    void save(BlogUser user);
}
