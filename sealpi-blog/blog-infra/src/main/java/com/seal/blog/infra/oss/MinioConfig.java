package com.seal.blog.infra.oss;

import io.minio.MinioClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MinioConfig {

    /**
     * Create MinIO client only when endpoint is configured; keep default tests green.
     */
    @Bean
    @org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name = "admin.upload.minio.endpoint")
    public MinioClient minioClient(
            @Value("${admin.upload.minio.endpoint:}") String endpoint,
            @Value("${admin.upload.minio.accessKey:}") String accessKey,
            @Value("${admin.upload.minio.secretKey:}") String secretKey
    ) {
        if (endpoint == null || endpoint.isBlank()) {
            throw new IllegalArgumentException("admin.upload.minio.endpoint must not be blank");
        }
        if (accessKey == null || accessKey.isBlank()) {
            throw new IllegalArgumentException("admin.upload.minio.accessKey must not be blank");
        }
        if (secretKey == null || secretKey.isBlank()) {
            throw new IllegalArgumentException("admin.upload.minio.secretKey must not be blank");
        }

        return MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();
    }
}
