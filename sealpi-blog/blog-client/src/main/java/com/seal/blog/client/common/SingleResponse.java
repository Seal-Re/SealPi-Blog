package com.seal.blog.client.common;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class SingleResponse<T> extends Response {

    private T data;

    public static <T> SingleResponse<T> of(T data) {
        SingleResponse<T> response = new SingleResponse<>();
        response.setSuccess(true);
        response.setData(data);
        return response;
    }

    public static <T> SingleResponse<T> buildSingleFailure(String errrCode, String errMessage) {
        SingleResponse<T> response = new SingleResponse<>();
        response.setSuccess(false);
        response.setErrorCode(errrCode);
        response.setErrorMessage(errMessage);
        return response;
    }
}
