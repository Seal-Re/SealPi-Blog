package com.seal.blog.infra.user.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.seal.blog.domain.user.gateway.UserGateway;
import com.seal.blog.domain.user.model.BlogUser;
import com.seal.blog.infra.user.converter.UserInfraConverter;
import com.seal.blog.infra.user.mapper.UserMapper;
import com.seal.blog.infra.user.po.UserPO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

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
}
