package com.seal.blog.infra.article.service.impl;

import com.seal.blog.infra.article.po.ArticlePO;
import com.seal.blog.infra.article.mapper.ArticleMapper;
import com.seal.blog.infra.article.service.IArticleService;
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
public class ArticleServiceImpl extends ServiceImpl<ArticleMapper, ArticlePO> implements IArticleService {

}
