package com.seal.blog.infra.article.mapper;

import com.seal.blog.infra.article.po.TagPO;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;

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

    /**
     * Returns all tags that appear on at least one published article,
     * with the article count for each tag.
     */
    @Select("SELECT t.tag_id, t.name, COUNT(DISTINCT r.article_id) AS count " +
            "FROM t_tag t " +
            "INNER JOIN t_rely r ON t.tag_id = r.tag_id " +
            "INNER JOIN t_article a ON r.article_id = a.article_id " +
            "WHERE a.draft = 1 " +
            "GROUP BY t.tag_id, t.name " +
            "ORDER BY count DESC, t.name ASC")
    List<TagPO> selectPublishedTagsWithCount();

}
