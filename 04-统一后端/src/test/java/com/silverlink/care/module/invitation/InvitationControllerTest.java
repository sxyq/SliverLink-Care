package com.silverlink.care.module.invitation;

import com.silverlink.care.module.audit.AuditLogService;
import com.silverlink.care.security.AuthCookieService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class InvitationControllerTest {

    private InvitationService invitationService;
    private AuditLogService auditLogService;
    private AuthCookieService authCookieService;
    private InvitationController controller;
    private MockHttpServletRequest request;
    private MockHttpServletResponse response;

    @BeforeEach
    void setUp() {
        invitationService = mock(InvitationService.class);
        auditLogService = mock(AuditLogService.class);
        authCookieService = mock(AuthCookieService.class);
        controller = new InvitationController(invitationService, auditLogService, authCookieService);
        request = new MockHttpServletRequest();
        response = new MockHttpServletResponse();
    }

    @Test
    void coversInvitationEndpoints() {
        InvitationPreviewDto previewDto = new InvitationPreviewDto();
        previewDto.setElderName("李奶奶");
        when(invitationService.preview("ABC123")).thenReturn(previewDto);
        assertEquals("李奶奶", controller.preview("ABC123").getData().getElderName());

        SendSmsRequest sendSmsRequest = new SendSmsRequest();
        sendSmsRequest.setPhone("13800000000");
        assertEquals(200, controller.sendSms("ABC123", sendSmsRequest, request).getCode());

        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.setPhone("13800000000");
        RegisterResultDto registerResult = new RegisterResultDto(true, "token-family", null);
        when(invitationService.register("ABC123", registerRequest)).thenReturn(registerResult);
        assertEquals("token-family", controller.register("ABC123", registerRequest, request, response).getData().getToken());

        InvitationAdminDto adminDto = new InvitationAdminDto();
        adminDto.setId("inv-1");
        adminDto.setCode("ABC123");
        when(invitationService.listForAdmin()).thenReturn(List.of(adminDto));
        when(invitationService.create(any())).thenReturn(adminDto);

        assertEquals(1, controller.listForAdmin().getData().size());
        assertEquals("ABC123", controller.create(new CreateInvitationRequest(), request).getData().getCode());
        assertEquals(200, controller.disable("inv-1", request).getCode());
        assertEquals(200, controller.delete("inv-1", request).getCode());
    }
}
