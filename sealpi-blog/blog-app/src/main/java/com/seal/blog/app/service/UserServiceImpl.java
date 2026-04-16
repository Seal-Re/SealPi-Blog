package com.seal.blog.app.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.seal.blog.client.common.PageResponse;
import com.seal.blog.client.common.SingleResponse;
import com.seal.blog.client.user.api.UserServiceI;
import com.seal.blog.client.user.dto.cmd.OauthUserSyncCmd;
import com.seal.blog.client.user.dto.cmd.UpdateUserAdminCmd;
import com.seal.blog.client.user.dto.qry.UserPageQry;
import com.seal.blog.client.user.dto.vo.UserProfileVO;
import com.seal.blog.domain.user.gateway.UserGateway;
import com.seal.blog.domain.user.model.BlogUser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserServiceI {

    private static final String POLICY_NICKNAME = "nickname";
    private static final String POLICY_AVATAR = "avatarUrl";
    private static final String POLICY_BIO = "bio";
    private static final String POLICY_WEBSITE = "websiteUrl";
    private static final String POLICY_EMAIL = "email";

    private static final String MODE_GITHUB = "GITHUB";

    private final UserGateway userGateway;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public SingleResponse<UserProfileVO> syncFromOauth(OauthUserSyncCmd cmd) {
        BlogUser existing = userGateway.findByGithubId(cmd.getGithubId());
        if (existing != null && existing.isBanned()) {
            return SingleResponse.buildSingleFailure("BANNED", "账号已被封禁");
        }

        if (existing == null) {
            BlogUser created = newUserFromOauth(cmd);
            userGateway.save(created);
            return SingleResponse.of(toVo(created));
        }

        mergeOauth(existing, cmd);
        userGateway.save(existing);
        return SingleResponse.of(toVo(existing));
    }

    @Override
    public PageResponse<UserProfileVO> getUsers(UserPageQry qry) {
        PageResponse<BlogUser> page = userGateway.findPage(qry);
        List<UserProfileVO> vos = page.getData().stream().map(this::toVo).collect(Collectors.toList());
        return PageResponse.of(vos, page.getTotalCount(), page.getPageSize(), page.getPageIndex());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public SingleResponse<UserProfileVO> updateUserAdmin(UpdateUserAdminCmd cmd) {
        BlogUser user = userGateway.findById(cmd.getUserId());
        if (user == null) {
            return SingleResponse.buildSingleFailure("NOT_FOUND", "用户不存在");
        }
        if (cmd.getCommentPermission() != null) {
            user.setCommentPermission(cmd.getCommentPermission());
        }
        if (cmd.getBanned() != null) {
            user.setBanned(cmd.getBanned());
        }
        userGateway.save(user);
        return SingleResponse.of(toVo(user));
    }

    private BlogUser newUserFromOauth(OauthUserSyncCmd cmd) {
        BlogUser u = new BlogUser();
        u.setGithubId(cmd.getGithubId());
        u.setGithubLogin(cmd.getGithubLogin());
        u.setNickname(cmd.getNickname());
        u.setEmail(cmd.getEmail());
        u.setAvatarUrl(cmd.getAvatarUrl());
        u.setBio(cmd.getBio());
        u.setWebsiteUrl(cmd.getWebsiteUrl());
        u.setGithubProfileUrl(cmd.getGithubProfileUrl());
        u.setSyncPolicyJson(defaultPolicyJson());
        u.setCommentPermission("READ_ONLY");
        u.setBanned(false);
        LocalDateTime now = LocalDateTime.now();
        u.setCreatedAt(now);
        u.setLastLoginAt(now);
        return u;
    }

    private void mergeOauth(BlogUser u, OauthUserSyncCmd cmd) {
        u.setGithubLogin(cmd.getGithubLogin());
        u.setLastLoginAt(LocalDateTime.now());

        Map<String, String> policy = parsePolicy(u.getSyncPolicyJson());
        if (MODE_GITHUB.equals(policy.get(POLICY_NICKNAME))) {
            if (cmd.getNickname() != null) {
                u.setNickname(cmd.getNickname());
            }
        }
        if (MODE_GITHUB.equals(policy.get(POLICY_AVATAR))) {
            if (cmd.getAvatarUrl() != null) {
                u.setAvatarUrl(cmd.getAvatarUrl());
            }
        }
        if (MODE_GITHUB.equals(policy.get(POLICY_BIO))) {
            if (cmd.getBio() != null) {
                u.setBio(cmd.getBio());
            }
        }
        if (MODE_GITHUB.equals(policy.get(POLICY_WEBSITE))) {
            if (cmd.getWebsiteUrl() != null) {
                u.setWebsiteUrl(cmd.getWebsiteUrl());
            }
        }
        if (MODE_GITHUB.equals(policy.get(POLICY_EMAIL))) {
            if (cmd.getEmail() != null) {
                u.setEmail(cmd.getEmail());
            }
        }
        if (cmd.getGithubProfileUrl() != null) {
            u.setGithubProfileUrl(cmd.getGithubProfileUrl());
        }
    }

    private Map<String, String> parsePolicy(String json) {
        if (json == null || json.isBlank()) {
            return defaultPolicyMap();
        }
        try {
            Map<String, String> m = objectMapper.readValue(json, new TypeReference<>() {
            });
            Map<String, String> def = defaultPolicyMap();
            def.putAll(m);
            return def;
        } catch (Exception e) {
            log.warn("sync_policy parse failed, fallback default: {}", e.getMessage());
            return defaultPolicyMap();
        }
    }

    private String defaultPolicyJson() {
        try {
            return objectMapper.writeValueAsString(defaultPolicyMap());
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private Map<String, String> defaultPolicyMap() {
        Map<String, String> m = new LinkedHashMap<>();
        m.put(POLICY_NICKNAME, MODE_GITHUB);
        m.put(POLICY_AVATAR, MODE_GITHUB);
        m.put(POLICY_BIO, MODE_GITHUB);
        m.put(POLICY_WEBSITE, MODE_GITHUB);
        m.put(POLICY_EMAIL, MODE_GITHUB);
        return m;
    }

    private UserProfileVO toVo(BlogUser u) {
        UserProfileVO vo = new UserProfileVO();
        vo.setUserId(u.getUserId());
        vo.setGithubId(u.getGithubId());
        vo.setGithubLogin(u.getGithubLogin());
        vo.setNickname(u.getNickname());
        vo.setEmail(u.getEmail());
        vo.setAvatarUrl(u.getAvatarUrl());
        vo.setBio(u.getBio());
        vo.setWebsiteUrl(u.getWebsiteUrl());
        vo.setGithubProfileUrl(u.getGithubProfileUrl());
        vo.setSyncPolicyJson(u.getSyncPolicyJson());
        vo.setCommentPermission(u.getCommentPermission());
        vo.setBanned(u.isBanned());
        DateTimeFormatter fmt = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
        vo.setCreatedAt(u.getCreatedAt() != null ? fmt.format(u.getCreatedAt()) : null);
        vo.setLastLoginAt(u.getLastLoginAt() != null ? fmt.format(u.getLastLoginAt()) : null);
        return vo;
    }
}
