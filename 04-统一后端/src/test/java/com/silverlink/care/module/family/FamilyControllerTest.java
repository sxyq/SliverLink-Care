package com.silverlink.care.module.family;

import com.silverlink.care.module.audit.AuditLogService;
import com.silverlink.care.security.AuthCookieService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class FamilyControllerTest {

    private FamilyService familyService;
    private AuditLogService auditLogService;
    private AuthCookieService authCookieService;
    private FamilyController controller;
    private MockHttpServletRequest request;
    private MockHttpServletResponse response;
    private Authentication authentication;

    @BeforeEach
    void setUp() {
        familyService = mock(FamilyService.class);
        auditLogService = mock(AuditLogService.class);
        authCookieService = mock(AuthCookieService.class);
        controller = new FamilyController(familyService, auditLogService, authCookieService);
        request = new MockHttpServletRequest();
        response = new MockHttpServletResponse();
        authentication = mock(Authentication.class);
        when(authentication.getName()).thenReturn("13800000000");
        when(authentication.isAuthenticated()).thenReturn(true);
    }

    @Test
    void coversFamilyEndpoints() {
        FamilyLoginRequest loginRequest = new FamilyLoginRequest();
        loginRequest.setPhone("13800000000");
        loginRequest.setPassword("secret");
        when(familyService.login(loginRequest)).thenReturn(new FamilyLoginResultDto(true, "token-family", null));

        assertEquals("token-family", controller.login(loginRequest, request, response).getData().getToken());
        assertEquals(200, controller.logout(authentication, request, response).getCode());
        assertEquals(200, controller.session(authentication).getCode());

        FamilyElderDto elderDto = new FamilyElderDto();
        elderDto.setId("elder-1");
        elderDto.setName("李奶奶");
        when(familyService.myElders("13800000000")).thenReturn(List.of(elderDto));
        assertEquals(1, controller.myElders(authentication, request).getData().size());

        FamilyElderDetailDto detailDto = new FamilyElderDetailDto();
        detailDto.setId("elder-1");
        detailDto.setName("李奶奶");
        when(familyService.elderDetail("elder-1", "13800000000")).thenReturn(detailDto);
        assertEquals("elder-1", controller.elderDetail("elder-1", authentication, request).getData().getId());

        UpdateContactsRequest contactsRequest = new UpdateContactsRequest();
        assertEquals(200, controller.updateContacts("elder-1", contactsRequest, authentication, request).getCode());

        FamilyMedicationDto medicationDto = new FamilyMedicationDto();
        medicationDto.setId("med-1");
        when(familyService.medications("elder-1", "13800000000")).thenReturn(List.of(medicationDto));
        assertEquals(1, controller.medications("elder-1", authentication, request).getData().size());

        FamilyMedicationRequest medicationRequest = new FamilyMedicationRequest();
        medicationRequest.setName("阿司匹林");
        when(familyService.addMedication("elder-1", medicationRequest, "13800000000")).thenReturn(medicationDto);
        assertEquals("med-1", controller.addMedication("elder-1", medicationRequest, authentication, request).getData().getId());
        assertEquals(200, controller.updateMedication("elder-1", "med-1", medicationRequest, authentication, request).getCode());
        assertEquals(200, controller.deleteMedication("elder-1", "med-1", authentication, request).getCode());

        FamilyQrCodeDto qrCodeDto = new FamilyQrCodeDto();
        qrCodeDto.setToken("qr-token");
        when(familyService.qrcode("elder-1", "13800000000")).thenReturn(qrCodeDto);
        when(familyService.requestDisableQrCode("elder-1", "13800000000")).thenReturn(qrCodeDto);
        assertEquals("qr-token", controller.qrcode("elder-1", authentication, request).getData().getToken());
        assertEquals("qr-token", controller.requestDisableQrcode("elder-1", authentication, request).getData().getToken());

        FamilyBindingAdminDto bindingDto = new FamilyBindingAdminDto();
        bindingDto.setId("binding-1");
        when(familyService.listBindings()).thenReturn(List.of(bindingDto));
        assertEquals(1, controller.listBindings().getData().size());
        assertEquals(200, controller.unbind("binding-1", request).getCode());
    }
}
