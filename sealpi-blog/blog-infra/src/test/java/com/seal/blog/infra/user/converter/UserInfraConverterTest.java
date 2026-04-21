package com.seal.blog.infra.user.converter;

import com.seal.blog.domain.user.model.BlogUser;
import com.seal.blog.infra.user.po.UserPO;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;

/**
 * Pure unit tests for UserInfraConverter — no Spring context required.
 * Focus: the non-trivial banned/isBanned int↔boolean mapping and field renames.
 */
class UserInfraConverterTest {

    private final UserInfraConverter converter = new UserInfraConverter();

    // -----------------------------------------------------------------------
    // toDomain — null guard
    // -----------------------------------------------------------------------

    @Test
    void toDomain_null_returnsNull() {
        assertThat(converter.toDomain(null)).isNull();
    }

    // -----------------------------------------------------------------------
    // toDomain — isBanned mapping
    // -----------------------------------------------------------------------

    @Test
    void toDomain_isBannedNull_bannedFalse() {
        UserPO po = minimalPO();
        po.setIsBanned(null);
        assertThat(converter.toDomain(po).isBanned()).isFalse();
    }

    @Test
    void toDomain_isBannedZero_bannedFalse() {
        UserPO po = minimalPO();
        po.setIsBanned(0);
        assertThat(converter.toDomain(po).isBanned()).isFalse();
    }

    @Test
    void toDomain_isBannedOne_bannedTrue() {
        UserPO po = minimalPO();
        po.setIsBanned(1);
        assertThat(converter.toDomain(po).isBanned()).isTrue();
    }

    @Test
    void toDomain_isBannedNonZero_bannedTrue() {
        // Any non-zero value should be treated as banned
        UserPO po = minimalPO();
        po.setIsBanned(99);
        assertThat(converter.toDomain(po).isBanned()).isTrue();
    }

    // -----------------------------------------------------------------------
    // toDomain — field name remapping
    // -----------------------------------------------------------------------

    @Test
    void toDomain_syncPolicy_mappedToSyncPolicyJson() {
        UserPO po = minimalPO();
        po.setSyncPolicy("{\"nickname\":\"GITHUB\"}");
        BlogUser u = converter.toDomain(po);
        assertThat(u.getSyncPolicyJson()).isEqualTo("{\"nickname\":\"GITHUB\"}");
    }

    @Test
    void toDomain_mapsAllScalarFields() {
        LocalDateTime now = LocalDateTime.of(2026, 4, 18, 12, 0);
        UserPO po = new UserPO();
        po.setUserId(7L);
        po.setGithubId(42L);
        po.setGithubLogin("seal");
        po.setNickname("Seal Pi");
        po.setEmail("seal@example.com");
        po.setAvatarUrl("https://avatars.example.com/u/42");
        po.setBio("Software engineer");
        po.setWebsiteUrl("https://sealpi.dev");
        po.setGithubProfileUrl("https://github.com/seal");
        po.setSyncPolicy("{\"nickname\":\"MANUAL\"}");
        po.setCommentPermission("ALLOWED");
        po.setIsBanned(0);
        po.setCreatedAt(now);
        po.setLastLoginAt(now);

        BlogUser u = converter.toDomain(po);

        assertThat(u.getUserId()).isEqualTo(7L);
        assertThat(u.getGithubId()).isEqualTo(42L);
        assertThat(u.getGithubLogin()).isEqualTo("seal");
        assertThat(u.getNickname()).isEqualTo("Seal Pi");
        assertThat(u.getEmail()).isEqualTo("seal@example.com");
        assertThat(u.getAvatarUrl()).isEqualTo("https://avatars.example.com/u/42");
        assertThat(u.getBio()).isEqualTo("Software engineer");
        assertThat(u.getWebsiteUrl()).isEqualTo("https://sealpi.dev");
        assertThat(u.getGithubProfileUrl()).isEqualTo("https://github.com/seal");
        assertThat(u.getSyncPolicyJson()).isEqualTo("{\"nickname\":\"MANUAL\"}");
        assertThat(u.getCommentPermission()).isEqualTo("ALLOWED");
        assertThat(u.getCreatedAt()).isEqualTo(now);
        assertThat(u.getLastLoginAt()).isEqualTo(now);
    }

    // -----------------------------------------------------------------------
    // toPO — null guard
    // -----------------------------------------------------------------------

    @Test
    void toPO_null_returnsNull() {
        assertThat(converter.toPO(null)).isNull();
    }

    // -----------------------------------------------------------------------
    // toPO — banned boolean → isBanned int
    // -----------------------------------------------------------------------

    @Test
    void toPO_bannedFalse_isBannedZero() {
        BlogUser u = new BlogUser();
        u.setBanned(false);
        assertThat(converter.toPO(u).getIsBanned()).isEqualTo(0);
    }

    @Test
    void toPO_bannedTrue_isBannedOne() {
        BlogUser u = new BlogUser();
        u.setBanned(true);
        assertThat(converter.toPO(u).getIsBanned()).isEqualTo(1);
    }

    // -----------------------------------------------------------------------
    // toPO — field name remapping
    // -----------------------------------------------------------------------

    @Test
    void toPO_syncPolicyJson_mappedToSyncPolicy() {
        BlogUser u = new BlogUser();
        u.setSyncPolicyJson("{\"nickname\":\"GITHUB\"}");
        UserPO po = converter.toPO(u);
        assertThat(po.getSyncPolicy()).isEqualTo("{\"nickname\":\"GITHUB\"}");
    }

    // -----------------------------------------------------------------------
    // Roundtrip
    // -----------------------------------------------------------------------

    @Test
    void roundtrip_preservesAllFields() {
        LocalDateTime now = LocalDateTime.of(2026, 4, 18, 12, 0);
        UserPO original = new UserPO();
        original.setUserId(5L);
        original.setGithubId(10L);
        original.setGithubLogin("roundtrip-user");
        original.setNickname("Roundtrip");
        original.setEmail("rt@example.com");
        original.setAvatarUrl("https://avatar.url");
        original.setBio("bio");
        original.setWebsiteUrl("https://web.url");
        original.setGithubProfileUrl("https://github.com/rt");
        original.setSyncPolicy("{\"nickname\":\"MANUAL\"}");
        original.setCommentPermission("READ_ONLY");
        original.setIsBanned(1);
        original.setCreatedAt(now);
        original.setLastLoginAt(now);

        BlogUser domain = converter.toDomain(original);
        UserPO roundtripped = converter.toPO(domain);

        assertThat(roundtripped.getUserId()).isEqualTo(original.getUserId());
        assertThat(roundtripped.getGithubId()).isEqualTo(original.getGithubId());
        assertThat(roundtripped.getGithubLogin()).isEqualTo(original.getGithubLogin());
        assertThat(roundtripped.getNickname()).isEqualTo(original.getNickname());
        assertThat(roundtripped.getEmail()).isEqualTo(original.getEmail());
        assertThat(roundtripped.getSyncPolicy()).isEqualTo(original.getSyncPolicy());
        assertThat(roundtripped.getCommentPermission()).isEqualTo(original.getCommentPermission());
        assertThat(roundtripped.getIsBanned()).isEqualTo(1);
        assertThat(roundtripped.getCreatedAt()).isEqualTo(original.getCreatedAt());
        assertThat(roundtripped.getLastLoginAt()).isEqualTo(original.getLastLoginAt());
    }

    // -----------------------------------------------------------------------
    // helpers
    // -----------------------------------------------------------------------

    private UserPO minimalPO() {
        UserPO po = new UserPO();
        po.setUserId(1L);
        po.setGithubId(1L);
        po.setGithubLogin("user");
        return po;
    }
}
