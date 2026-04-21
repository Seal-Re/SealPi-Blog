package com.seal.blog.adapter.upload;

import com.seal.blog.client.common.SingleResponse;
import com.seal.blog.infra.oss.MinioObjectStorage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.lang.Nullable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminUploadController {

    @Nullable
    private final MinioObjectStorage objectStorage;

    @Autowired
    public AdminUploadController(@Nullable MinioObjectStorage objectStorage) {
        this.objectStorage = objectStorage;
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public SingleResponse<String> upload(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return SingleResponse.buildSingleFailure("400", "file不能为空");
        }

        if (objectStorage == null) {
            return SingleResponse.buildSingleFailure("501", "上传未配置（MinIO未启用）");
        }

        try {
            String url = objectStorage.upload(
                    file.getInputStream(),
                    file.getSize(),
                    file.getContentType(),
                    file.getOriginalFilename()
            );
            return SingleResponse.of(url);
        } catch (Exception e) {
            return SingleResponse.buildSingleFailure("500", "上传失败");
        }
    }
}
