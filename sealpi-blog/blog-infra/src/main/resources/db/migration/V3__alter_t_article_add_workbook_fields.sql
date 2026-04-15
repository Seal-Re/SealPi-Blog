ALTER TABLE t_article
    ADD COLUMN IF NOT EXISTS body_md       LONGTEXT     NULL COMMENT 'Markdown 正文（已发布）' AFTER draft_json,
    ADD COLUMN IF NOT EXISTS draft_body_md LONGTEXT     NULL COMMENT 'Markdown 正文（草稿）' AFTER body_md,
    ADD COLUMN IF NOT EXISTS cover_caption VARCHAR(200) NULL COMMENT 'Excalidraw 封面手写注释' AFTER cover_image_url;
