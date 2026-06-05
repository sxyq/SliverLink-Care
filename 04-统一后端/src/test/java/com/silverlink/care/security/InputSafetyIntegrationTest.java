package com.silverlink.care.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:input-safety-it;MODE=MySQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.flyway.enabled=false",
        "spring.sql.init.mode=always",
        "spring.sql.init.schema-locations=classpath:integration/input-safety-schema.sql",
        "spring.sql.init.data-locations=classpath:integration/input-safety-data.sql",
        "spring.jpa.hibernate.ddl-auto=none",
        "silverlink.cache.redis.enabled=false",
        "silverlink.sms.mock-enabled=true",
        "silverlink.sms.provider=mock"
})
class InputSafetyIntegrationTest {

    private static final String ADMIN_SIGNATURE_SECRET = "demo-admin-signature-secret";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void adminLoginRejectsSqlInjectionStylePayload() throws Exception {
        String requestPath = "/api/admin/login";
        String timestamp = String.valueOf(Instant.now().getEpochSecond());
        String nonce = "sqli-admin-test";

        mockMvc.perform(post(requestPath)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Timestamp", timestamp)
                        .header("X-Nonce", nonce)
                        .header("X-Signature", sign("POST", requestPath, timestamp, nonce))
                        .content("""
                                {
                                  "account": "admin' OR '1'='1",
                                  "password": "whatever"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(401))
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    void familyLoginRejectsSqlInjectionStylePayload() throws Exception {
        mockMvc.perform(post("/api/family/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "phone": "13800000001' OR '1'='1",
                                  "password": "whatever"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.ok").value(false))
                .andExpect(jsonPath("$.data.token").doesNotExist());
    }

    @Test
    void invitationPreviewRejectsSqlInjectionStyleCode() throws Exception {
        mockMvc.perform(get("/api/invitations/FAMILY001'%20OR%20'1'%3D'1/preview"))
                .andExpect(status().isBadRequest());
    }

    private String sign(String method, String requestPath, String timestamp, String nonce) throws Exception {
        String canonical = method.toUpperCase() + "\n" + requestPath + "\n" + timestamp + "\n" + nonce;
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(ADMIN_SIGNATURE_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] digest = mac.doFinal(canonical.getBytes(StandardCharsets.UTF_8));
        StringBuilder builder = new StringBuilder();
        for (byte current : digest) {
            builder.append(String.format("%02x", current));
        }
        return builder.toString();
    }
}
