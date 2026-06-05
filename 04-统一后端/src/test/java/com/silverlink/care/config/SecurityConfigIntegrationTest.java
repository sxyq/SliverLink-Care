package com.silverlink.care.config;

import com.silverlink.care.security.JwtAuthenticationFilter;
import com.silverlink.care.security.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.test.context.TestPropertySource;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;

@SpringBootTest(classes = {
        SecurityConfig.class,
        WebMvcConfig.class,
        SecurityConfigIntegrationTest.SecurityTestConfig.class,
        SecurityConfigIntegrationTest.SecurityTestController.class
})
@AutoConfigureMockMvc
@TestPropertySource(properties = "silverlink.security.allowed-origins=https://sxyq27.online")
class SecurityConfigIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FilterChainProxy springSecurityFilterChain;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Test
    void filterChainPermitsPublicEndpointsAndProtectsAdminEndpoints() throws Exception {
        assertNotNull(springSecurityFilterChain);

        mockMvc.perform(get("/api/scan/ping"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/admin/protected"))
                .andExpect(status().isForbidden());
    }

    @Test
    void roleBoundariesAreEnforced() throws Exception {
        String adminToken = jwtTokenProvider.generateToken("admin", "SYSTEM_ADMIN", 60_000L);
        String volunteerToken = jwtTokenProvider.generateToken("volunteer", "VOLUNTEER", 60_000L);
        String familyToken = jwtTokenProvider.generateToken("family", "FAMILY", 60_000L);

        mockMvc.perform(get("/api/admin/protected")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/family/protected")
                        .header("Authorization", "Bearer " + familyToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/volunteer/me/profile")
                        .header("Authorization", "Bearer " + volunteerToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/admin/protected")
                        .header("Authorization", "Bearer " + familyToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/family/protected")
                        .header("Authorization", "Bearer " + volunteerToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/volunteer/me/profile")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void preflightRequestsFromAllowedOriginAreAccepted() throws Exception {
        mockMvc.perform(options("/api/volunteer/login")
                        .header("Origin", "https://sxyq27.online")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "https://sxyq27.online"));
    }

    @TestConfiguration
    static class SecurityTestConfig {
        @Bean
        JwtTokenProvider jwtTokenProvider() {
            return new JwtTokenProvider();
        }

        @Bean
        JwtAuthenticationFilter jwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider) {
            return new JwtAuthenticationFilter(jwtTokenProvider);
        }
    }

    @RestController
    static class SecurityTestController {
        @GetMapping("/api/scan/ping")
        ResponseEntity<String> publicScanEndpoint() {
            return ResponseEntity.ok("ok");
        }

        @GetMapping("/api/admin/protected")
        ResponseEntity<String> protectedAdminEndpoint() {
            return ResponseEntity.ok("secret");
        }

        @GetMapping("/api/family/protected")
        ResponseEntity<String> protectedFamilyEndpoint() {
            return ResponseEntity.ok("family");
        }

        @GetMapping("/api/volunteer/me/profile")
        ResponseEntity<String> protectedVolunteerEndpoint() {
            return ResponseEntity.ok("volunteer");
        }
    }
}
