package com.seal.blog.client.common;

import lombok.Data;

import java.io.Serializable;

@Data
public class Response implements Serializable {
    private static final long serialVersionUID = 1L;

    private boolean success;
    private String errorCode;
    private String errorMessage;

    public static Response buildSuccess() {
        Response response = new Response();
        response.setSuccess(true);
        return response;
    }

    public static Response buildFailure(String errorCode, String errorMessage) {
        Response response = new Response();
        response.setSuccess(false);
        response.setErrorCode(errorCode);
        response.setErrorMessage(errorMessage);
        return response;
    }

}
