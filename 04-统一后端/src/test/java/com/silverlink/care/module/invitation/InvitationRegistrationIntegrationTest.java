package com.silverlink.care.module.invitation;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:invitation-it;MODE=MySQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.flyway.enabled=false",
        "spring.sql.init.mode=always",
        "spring.sql.init.schema-locations=classpath:integration/invitation-flow-schema.sql",
        "spring.sql.init.data-locations=classpath:integration/invitation-flow-data.sql",
        "spring.jpa.hibernate.ddl-auto=none",
        "silverlink.sms.mock-enabled=true",
        "silverlink.sms.provider=mock",
        "silverlink.sms.universal-bypass-code=123456",
        "silverlink.cache.redis.enabled=false"
})
class InvitationRegistrationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void previewRegisterLoginAndScopedFamilyReadFlowWorks() throws Exception {
        String phone = "it-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        String password = "it-pass";

        mockMvc.perform(get("/api/invitations/FAMILY001/preview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code", is(200)))
                .andExpect(jsonPath("$.data.code", is("FAMILY001")))
                .andExpect(jsonPath("$.data.status", is("ACTIVE")));

        String registerResponse = mockMvc.perform(post("/api/invitations/FAMILY001/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "集成测试家属",
                                  "phone": "%s",
                                  "relationship": "女儿",
                                  "password": "%s",
                                  "smsCode": "123456"
                                }
                                """.formatted(phone, password)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code", is(200)))
                .andExpect(jsonPath("$.data.ok", is(true)))
                .andExpect(jsonPath("$.data.message", is("注册成功")))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String token = registerResponse.replaceAll(".*\"token\":\"([^\"]+)\".*", "$1");

        mockMvc.perform(post("/api/family/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "phone": "%s",
                                  "password": "%s"
                                }
                                """.formatted(phone, password)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code", is(200)))
                .andExpect(jsonPath("$.data.ok", is(true)));

        mockMvc.perform(get("/api/family/me/elders")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code", is(200)))
                .andExpect(jsonPath("$.data[0].id", is("elder-001")));

        mockMvc.perform(get("/api/family/elders/elder-002")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", is("无权访问该老人信息")));
    }
}
