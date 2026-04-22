-- V4: heal cover_image_url rows that were written with a doubled bucket segment.
-- Earlier deploys had MINIO_PUBLIC_BASE_URL ending with the bucket name while
-- MinioObjectStorage also appended the bucket, producing URLs like
-- https://blog.sealpi.cn/minio/blog-assets/blog-assets/... (404).
-- Code now strips the trailing bucket defensively; this migration cleans legacy rows.

UPDATE t_article
SET cover_image_url = REPLACE(
        cover_image_url,
        '/minio/blog-assets/blog-assets/',
        '/minio/blog-assets/'
    )
WHERE cover_image_url LIKE '%/minio/blog-assets/blog-assets/%';
