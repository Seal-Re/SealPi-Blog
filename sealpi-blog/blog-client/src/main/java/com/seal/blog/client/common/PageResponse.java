package com.seal.blog.client.common;

import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.Collection;
import java.util.Collections;

@Data
@EqualsAndHashCode(callSuper = true)
public class PageResponse<T> extends Response {

    private int totalCount;
    private int pageSize;
    private int pageIndex;
    private Collection<T> data;

    public static <T> PageResponse<T> of(Collection<T> data, int totalCount, int pageSize, int pageIndex) {
        PageResponse<T> response = new PageResponse<T>();
        response.setSuccess(true);
        response.setData(data);
        response.setTotalCount(totalCount);
        response.setPageSize(pageSize);
        response.setPageIndex(pageIndex);
        return response;
    }

    public static <T> PageResponse<T> of(Collection<T> data, int totalCount) {
        PageResponse<T> response = new PageResponse<T>();
        response.setSuccess(true);
        response.setData(data);
        response.setTotalCount(totalCount);
        return response;

    }

    public static <T> PageResponse<T> empty() {
        PageResponse<T> response = new PageResponse<T>();
        response.setSuccess(true);
        response.setData(Collections.emptyList());
        response.setTotalCount(0);
        return response;
    }

}
