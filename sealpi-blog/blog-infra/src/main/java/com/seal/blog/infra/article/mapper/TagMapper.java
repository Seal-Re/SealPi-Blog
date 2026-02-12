package com.seal.blog.infra.article.mapper;

import com.seal.blog.infra.article.po.TagPO;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/**
 * <p>
 *  Mapper 接口
 * </p>
 *
 * @author MyBatisPlus
 * @since 2026-01-29
 */
@Mapper
public interface TagMapper extends BaseMapper<TagPO> {

}
