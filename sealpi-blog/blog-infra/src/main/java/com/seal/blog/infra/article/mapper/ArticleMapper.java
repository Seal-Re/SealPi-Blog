package com.seal.blog.infra.article.mapper;

import com.seal.blog.infra.article.po.ArticlePO;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

/**
 * <p>
 *  Mapper 接口
 * </p>
 *
 * @author MyBatisPlus
 * @since 2026-01-29
 */
@Mapper
public interface ArticleMapper extends BaseMapper<ArticlePO> {

    @Select("SELECT COALESCE(SUM(view_count), 0) FROM t_article")
    Long selectTotalViewCount();

}
