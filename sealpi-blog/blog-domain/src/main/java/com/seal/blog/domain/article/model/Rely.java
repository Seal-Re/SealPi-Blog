package com.seal.blog.domain.article.model;

import lombok.Getter;

@Getter
public class Rely {

    private Integer id;
    private Integer articleId;
    private Integer tagId;

    public Rely(Integer articleId, Integer tagId) {
        this.articleId = articleId;
        this.tagId = tagId;

        this.initValidation();
    }

    public void assignId(Integer id) {
        if (this.id != null) {
            throw new IllegalStateException("已有id，不能重复赋值");
        }
        this.id = id;
    }

    private void initValidation(){
        if (this.articleId == null ||  this.tagId == null) {
            throw new IllegalStateException("Rely can't be null");
        }
    }
}
