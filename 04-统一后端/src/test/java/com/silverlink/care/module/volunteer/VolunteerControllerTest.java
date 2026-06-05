package com.silverlink.care.module.volunteer;

import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import com.silverlink.care.module.audit.AuditLogService;
import com.silverlink.care.security.AuthCookieService;
import com.silverlink.care.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.TestingAuthenticationToken;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class VolunteerControllerTest {

    private VolunteerService volunteerService;
    private JwtTokenProvider jwtTokenProvider;
    private AuthCookieService authCookieService;
    private AuditLogService auditLogService;
    private SilverLinkDataService data;
    private VolunteerController controller;
    private MockHttpServletRequest request;
    private MockHttpServletResponse response;

    @BeforeEach
    void setUp() {
        volunteerService = mock(VolunteerService.class);
        jwtTokenProvider = mock(JwtTokenProvider.class);
        authCookieService = mock(AuthCookieService.class);
        auditLogService = mock(AuditLogService.class);
        data = mock(SilverLinkDataService.class);
        controller = new VolunteerController(volunteerService, jwtTokenProvider, authCookieService, auditLogService, data);
        request = new MockHttpServletRequest();
        response = new MockHttpServletResponse();
    }

    @Test
    void coversVolunteerEndpoints() throws Exception {
        when(data.login("vol1", "pwd", "VOLUNTEER")).thenReturn(Optional.of(Map.of("name_enc", "enc-name")));
        when(data.dec("enc-name")).thenReturn("志愿者甲");
        when(jwtTokenProvider.generateToken("vol1", "VOLUNTEER", 86400000L)).thenReturn("token-vol");

        var loginOk = controller.login(Map.of("account", "vol1", "password", "pwd"), request, response);
        assertEquals("token-vol", loginOk.getData().get("token"));
        assertEquals("志愿者甲", loginOk.getData().get("name"));

        when(data.login("vol1", "bad", "VOLUNTEER")).thenReturn(Optional.empty());
        assertEquals(401, controller.login(Map.of("account", "vol1", "password", "bad"), request, response).getCode());

        VolunteerRegisterRequest registerRequest = new VolunteerRegisterRequest();
        registerRequest.setInvitationCode("INV-1");
        when(volunteerService.registerWithInvitation(registerRequest)).thenReturn(Map.of(
                "token", "token-reg",
                "account", "vol2",
                "invitationCode", "INV-1"
        ));
        assertEquals("token-reg", controller.register(registerRequest, request, response).getData().get("token"));

        var auth = new TestingAuthenticationToken("vol1", "pwd");
        when(volunteerService.getMyElders("vol1")).thenReturn(List.of(Map.of("id", "elder-1")));
        when(volunteerService.getMyProfile("vol1")).thenReturn(Map.of("account", "vol1"));
        when(volunteerService.updateMyProfile(eq("vol1"), any())).thenReturn(Map.of("account", "vol2", "name", "志愿者乙", "phone", "13800000000"));
        when(jwtTokenProvider.generateToken("vol2", "VOLUNTEER", 86400000L)).thenReturn("token-vol2");
        when(volunteerService.createMyElder(eq("vol1"), any())).thenReturn("elder-1");
        when(volunteerService.getMyElderQrCode("vol1", "elder-1")).thenReturn(Map.of("id", "qr-1"));
        when(volunteerService.regenerateMyElderQrCode("vol1", "elder-1")).thenReturn(Map.of("status", "已重新生成"));
        when(volunteerService.requestDisableMyElderQrCode("vol1", "elder-1")).thenReturn(Map.of("status", "已停用"));

        assertEquals(1, controller.myElders(auth).getData().size());
        assertEquals("vol1", controller.myProfile(auth).getData().get("account"));
        assertEquals("token-vol2", controller.updateMyProfile(Map.of("account", "vol2"), auth, request, response).getData().get("token"));
        assertEquals("elder-1", controller.createMyElder(Map.of("name", "李奶奶"), auth, request).getData().get("id"));
        assertEquals("qr-1", controller.myElderQrCode("elder-1", auth).getData().get("id"));
        assertEquals("已重新生成", controller.regenerateMyElderQrCode("elder-1", auth, request).getData().get("status"));
        assertEquals("已停用", controller.disableMyElderQrCode("elder-1", auth, request).getData().get("status"));
        assertEquals(200, controller.logout(auth, request, response).getCode());
    }
}
