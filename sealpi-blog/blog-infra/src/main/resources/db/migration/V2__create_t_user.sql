-- 用户主数据：GitHub OAuth 同步、sync_policy、评论权限与封禁
-- 若未启用 Flyway，可在目标库手动执行本脚本。

CREATE TABLE IF NOT EXISTS t_user (
    user_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    github_id BIGINT NOT NULL COMMENT 'GitHub 数字 user id，唯一',
    github_login VARCHAR(255) NOT NULL COMMENT 'GitHub login (handle)',
    nickname VARCHAR(255) NULL COMMENT '展示昵称，可被本地覆盖',
    email VARCHAR(512) NULL,
    avatar_url VARCHAR(1024) NULL,
    bio TEXT NULL,
    website_url VARCHAR(512) NULL COMMENT 'GitHub profile blog 字段',
    github_profile_url VARCHAR(512) NULL,
    sync_policy JSON NULL COMMENT '字段级同步策略 GITHUB|MANUAL',
    comment_permission VARCHAR(32) NOT NULL DEFAULT 'READ_ONLY' COMMENT 'ALLOWED | READ_ONLY',
    is_banned TINYINT NOT NULL DEFAULT 0 COMMENT '1=封禁',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME NULL,
    UNIQUE KEY uk_t_user_github_id (github_id),
    KEY idx_t_user_last_login (last_login_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
