package com.seal.blog.domain.article.model;

import lombok.Getter;

@Getter
public class Tag {

    private Integer tagId;
    private String name;
    private Integer count;

    public Tag(String name) {
        this.name = name;
        this.count = 0;

        this.initValidation();
    }

    public void modify(String name, Integer count) {
        this.name = name;
        this.count = count;

        this.initValidation();
    }

    public void assignId(Integer id) {
        if (this.tagId != null) {
            throw new IllegalStateException("已有id，不能重复赋值");
        }
        this.tagId = id;
    }

    private void initValidation() {
        if (this.name == null) {
            throw new IllegalStateException("name is required");
        }
        if (this.count < 0) {
            throw new IllegalStateException("Value of count is broken");
        }
    }
}
