package com.seal.blog.infra.user.converter;

import com.seal.blog.domain.user.model.BlogUser;
import com.seal.blog.infra.user.po.UserPO;
import org.springframework.stereotype.Component;

@Component
public class UserInfraConverter {

    public BlogUser toDomain(UserPO po) {
        if (po == null) {
            return null;
        }
        BlogUser u = new BlogUser();
        u.setUserId(po.getUserId());
        u.setGithubId(po.getGithubId());
        u.setGithubLogin(po.getGithubLogin());
        u.setNickname(po.getNickname());
        u.setEmail(po.getEmail());
        u.setAvatarUrl(po.getAvatarUrl());
        u.setBio(po.getBio());
        u.setWebsiteUrl(po.getWebsiteUrl());
        u.setGithubProfileUrl(po.getGithubProfileUrl());
        u.setSyncPolicyJson(po.getSyncPolicy());
        u.setCommentPermission(po.getCommentPermission());
        u.setBanned(po.getIsBanned() != null && po.getIsBanned() != 0);
        u.setCreatedAt(po.getCreatedAt());
        u.setLastLoginAt(po.getLastLoginAt());
        return u;
    }

    public UserPO toPO(BlogUser u) {
        if (u == null) {
            return null;
        }
        UserPO po = new UserPO();
        po.setUserId(u.getUserId());
        po.setGithubId(u.getGithubId());
        po.setGithubLogin(u.getGithubLogin());
        po.setNickname(u.getNickname());
        po.setEmail(u.getEmail());
        po.setAvatarUrl(u.getAvatarUrl());
        po.setBio(u.getBio());
        po.setWebsiteUrl(u.getWebsiteUrl());
        po.setGithubProfileUrl(u.getGithubProfileUrl());
        po.setSyncPolicy(u.getSyncPolicyJson());
        po.setCommentPermission(u.getCommentPermission());
        po.setIsBanned(u.isBanned() ? 1 : 0);
        po.setCreatedAt(u.getCreatedAt());
        po.setLastLoginAt(u.getLastLoginAt());
        return po;
    }
}
