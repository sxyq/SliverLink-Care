package com.silverlink.care.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CurrentUserTest {

    @Test
    void constructorAndAccessorsRoundTrip() {
        CurrentUser user = new CurrentUser("u1", "account-1", "ADMIN");

        assertEquals("u1", user.getUserId());
        assertEquals("account-1", user.getAccount());
        assertEquals("ADMIN", user.getRole());

        user.setUserId("u2");
        user.setAccount("account-2");
        user.setRole("VOLUNTEER");

        assertEquals("u2", user.getUserId());
        assertEquals("account-2", user.getAccount());
        assertEquals("VOLUNTEER", user.getRole());
    }
}
