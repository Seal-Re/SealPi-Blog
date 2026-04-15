package com.seal.blog.domain.user.gateway;

import com.seal.blog.domain.user.model.BlogUser;

import java.util.List;

public interface UserGateway {

    BlogUser findByGithubId(long githubId);

    void save(BlogUser user);

    List<BlogUser> findPage(int pageIndex, int pageSize);

    long countAll();
}
