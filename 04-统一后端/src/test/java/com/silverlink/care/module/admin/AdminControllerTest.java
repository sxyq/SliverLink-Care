package com.silverlink.care.module.admin;

import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import com.silverlink.care.module.audit.AuditLogService;
import com.silverlink.care.module.qrcode.QrCodeService;
import com.silverlink.care.security.AuthCookieService;
import com.silverlink.care.security.JwtTokenProvider;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.TestingAuthenticationToken;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class AdminControllerTest {

    private AdminDashboardService dashboardService;
    private JwtTokenProvider jwtTokenProvider;
    private AuthCookieService authCookieService;
    private AuditLogService auditLogService;
    private SilverLinkDataService data;
    private QrCodeService qrCodeService;
    private AdminController controller;
    private MockHttpServletRequest request;
    private MockHttpServletResponse response;

    @BeforeEach
    void setUp() {
        dashboardService = mock(AdminDashboardService.class);
        jwtTokenProvider = mock(JwtTokenProvider.class);
        authCookieService = mock(AuthCookieService.class);
        auditLogService = mock(AuditLogService.class);
        data = mock(SilverLinkDataService.class);
        qrCodeService = mock(QrCodeService.class);
        controller = new AdminController(dashboardService, jwtTokenProvider, authCookieService, auditLogService, data, qrCodeService);
        request = new MockHttpServletRequest();
        response = new MockHttpServletResponse();
    }

    @Test
    void loginReturnsTokenOnSuccessAndFailOtherwise() {
        when(data.login("admin", "pwd", "SYSTEM_ADMIN")).thenReturn(Optional.of(Map.of("name_enc", "enc")));
        when(jwtTokenProvider.generateToken("admin", "SYSTEM_ADMIN", 7200000L)).thenReturn("token-admin");

        var ok = controller.login(Map.of("account", "admin", "password", "pwd"), request, response);
        assertEquals(200, ok.getCode());
        assertNull(ok.getData().get("token"));
        assertEquals("系统管理员", ok.getData().get("role"));
        verify(authCookieService).issueAdminCookie(request, response, "token-admin", 7200000L);

        when(data.login("admin", "bad", "SYSTEM_ADMIN")).thenReturn(Optional.empty());
        var fail = controller.login(Map.of("username", "admin", "password", "bad"), request, response);
        assertEquals(401, fail.getCode());
        assertEquals("账号或密码错误", fail.getMessage());
    }

    @Test
    void coversDashboardAndRoleMetadataEndpoints() {
        when(dashboardService.stats()).thenReturn(Map.of("elderCount", 2));
        when(dashboardService.elders()).thenReturn(List.of(Map.of("id", "elder-1")));
        when(dashboardService.volunteers()).thenReturn(List.of(Map.of("id", "vol-1")));
        when(dashboardService.auditLogs()).thenReturn(List.of(Map.of("id", "log-1")));

        assertEquals(2, controller.dashboard().getData().get("elderCount"));
        assertEquals(1, controller.elders().getData().size());
        assertEquals(1, controller.volunteers().getData().size());
        assertEquals(1, controller.auditLogs().getData().size());
        assertEquals(3, controller.roles().getData().size());
        assertEquals(5, controller.permissions().getData().size());
        assertEquals(200, controller.updatePermissions(Map.of()).getCode());
    }

    @Test
    void coversElderAndVolunteerMutations() throws Exception {
        var auth = new TestingAuthenticationToken("admin", "pwd");
        when(data.createElder(any())).thenReturn("elder-1");
        when(data.elderDetail("elder-1", false)).thenReturn(Map.of("archiveNo", "A-001", "name", "李奶奶"));
        when(data.createVolunteer(any())).thenReturn("vol-1");

        var createElderResponse = controller.createElder(Map.of("name", "李奶奶"), auth, request);
        assertEquals("elder-1", createElderResponse.getData().get("id"));
        verify(qrCodeService).generateWithToken("elder-1", "A-001");

        assertEquals("vol-1", controller.createVolunteer(Map.of("name", "志愿者甲"), auth, request).getData().get("id"));
        assertEquals(200, controller.updateElder("elder-1", Map.of("name", "李奶奶"), auth, request).getCode());
        var qrCode = new com.silverlink.care.module.qrcode.QrCodeEntity();
        qrCode.setId("qr-1");
        qrCode.setStatus("ENABLED");
        when(qrCodeService.findCurrentByElder("elder-1")).thenReturn(qrCode);
        assertEquals(200, controller.deleteElder("elder-1", auth, request).getCode());
        assertEquals(200, controller.updateElderStatus("elder-1", Map.of("status", "ACTIVE"), auth, request).getCode());
        assertEquals(200, controller.updateElderStatus("elder-1", Map.of("status", "DISABLED"), auth, request).getCode());
        assertEquals(200, controller.updateVolunteer("vol-1", Map.of("name", "志愿者乙"), auth, request).getCode());
        assertEquals(200, controller.updateVolunteerScope("vol-1", Map.of("elderIds", List.of("elder-1", "elder-2")), auth, request).getCode());
        assertEquals(200, controller.deleteVolunteer("vol-1", auth, request).getCode());

        verify(data).setVolunteerScope("vol-1", List.of("elder-1", "elder-2"));
        verify(qrCodeService, times(2)).disable(anyString());
    }

    @Test
    void coversMedicationAndScaleQueriesAndLogout() {
        var auth = new TestingAuthenticationToken("admin", "pwd");
        when(data.medications("elder-1")).thenReturn(List.of(Map.of(
                "id", "med-1",
                "name", "阿司匹林",
                "dosage", "100mg",
                "usage", "口服",
                "timing", "早餐后"
        )));
        when(data.elderDetail("elder-1", false)).thenReturn(Map.of("archiveNo", "A-001", "name", "李奶奶"));
        when(data.allMedicationsForAdmin()).thenReturn(List.of(Map.of("id", "med-2")));
        when(data.scales("elder-1")).thenReturn(List.of(new java.util.LinkedHashMap<>(Map.of("scale", "PHQ-9", "score", 6))));

        assertEquals(1, controller.medications("elder-1").getData().size());
        assertEquals(1, controller.medications(null).getData().size());
        var scales = controller.scales("elder-1").getData();
        assertEquals("A-001", scales.get(0).get("archiveNo"));
        assertEquals("李奶奶", scales.get(0).get("elderName"));
        assertEquals("PHQ-9", scales.get(0).get("scaleName"));
        assertEquals(200, controller.logout(auth, request, response).getCode());

        verify(auditLogService).record(any(), any(HttpServletRequest.class), anyString(), anyString(), anyString());
    }
}
