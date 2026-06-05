package com.silverlink.care.config;

import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.config.annotation.CorsRegistration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WebMvcConfigTest {

    @Test
    void constructorAssignsAllowedOrigins() {
        WebMvcConfig config = new WebMvcConfig(List.of("https://sxyq27.online"));
        assertNotNull(config);
    }

    @Test
    void addCorsMappingsRegistersGlobalCorsPolicy() {
        CorsRegistry registry = mock(CorsRegistry.class);
        CorsRegistration registration = mock(CorsRegistration.class);
        when(registry.addMapping("/**")).thenReturn(registration);
        when(registration.allowedOrigins("https://sxyq27.online")).thenReturn(registration);
        when(registration.allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")).thenReturn(registration);
        when(registration.allowedHeaders("Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With")).thenReturn(registration);
        when(registration.exposedHeaders("Authorization")).thenReturn(registration);
        when(registration.allowCredentials(true)).thenReturn(registration);
        when(registration.maxAge(3600)).thenReturn(registration);

        WebMvcConfig webMvcConfig = new WebMvcConfig(List.of("https://sxyq27.online"));
        webMvcConfig.addCorsMappings(registry);

        verify(registry).addMapping("/**");
        verify(registration).allowedOrigins("https://sxyq27.online");
        verify(registration).allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS");
        verify(registration).allowedHeaders("Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With");
        verify(registration).exposedHeaders("Authorization");
        verify(registration).allowCredentials(true);
        verify(registration).maxAge(3600);
    }
}
