package com.silverlink.care.infrastructure.persistence;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class MyBatisPlusConfigTest {

    @Test
    void canInstantiate() {
        MyBatisPlusConfig config = new MyBatisPlusConfig();
        assertNotNull(config);
    }
}
