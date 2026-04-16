package com.seal.blog.client.user.dto.cmd;

import lombok.Data;

@Data
public class UpdateUserAdminCmd {

    private Long userId;

    /** ALLOWED | READ_ONLY — null means no change */
    private String commentPermission;

    /** null means no change */
    private Boolean banned;
}
