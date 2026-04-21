package com.seal.blog.app.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.seal.blog.client.common.SingleResponse;
import com.seal.blog.client.user.dto.cmd.OauthUserSyncCmd;
import com.seal.blog.client.user.dto.cmd.UpdateUserAdminCmd;
import com.seal.blog.client.user.dto.vo.UserProfileVO;
import com.seal.blog.domain.user.gateway.UserGateway;
import com.seal.blog.domain.user.model.BlogUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock
    private UserGateway userGateway;

    private UserServiceImpl service;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        service = new UserServiceImpl(userGateway, objectMapper);
    }

    // Helper: build a minimal sync command.
    private OauthUserSyncCmd syncCmd(long githubId, String login) {
        OauthUserSyncCmd cmd = new OauthUserSyncCmd();
        cmd.setGithubId(githubId);
        cmd.setGithubLogin(login);
        cmd.setNickname("User " + login);
        cmd.setEmail(login + "@example.com");
        cmd.setAvatarUrl("https://avatars.github.com/u/" + githubId);
        return cmd;
    }

    // Helper: build a persisted user with an explicit banned flag.
    private BlogUser existingUser(long githubId, String login, boolean banned) {
        BlogUser u = new BlogUser();
        u.setUserId(1L);
        u.setGithubId(githubId);
        u.setGithubLogin(login);
        u.setNickname("Existing " + login);
        u.setCommentPermission("READ_ONLY");
        u.setBanned(banned);
        // Default policy: all fields sync from GitHub
        u.setSyncPolicyJson(
                "{\"nickname\":\"GITHUB\",\"avatarUrl\":\"GITHUB\",\"bio\":\"GITHUB\"," +
                "\"websiteUrl\":\"GITHUB\",\"email\":\"GITHUB\"}"
        );
        return u;
    }

    // -------------------------------------------------------------------------
    // syncFromOauth
    // -------------------------------------------------------------------------

    @Test
    void syncFromOauth_newUser_createsAndSaves() {
        when(userGateway.findByGithubId(42L)).thenReturn(null);

        SingleResponse<UserProfileVO> result = service.syncFromOauth(syncCmd(42L, "alice"));

        assertTrue(result.isSuccess());
        assertNotNull(result.getData());
        assertEquals("alice", result.getData().getGithubLogin());
        assertEquals("READ_ONLY", result.getData().getCommentPermission());
        assertFalse(result.getData().isBanned());

        ArgumentCaptor<BlogUser> captor = ArgumentCaptor.forClass(BlogUser.class);
        verify(userGateway).save(captor.capture());
        BlogUser saved = captor.getValue();
        assertEquals(42L, saved.getGithubId());
        assertFalse(saved.isBanned());
    }

    @Test
    void syncFromOauth_bannedUser_returnsBannedErrorAndDoesNotSave() {
        BlogUser banned = existingUser(42L, "alice", true);
        when(userGateway.findByGithubId(42L)).thenReturn(banned);

        SingleResponse<UserProfileVO> result = service.syncFromOauth(syncCmd(42L, "alice"));

        assertFalse(result.isSuccess());
        assertEquals("BANNED", result.getErrorCode());
        verify(userGateway, never()).save(any());
    }

    @Test
    void syncFromOauth_existingUser_mergesLoginAndSaves() {
        BlogUser existing = existingUser(7L, "old-login", false);
        when(userGateway.findByGithubId(7L)).thenReturn(existing);

        OauthUserSyncCmd cmd = syncCmd(7L, "new-login");
        cmd.setNickname("New Name");
        SingleResponse<UserProfileVO> result = service.syncFromOauth(cmd);

        assertTrue(result.isSuccess());
        // Login always synced
        ArgumentCaptor<BlogUser> captor = ArgumentCaptor.forClass(BlogUser.class);
        verify(userGateway).save(captor.capture());
        assertEquals("new-login", captor.getValue().getGithubLogin());
    }

    @Test
    void syncFromOauth_existingUser_nicknameUpdatedWhenPolicyIsGithub() {
        BlogUser existing = existingUser(7L, "alice", false);
        when(userGateway.findByGithubId(7L)).thenReturn(existing);

        OauthUserSyncCmd cmd = syncCmd(7L, "alice");
        cmd.setNickname("Alice Updated");
        service.syncFromOauth(cmd);

        ArgumentCaptor<BlogUser> captor = ArgumentCaptor.forClass(BlogUser.class);
        verify(userGateway).save(captor.capture());
        assertEquals("Alice Updated", captor.getValue().getNickname());
    }

    @Test
    void syncFromOauth_existingUser_nicknameNotOverriddenWhenPolicyIsManual() {
        BlogUser existing = existingUser(7L, "alice", false);
        // Override policy: nickname is MANUAL — should NOT be synced from GitHub
        existing.setSyncPolicyJson("{\"nickname\":\"MANUAL\",\"avatarUrl\":\"GITHUB\",\"bio\":\"GITHUB\"," +
                "\"websiteUrl\":\"GITHUB\",\"email\":\"GITHUB\"}");
        existing.setNickname("My Custom Name");
        when(userGateway.findByGithubId(7L)).thenReturn(existing);

        OauthUserSyncCmd cmd = syncCmd(7L, "alice");
        cmd.setNickname("GitHub Name");
        service.syncFromOauth(cmd);

        ArgumentCaptor<BlogUser> captor = ArgumentCaptor.forClass(BlogUser.class);
        verify(userGateway).save(captor.capture());
        // MANUAL policy: GitHub value must not overwrite local value
        assertEquals("My Custom Name", captor.getValue().getNickname());
    }

    @Test
    void syncFromOauth_nullSyncPolicy_fallsBackToDefaultAndSyncsAll() {
        BlogUser existing = existingUser(7L, "alice", false);
        existing.setSyncPolicyJson(null);
        existing.setNickname("Old Name");
        when(userGateway.findByGithubId(7L)).thenReturn(existing);

        OauthUserSyncCmd cmd = syncCmd(7L, "alice");
        cmd.setNickname("New From GitHub");
        service.syncFromOauth(cmd);

        ArgumentCaptor<BlogUser> captor = ArgumentCaptor.forClass(BlogUser.class);
        verify(userGateway).save(captor.capture());
        // Default policy is GITHUB for all fields
        assertEquals("New From GitHub", captor.getValue().getNickname());
    }

    @Test
    void syncFromOauth_malformedSyncPolicyJson_fallsBackToDefault() {
        BlogUser existing = existingUser(7L, "alice", false);
        existing.setSyncPolicyJson("{not valid json}");
        existing.setNickname("Old Name");
        when(userGateway.findByGithubId(7L)).thenReturn(existing);

        OauthUserSyncCmd cmd = syncCmd(7L, "alice");
        cmd.setNickname("GitHub Override");
        // Should not throw — fallback to default policy (GITHUB)
        SingleResponse<UserProfileVO> result = service.syncFromOauth(cmd);

        assertTrue(result.isSuccess());
        ArgumentCaptor<BlogUser> captor = ArgumentCaptor.forClass(BlogUser.class);
        verify(userGateway).save(captor.capture());
        assertEquals("GitHub Override", captor.getValue().getNickname());
    }

    // -------------------------------------------------------------------------
    // getUsers
    // -------------------------------------------------------------------------

    @Test
    void getUsers_delegatesToGatewayAndMapsVOs() {
        BlogUser user = existingUser(42L, "alice", false);
        user.setUserId(1L);

        com.seal.blog.client.common.PageResponse<BlogUser> gatewayPage =
                com.seal.blog.client.common.PageResponse.of(
                        java.util.List.of(user), 1, 20, 1);

        com.seal.blog.client.user.dto.qry.UserPageQry qry =
                new com.seal.blog.client.user.dto.qry.UserPageQry();
        qry.setPageIndex(1);
        qry.setPageSize(20);

        when(userGateway.findPage(qry)).thenReturn(gatewayPage);

        com.seal.blog.client.common.PageResponse<UserProfileVO> result = service.getUsers(qry);

        assertThat(result.getTotalCount()).isEqualTo(1);
        assertThat(result.getData()).hasSize(1);
        assertThat(result.getData().iterator().next().getGithubLogin()).isEqualTo("alice");
        verify(userGateway).findPage(qry);
    }

    // -------------------------------------------------------------------------
    // updateUserAdmin
    // -------------------------------------------------------------------------

    @Test
    void updateUserAdmin_userNotFound_returnsNotFound() {
        when(userGateway.findById(99L)).thenReturn(null);

        UpdateUserAdminCmd cmd = new UpdateUserAdminCmd();
        cmd.setUserId(99L);
        cmd.setCommentPermission("ALLOWED");

        SingleResponse<UserProfileVO> result = service.updateUserAdmin(cmd);

        assertFalse(result.isSuccess());
        assertEquals("NOT_FOUND", result.getErrorCode());
        verify(userGateway, never()).save(any());
    }

    @Test
    void updateUserAdmin_updateCommentPermission_savesNewValue() {
        BlogUser user = existingUser(7L, "alice", false);
        user.setUserId(3L);
        when(userGateway.findById(3L)).thenReturn(user);

        UpdateUserAdminCmd cmd = new UpdateUserAdminCmd();
        cmd.setUserId(3L);
        cmd.setCommentPermission("ALLOWED");

        SingleResponse<UserProfileVO> result = service.updateUserAdmin(cmd);

        assertTrue(result.isSuccess());
        assertEquals("ALLOWED", result.getData().getCommentPermission());
        ArgumentCaptor<BlogUser> captor = ArgumentCaptor.forClass(BlogUser.class);
        verify(userGateway).save(captor.capture());
        assertEquals("ALLOWED", captor.getValue().getCommentPermission());
    }

    @Test
    void updateUserAdmin_banUser_savesAndReturnsBanned() {
        BlogUser user = existingUser(7L, "alice", false);
        user.setUserId(3L);
        when(userGateway.findById(3L)).thenReturn(user);

        UpdateUserAdminCmd cmd = new UpdateUserAdminCmd();
        cmd.setUserId(3L);
        cmd.setBanned(true);

        SingleResponse<UserProfileVO> result = service.updateUserAdmin(cmd);

        assertTrue(result.isSuccess());
        assertTrue(result.getData().isBanned());
        ArgumentCaptor<BlogUser> captor = ArgumentCaptor.forClass(BlogUser.class);
        verify(userGateway).save(captor.capture());
        assertTrue(captor.getValue().isBanned());
    }

    @Test
    void updateUserAdmin_nullFields_doesNotOverrideExistingValues() {
        BlogUser user = existingUser(7L, "alice", true);
        user.setUserId(3L);
        user.setCommentPermission("ALLOWED");
        when(userGateway.findById(3L)).thenReturn(user);

        UpdateUserAdminCmd cmd = new UpdateUserAdminCmd();
        cmd.setUserId(3L);
        // Both fields null — no change expected

        SingleResponse<UserProfileVO> result = service.updateUserAdmin(cmd);

        assertTrue(result.isSuccess());
        // Values must be unchanged
        ArgumentCaptor<BlogUser> captor = ArgumentCaptor.forClass(BlogUser.class);
        verify(userGateway).save(captor.capture());
        assertEquals("ALLOWED", captor.getValue().getCommentPermission());
        assertTrue(captor.getValue().isBanned());
    }

    @Test
    void updateUserAdmin_unbanUser_setsNotBanned() {
        BlogUser user = existingUser(7L, "alice", true);
        user.setUserId(3L);
        when(userGateway.findById(3L)).thenReturn(user);

        UpdateUserAdminCmd cmd = new UpdateUserAdminCmd();
        cmd.setUserId(3L);
        cmd.setBanned(false);

        SingleResponse<UserProfileVO> result = service.updateUserAdmin(cmd);

        assertTrue(result.isSuccess());
        assertFalse(result.getData().isBanned());
    }
}
