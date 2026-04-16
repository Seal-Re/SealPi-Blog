package com.seal.blog.infra.user.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.seal.blog.client.common.PageResponse;
import com.seal.blog.client.user.dto.qry.UserPageQry;
import com.seal.blog.domain.user.gateway.UserGateway;
import com.seal.blog.domain.user.model.BlogUser;
import com.seal.blog.infra.user.converter.UserInfraConverter;
import com.seal.blog.infra.user.mapper.UserMapper;
import com.seal.blog.infra.user.po.UserPO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
public class UserGatewayImpl implements UserGateway {

    private final UserMapper userMapper;
    private final UserInfraConverter converter;

    @Override
    public BlogUser findByGithubId(long githubId) {
        UserPO po = userMapper.selectOne(
                new LambdaQueryWrapper<UserPO>().eq(UserPO::getGithubId, githubId)
        );
        return converter.toDomain(po);
    }

    @Override
    public void save(BlogUser user) {
        UserPO po = converter.toPO(user);
        if (po.getUserId() == null) {
            userMapper.insert(po);
            if (po.getUserId() != null) {
                user.setUserId(po.getUserId());
            }
        } else {
            userMapper.updateById(po);
        }
    }

    @Override
    public PageResponse<BlogUser> findPage(UserPageQry qry) {
        int pageIndex = qry.getPageIndex() != null ? qry.getPageIndex() : 1;
        int pageSize = qry.getPageSize() != null ? qry.getPageSize() : 20;

        LambdaQueryWrapper<UserPO> wrapper = new LambdaQueryWrapper<>();

        String keyword = qry.getQ();
        if (keyword != null && !keyword.isBlank()) {
            wrapper.and(w -> w
                    .like(UserPO::getNickname, keyword)
                    .or().like(UserPO::getGithubLogin, keyword)
                    .or().like(UserPO::getEmail, keyword)
            );
        }

        if (qry.getBanned() != null) {
            wrapper.eq(UserPO::getIsBanned, qry.getBanned() ? 1 : 0);
        }

        wrapper.orderByDesc(UserPO::getCreatedAt);

        Page<UserPO> pageRequest = new Page<>(pageIndex, pageSize);
        Page<UserPO> result = userMapper.selectPage(pageRequest, wrapper);

        List<BlogUser> users = result.getRecords().stream()
                .map(converter::toDomain)
                .collect(Collectors.toList());

        return PageResponse.of(users, (int) result.getTotal(), pageSize, pageIndex);
    }

    @Override
    public BlogUser findById(Long userId) {
        UserPO po = userMapper.selectById(userId);
        return converter.toDomain(po);
    }
}
