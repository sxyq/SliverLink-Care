package com.silverlink.care.module.scan;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:scan-scope-it;MODE=MySQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.flyway.enabled=false",
        "spring.sql.init.mode=always",
        "spring.sql.init.schema-locations=classpath:integration/scan-session-scope-schema.sql",
        "spring.sql.init.data-locations=classpath:integration/scan-session-scope-data.sql",
        "spring.jpa.hibernate.ddl-auto=none",
        "silverlink.cache.redis.enabled=false"
})
class ScanSessionScopeIntegrationTest {

    private static final String SESSION_ID = "scan-session-it-verified";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void verifiedSessionCanReadBoundElderData() throws Exception {
        mockMvc.perform(get("/api/scan/basic-info")
                        .param("elderId", "elder-002")
                        .param("sessionId", SESSION_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.elderId").value("elder-002"));

        mockMvc.perform(get("/api/scan/archive")
                        .param("elderId", "elder-002")
                        .param("sessionId", SESSION_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        mockMvc.perform(get("/api/scan/medications")
                        .param("elderId", "elder-002")
                        .param("sessionId", SESSION_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0].name").value("阿司匹林"));

        mockMvc.perform(get("/api/scan/scales")
                        .param("elderId", "elder-002")
                        .param("sessionId", SESSION_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0].name").value("PHQ-9"));

        mockMvc.perform(get("/api/scan/scales/PHQ-9")
                        .param("elderId", "elder-002")
                        .param("sessionId", SESSION_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.answers[0].question").value("睡眠情况"));
    }

    @Test
    void verifiedSessionCannotReadOtherElderData() throws Exception {
        mockMvc.perform(get("/api/scan/basic-info")
                        .param("elderId", "elder-001")
                        .param("sessionId", SESSION_ID))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Verification session elder mismatch"));

        mockMvc.perform(get("/api/scan/archive")
                        .param("elderId", "elder-001")
                        .param("sessionId", SESSION_ID))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Verification session elder mismatch"));

        mockMvc.perform(get("/api/scan/medications")
                        .param("elderId", "elder-001")
                        .param("sessionId", SESSION_ID))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Verification session elder mismatch"));

        mockMvc.perform(get("/api/scan/scales")
                        .param("elderId", "elder-001")
                        .param("sessionId", SESSION_ID))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Verification session elder mismatch"));

        mockMvc.perform(get("/api/scan/scales/PHQ-9")
                        .param("elderId", "elder-001")
                        .param("sessionId", SESSION_ID))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Verification session elder mismatch"));
    }
}
