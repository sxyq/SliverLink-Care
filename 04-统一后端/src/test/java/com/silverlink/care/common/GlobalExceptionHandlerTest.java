package com.silverlink.care.common;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GlobalExceptionHandlerTest {

    @Test
    void mapsBizExceptionCodesToHttpStatus() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();

        assertEquals(HttpStatus.UNAUTHORIZED, handler.handleBiz(new BizException(401, "unauthorized")).getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, handler.handleBiz(new BizException(403, "forbidden")).getStatusCode());
        assertEquals(HttpStatus.NOT_FOUND, handler.handleBiz(new BizException(404, "missing")).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, handler.handleBiz(new BizException(422, "bad")).getStatusCode());
    }

    @Test
    void mapsGenericExceptionToInternalServerError() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();

        var response = handler.handleGeneric(new RuntimeException("boom"));

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertEquals(500, response.getBody().getCode());
        assertEquals("boom", response.getBody().getMessage());
    }
}
