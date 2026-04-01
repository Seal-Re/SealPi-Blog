package com.seal.blog.infra.user.po;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDateTime;

@Getter
@Setter
@TableName("t_user")
public class UserPO implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId(value = "user_id", type = IdType.AUTO)
    private Long userId;

    private Long githubId;
    private String githubLogin;
    private String nickname;
    private String email;
    private String avatarUrl;
    private String bio;
    private String websiteUrl;
    private String githubProfileUrl;
    private String syncPolicy;
    private String commentPermission;
    private Integer isBanned;
    private LocalDateTime createdAt;
    private LocalDateTime lastLoginAt;
}
