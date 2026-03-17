package com.seal.blog.infra.oss;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.time.LocalDate;
import java.util.Locale;
import java.util.UUID;

@Service
@ConditionalOnBean(MinioClient.class)
public class MinioObjectStorage {

    private final MinioClient minioClient;
    private final String bucket;
    private final String publicBaseUrl;

    public MinioObjectStorage(
            MinioClient minioClient,
            @Value("${admin.upload.minio.bucket:}") String bucket,
            @Value("${admin.upload.publicBaseUrl:}") String publicBaseUrl
    ) {
        this.minioClient = minioClient;
        if (bucket == null || bucket.isBlank()) {
            throw new IllegalArgumentException("admin.upload.minio.bucket must not be blank");
        }
        this.bucket = bucket;
        if (publicBaseUrl == null || publicBaseUrl.isBlank()) {
            throw new IllegalArgumentException("admin.upload.publicBaseUrl must not be blank");
        }
        this.publicBaseUrl = trimTrailingSlash(publicBaseUrl);
    }

    public String upload(InputStream in, long size, String contentType, String originalFilename) {
        if (in == null) {
            throw new IllegalArgumentException("input stream must not be null");
        }
        if (size <= 0) {
            throw new IllegalArgumentException("file size must be positive");
        }

        String objectKey = buildObjectKey(originalFilename);
        ensureBucketExists();

        try {
            PutObjectArgs args = PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectKey)
                    .stream(in, size, -1)
                    .contentType(normalizeContentType(contentType))
                    .build();
            minioClient.putObject(args);
        } catch (Exception e) {
            throw new IllegalStateException("minio putObject failed", e);
        }

        return publicUrl(objectKey);
    }

    private void ensureBucketExists() {
        try {
            boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
            }
        } catch (Exception e) {
            throw new IllegalStateException("minio ensure bucket failed", e);
        }
    }

    private String publicUrl(String objectKey) {
        return publicBaseUrl + "/" + bucket + "/" + objectKey;
    }

    private static String buildObjectKey(String originalFilename) {
        LocalDate d = LocalDate.now();
        String safeName = sanitizeFilename(originalFilename);
        String uuid = UUID.randomUUID().toString().replace("-", "");
        return String.format(Locale.ROOT, "%04d/%02d/%02d/%s-%s", d.getYear(), d.getMonthValue(), d.getDayOfMonth(), uuid, safeName);
    }

    private static String sanitizeFilename(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            return "file";
        }
        String name = originalFilename;
        int slash = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
        if (slash >= 0) {
            name = name.substring(slash + 1);
        }
        name = name.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (name.isBlank()) {
            return "file";
        }
        return name;
    }

    private static String normalizeContentType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return "application/octet-stream";
        }
        return contentType;
    }

    private static String trimTrailingSlash(String s) {
        if (s == null) return null;
        while (s.endsWith("/")) {
            s = s.substring(0, s.length() - 1);
        }
        return s;
    }
}
