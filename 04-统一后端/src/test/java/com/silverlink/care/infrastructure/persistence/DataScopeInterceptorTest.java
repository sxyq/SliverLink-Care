package com.silverlink.care.infrastructure.persistence;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class DataScopeInterceptorTest {

    @Test
    void canInstantiate() {
        DataScopeInterceptor interceptor = new DataScopeInterceptor();
        assertNotNull(interceptor);
    }
}
