-- V0: 初始表结构建立
-- 包含 t_article（基础字段）、t_tag、t_rely 三张表。
-- 注意：content_json / draft_json / cover_image_url / view_count 字段通过 V1 迁移添加。
-- 全部使用 CREATE TABLE IF NOT EXISTS，支持在已有环境中安全执行。

CREATE TABLE IF NOT EXISTS t_article (
    article_id  INT            NOT NULL AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(512)   NOT NULL COMMENT '文章标题',
    date        VARCHAR(10)    NOT NULL COMMENT '创建日期 yyyy-MM-dd',
    lastmod     VARCHAR(10)    NOT NULL COMMENT '最近修改日期 yyyy-MM-dd',
    summary     TEXT           NULL     COMMENT '摘要',
    url         VARCHAR(512)   NOT NULL COMMENT 'slug / 文章唯一路径',
    draft       INT            NOT NULL DEFAULT 0 COMMENT '0=草稿 1=已发布 2=已删除',
    count       INT            NOT NULL DEFAULT 0 COMMENT '阅读计数（历史字段）',
    UNIQUE KEY uk_t_article_url (url)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS t_tag (
    tag_id  INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name    VARCHAR(255) NOT NULL COMMENT '标签名称',
    count   INT          NOT NULL DEFAULT 0 COMMENT '关联文章数量',
    UNIQUE KEY uk_t_tag_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS t_rely (
    id          INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    article_id  INT NOT NULL COMMENT '文章ID',
    tag_id      INT NOT NULL COMMENT '标签ID',
    UNIQUE KEY uk_t_rely_article_tag (article_id, tag_id),
    KEY idx_t_rely_tag_id (tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
