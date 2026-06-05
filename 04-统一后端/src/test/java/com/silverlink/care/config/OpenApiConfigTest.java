package com.silverlink.care.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class OpenApiConfigTest {

    @Test
    void customOpenAPIReturnsNonNullInstance() {
        OpenApiConfig config = new OpenApiConfig();
        OpenAPI openAPI = config.customOpenAPI();
        assertNotNull(openAPI);
    }

    @Test
    void customOpenAPIHasCorrectTitle() {
        OpenApiConfig config = new OpenApiConfig();
        OpenAPI openAPI = config.customOpenAPI();
        Info info = openAPI.getInfo();
        assertNotNull(info);
        assertEquals("SilverLink Care API", info.getTitle());
    }

    @Test
    void customOpenAPIHasCorrectVersion() {
        OpenApiConfig config = new OpenApiConfig();
        OpenAPI openAPI = config.customOpenAPI();
        assertEquals("0.1.0", openAPI.getInfo().getVersion());
    }

    @Test
    void customOpenAPIHasCorrectDescription() {
        OpenApiConfig config = new OpenApiConfig();
        OpenAPI openAPI = config.customOpenAPI();
        assertEquals("智联名牌统一后端 API", openAPI.getInfo().getDescription());
    }
}
