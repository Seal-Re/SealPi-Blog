ALTER TABLE t_article
    ADD COLUMN content_json LONGTEXT NULL COMMENT 'Excalidraw已发布内容JSON' AFTER url,
    ADD COLUMN draft_json LONGTEXT NULL COMMENT 'Excalidraw草稿JSON' AFTER content_json,
    ADD COLUMN cover_image_url VARCHAR(512) NULL COMMENT '静态预览图URL' AFTER draft_json,
    ADD COLUMN view_count INT NOT NULL DEFAULT 0 COMMENT '阅读量' AFTER cover_image_url;
