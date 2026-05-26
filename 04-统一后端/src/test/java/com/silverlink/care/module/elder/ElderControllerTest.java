package com.silverlink.care.module.elder;

import com.silverlink.care.module.audit.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ElderControllerTest {

    private ElderService elderService;
    private AuditLogService auditLogService;
    private ElderController controller;
    private Authentication authentication;
    private HttpServletRequest request;

    @BeforeEach
    void setUp() {
        elderService = mock(ElderService.class);
        auditLogService = mock(AuditLogService.class);
        controller = new ElderController(elderService, auditLogService);
        authentication = new UsernamePasswordAuthenticationToken("volunteer-1", "N/A");
        request = new MockHttpServletRequest();
    }

    @Test
    void coversUpdateAndReadEndpoints() {
        Map<String, Object> basic = Map.of("name", "李奶奶");
        Map<String, Object> health = Map.of("summary", "稳定");
        List<Map<String, String>> medications = List.of(Map.of("name", "阿司匹林"));
        List<Map<String, Object>> scales = List.of(Map.of("scaleName", "PHQ-9"));
        when(elderService.getScales("elder-1")).thenReturn(scales);

        assertEquals(200, controller.updateBasic("elder-1", basic, authentication, request).getCode());
        assertEquals(200, controller.saveHealth("elder-1", health, authentication, request).getCode());
        assertEquals(200, controller.saveMedications("elder-1", medications, authentication, request).getCode());
        assertEquals(200, controller.saveScales("elder-1", scales, authentication, request).getCode());
        assertEquals(1, controller.getScales("elder-1").getData().size());

        verify(elderService).saveBasic("elder-1", basic);
        verify(elderService).saveHealth("elder-1", health);
        verify(elderService).saveMedications("elder-1", medications);
        verify(elderService).saveScales("elder-1", scales);
        verify(auditLogService).record(authentication, request, "elder-1", "UPDATE_BASIC", "SUCCESS");
        verify(auditLogService).record(authentication, request, "elder-1", "SAVE_HEALTH_RECORD", "SUCCESS");
        verify(auditLogService).record(authentication, request, "elder-1", "SAVE_MEDICATIONS", "SUCCESS");
        verify(auditLogService).record(authentication, request, "elder-1", "SAVE_SCALE_RECORDS", "SUCCESS");
    }
}
