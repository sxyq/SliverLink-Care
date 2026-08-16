package com.silverlink.care.common;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ApiResponseTest {

    @Test
    void factoryMethodsBuildExpectedEnvelope() {
        ApiResponse<String> ok = ApiResponse.ok("data");
        assertEquals(200, ok.getCode());
        assertEquals("success", ok.getMessage());
        assertEquals("data", ok.getData());

        ApiResponse<Object> empty = ApiResponse.ok();
        assertEquals(200, empty.getCode());
        assertNull(empty.getData());

        ApiResponse<Object> fail = ApiResponse.fail(403, "forbidden");
        assertEquals(403, fail.getCode());
        assertEquals("forbidden", fail.getMessage());
        assertNull(fail.getMessageKey());
        assertNull(fail.getData());

        ApiResponse<Object> localizedFail = ApiResponse.fail(400, "bad request", "errors.requestFailed");
        assertEquals("errors.requestFailed", localizedFail.getMessageKey());
    }

    @Test
    void settersAndConstructorWork() {
        ApiResponse<String> response = new ApiResponse<>(201, "created", "id-1");
        response.setCode(202);
        response.setMessage("accepted");
        response.setData("id-2");

        assertEquals(202, response.getCode());
        assertEquals("accepted", response.getMessage());
        assertEquals("id-2", response.getData());
    }
}
