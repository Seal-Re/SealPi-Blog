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
@TableName("t_tag")
public class TagPO implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId(value = "tag_id", type = IdType.AUTO)
    private Integer tagId;

    private String name;

    private Integer count;
}
