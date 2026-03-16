package com.seal.blog.domain.article.model;

public enum ArticleStatus {
    DRAFT(0, "草稿"),
    PUBLISHED(1, "已发布"),
    ARCHIVED(2, "已删除");

    // Stored in DB.
    private final int code;
    private final String desc;

    ArticleStatus(int code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public int getCode() {
        return code;
    }

    public String getDesc() {
        return desc;
    }

    // 根据 code 获取枚举的工具方法
    public static ArticleStatus of(Integer code) {
        if (code == null) return DRAFT;
        for (ArticleStatus status : values()) {
            if (status.code == code) return status;
        }
        return DRAFT;
    }
}