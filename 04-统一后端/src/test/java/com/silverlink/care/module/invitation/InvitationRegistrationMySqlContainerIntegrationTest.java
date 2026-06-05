package com.silverlink.care.module.invitation;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
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
class InvitationRegistrationMySqlContainerIntegrationTest {

    @Container
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.0.36")
            .withDatabaseName("silverlink_it")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void registerMySqlProps(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
        registry.add("spring.datasource.driver-class-name", MYSQL::getDriverClassName);
    }

    @Autowired
    private MockMvc mockMvc;

    @Test
    void previewRegisterAndScopedReadAlsoWorkOnMysqlContainer() throws Exception {
        String phone = "tc-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        String password = "it-pass";

        mockMvc.perform(get("/api/invitations/FAMILY001/preview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code", is(200)))
                .andExpect(jsonPath("$.data.code", is("FAMILY001")));

        String registerResponse = mockMvc.perform(post("/api/invitations/FAMILY001/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "MySQL 集成家属",
                                  "phone": "%s",
                                  "relationship": "女儿",
                                  "password": "%s",
                                  "smsCode": "123456"
                                }
                                """.formatted(phone, password)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.ok", is(true)))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String token = registerResponse.replaceAll(".*\"token\":\"([^\"]+)\".*", "$1");

        mockMvc.perform(get("/api/family/me/elders")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id", is("elder-001")));
    }
}
