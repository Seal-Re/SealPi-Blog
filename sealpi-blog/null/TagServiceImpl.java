package com.seal.blog.infra.article.service.impl;

import com.seal.blog.infra.article.po.TagPO;
import com.seal.blog.infra.article.mapper.TagMapper;
import com.seal.blog.infra.article.service.ITagService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

/**
 * <p>
 *  服务实现类
 * </p>
 *
 * @author MyBatisPlus
 * @since 2026-01-29
 */
@Service
public class TagServiceImpl extends ServiceImpl<TagMapper, TagPO> implements ITagService {

}
