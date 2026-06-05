package com.silverlink.care.module.invitation;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RegisterResultDtoTest {

    @Test
    void isSuccessReflectsOkFlag() {
        RegisterResultDto success = new RegisterResultDto(true, "token", "ok");
        RegisterResultDto failure = new RegisterResultDto(false, "", "fail");
        RegisterResultDto unset = new RegisterResultDto();

        assertTrue(success.isSuccess());
        assertFalse(failure.isSuccess());
        assertFalse(unset.isSuccess());
    }
}
