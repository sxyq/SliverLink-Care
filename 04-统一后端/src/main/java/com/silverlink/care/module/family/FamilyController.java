package com.silverlink.care.module.family;

import com.silverlink.care.common.ApiResponse;
import com.silverlink.care.module.audit.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import com.silverlink.care.security.AuthCookieService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class FamilyController {

    private final FamilyService familyService;
    private final AuditLogService auditLogService;
    private final AuthCookieService authCookieService;

    public FamilyController(FamilyService familyService, AuditLogService auditLogService, AuthCookieService authCookieService) {
        this.familyService = familyService;
        this.auditLogService = auditLogService;
        this.authCookieService = authCookieService;
    }

    @PostMapping("/family/login")
    public ApiResponse<FamilyLoginResultDto> login(
            @RequestBody FamilyLoginRequest req,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        FamilyLoginResultDto result = familyService.login(req);
        if (Boolean.TRUE.equals(result.getOk()) && result.getToken() != null && !result.getToken().isBlank()) {
            authCookieService.issueFamilyCookie(request, response, result.getToken(), 86400000L);
        }
        auditLogService.record(
                req.getPhone(),
                "FAMILY",
                request,
                "系统",
                "LOGIN",
                Boolean.TRUE.equals(result.getOk()) ? "SUCCESS" : "FAIL",
                Boolean.TRUE.equals(result.getOk()) ? null : result.getMessage(),
                null
        );
        return ApiResponse.ok(result);
    }

    @PostMapping("/family/logout")
    public ApiResponse<Void> logout(Authentication authentication, HttpServletRequest request, HttpServletResponse response) {
        authCookieService.clearFamilyCookie(request, response);
        auditLogService.record(authentication == null ? "family-user" : authentication.getName(), "FAMILY", request, "系统", "LOGOUT", "SUCCESS", null, null);
        return ApiResponse.ok(null);
    }

    @GetMapping("/family/session")
    public ApiResponse<FamilyLoginResultDto> session(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ApiResponse.fail(401, "未登录");
        }
        return ApiResponse.ok(new FamilyLoginResultDto(true, null, "登录成功"));
    }

    @GetMapping("/family/me/elders")
    public ApiResponse<List<FamilyElderDto>> myElders(Authentication authentication, HttpServletRequest request) {
        List<FamilyElderDto> result = familyService.myElders(authentication.getName());
        auditLogService.record(authentication.getName(), "FAMILY", request, "我的老人列表", "VIEW_MY_ELDERS", "SUCCESS", null, null);
        return ApiResponse.ok(result);
    }

    @GetMapping("/family/elders/{elderId}")
    public ApiResponse<FamilyElderDetailDto> elderDetail(@PathVariable String elderId, Authentication authentication, HttpServletRequest request) {
        FamilyElderDetailDto result = familyService.elderDetail(elderId, authentication.getName());
        auditLogService.record(authentication.getName(), "FAMILY", request, elderId, "VIEW_FAMILY_ELDER", "SUCCESS", null, null);
        return ApiResponse.ok(result);
    }

    @PutMapping("/family/elders/{elderId}/contacts")
    public ApiResponse<Void> updateContacts(@PathVariable String elderId, @RequestBody UpdateContactsRequest req, Authentication authentication, HttpServletRequest request) {
        familyService.updateContacts(elderId, req, authentication.getName());
        auditLogService.record(authentication.getName(), "FAMILY", request, elderId, "UPDATE_CONTACTS", "SUCCESS", null, null);
        return ApiResponse.ok(null);
    }

    @GetMapping("/family/elders/{elderId}/medications")
    public ApiResponse<List<FamilyMedicationDto>> medications(@PathVariable String elderId, Authentication authentication, HttpServletRequest request) {
        List<FamilyMedicationDto> result = familyService.medications(elderId, authentication.getName());
        auditLogService.record(authentication.getName(), "FAMILY", request, elderId, "VIEW_FAMILY_MEDICATIONS", "SUCCESS", null, null);
        return ApiResponse.ok(result);
    }

    @PostMapping("/family/elders/{elderId}/medications")
    public ApiResponse<FamilyMedicationDto> addMedication(@PathVariable String elderId, @RequestBody FamilyMedicationRequest req, Authentication authentication, HttpServletRequest request) {
        FamilyMedicationDto result = familyService.addMedication(elderId, req, authentication.getName());
        auditLogService.record(authentication.getName(), "FAMILY", request, elderId, "ADD_FAMILY_MEDICATION", "SUCCESS", null, null);
        return ApiResponse.ok(result);
    }

    @PutMapping("/family/elders/{elderId}/medications/{medicationId}")
    public ApiResponse<Void> updateMedication(@PathVariable String elderId, @PathVariable String medicationId, @RequestBody FamilyMedicationRequest req, Authentication authentication, HttpServletRequest request) {
        familyService.updateMedication(elderId, medicationId, req, authentication.getName());
        auditLogService.record(authentication.getName(), "FAMILY", request, elderId + ":" + medicationId, "UPDATE_FAMILY_MEDICATION", "SUCCESS", null, null);
        return ApiResponse.ok(null);
    }

    @DeleteMapping("/family/elders/{elderId}/medications/{medicationId}")
    public ApiResponse<Void> deleteMedication(@PathVariable String elderId, @PathVariable String medicationId, Authentication authentication, HttpServletRequest request) {
        familyService.deleteMedication(elderId, medicationId, authentication.getName());
        auditLogService.record(authentication.getName(), "FAMILY", request, elderId + ":" + medicationId, "DELETE_FAMILY_MEDICATION", "SUCCESS", null, null);
        return ApiResponse.ok(null);
    }

    @GetMapping("/family/elders/{elderId}/qrcode")
    public ApiResponse<FamilyQrCodeDto> qrcode(@PathVariable String elderId, Authentication authentication, HttpServletRequest request) {
        FamilyQrCodeDto result = familyService.qrcode(elderId, authentication.getName());
        auditLogService.record(authentication.getName(), "FAMILY", request, elderId, "VIEW_FAMILY_QRCODE", "SUCCESS", null, null);
        return ApiResponse.ok(result);
    }

    @PostMapping("/family/elders/{elderId}/qrcode/disable-request")
    public ApiResponse<FamilyQrCodeDto> requestDisableQrcode(@PathVariable String elderId, Authentication authentication, HttpServletRequest request) {
        FamilyQrCodeDto result = familyService.requestDisableQrCode(elderId, authentication.getName());
        auditLogService.record(authentication.getName(), "FAMILY", request, elderId, "REQUEST_DISABLE_QR", "SUCCESS", null, null);
        return ApiResponse.ok(result);
    }

    @GetMapping("/admin/family-bindings")
    public ApiResponse<List<FamilyBindingAdminDto>> listBindings() {
        return ApiResponse.ok(familyService.listBindings());
    }

    @PutMapping("/admin/family-bindings/{id}/disable")
    public ApiResponse<Void> unbind(@PathVariable String id, HttpServletRequest request) {
        familyService.unbind(id);
        auditLogService.record("admin", "SYSTEM_ADMIN", request, id, "UNBIND_FAMILY", "SUCCESS", null, null);
        return ApiResponse.ok(null);
    }
}
