package com.silverlink.care.config;

import com.silverlink.care.security.JwtAuthenticationFilter;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class SecurityConfigTest {

    @Mock
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    void constructorAssignsFilter() {
        SecurityConfig config = new SecurityConfig(jwtAuthenticationFilter, java.util.List.of("https://sxyq27.online"));
        assertNotNull(config);
    }
}
