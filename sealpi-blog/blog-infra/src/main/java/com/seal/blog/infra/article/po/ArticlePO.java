package com.seal.blog.infra.article.po;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import lombok.Getter;
import lombok.Setter;

/**
 * <p>
 * 
 * </p>
 *
 * @author MyBatisPlus
 * @since 2026-01-29
 */
@Getter
@Setter
@TableName("t_article")
public class ArticlePO implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId(value = "article_id", type = IdType.AUTO)
    private Integer articleId;

    private String title;

    private String date;

    private String lastmod;

    private String summary;

    private String url;

    /**
     * 0为编辑 1为发布 2为删除
     */
    private Integer draft;

    private Integer count;
}
