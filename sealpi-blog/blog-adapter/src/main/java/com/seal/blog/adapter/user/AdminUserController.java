package com.seal.blog.adapter.user;

import com.seal.blog.client.common.PageResponse;
import com.seal.blog.client.user.api.UserServiceI;
import com.seal.blog.client.user.dto.qry.UserPageQry;
import com.seal.blog.client.user.dto.vo.UserProfileVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserServiceI userService;

    @GetMapping("/users")
    public PageResponse<UserProfileVO> getUsers(@Valid UserPageQry qry) {
        return userService.getUsers(qry);
    }
}
