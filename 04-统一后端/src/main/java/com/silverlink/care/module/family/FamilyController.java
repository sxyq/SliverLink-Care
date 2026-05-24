package com.silverlink.care.module.family;

import com.silverlink.care.common.ApiResponse;
import com.silverlink.care.module.audit.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class FamilyController {

    private final FamilyService familyService;
    private final AuditLogService auditLogService;

    public FamilyController(FamilyService familyService, AuditLogService auditLogService) {
        this.familyService = familyService;
        this.auditLogService = auditLogService;
    }

    @PostMapping("/family/login")
    public ApiResponse<FamilyLoginResultDto> login(@RequestBody FamilyLoginRequest req, HttpServletRequest request) {
        FamilyLoginResultDto result = familyService.login(req);
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
    public ApiResponse<Void> logout(@RequestHeader(value = "Authorization", required = false) String auth, HttpServletRequest request) {
        auditLogService.record(familyService.resolveFamilyOperator(auth), "FAMILY", request, "系统", "LOGOUT", "SUCCESS", null, null);
        return ApiResponse.ok(null);
    }

    @GetMapping("/family/me/elders")
    public ApiResponse<List<FamilyElderDto>> myElders(@RequestHeader("Authorization") String auth, HttpServletRequest request) {
        List<FamilyElderDto> result = familyService.myElders(auth);
        auditLogService.record(familyService.resolveFamilyOperator(auth), "FAMILY", request, "我的老人列表", "VIEW_MY_ELDERS", "SUCCESS", null, null);
        return ApiResponse.ok(result);
    }

    @GetMapping("/family/elders/{elderId}")
    public ApiResponse<FamilyElderDetailDto> elderDetail(@PathVariable String elderId, @RequestHeader("Authorization") String auth, HttpServletRequest request) {
        FamilyElderDetailDto result = familyService.elderDetail(elderId, auth);
        auditLogService.record(familyService.resolveFamilyOperator(auth), "FAMILY", request, elderId, "VIEW_FAMILY_ELDER", "SUCCESS", null, null);
        return ApiResponse.ok(result);
    }

    @PutMapping("/family/elders/{elderId}/contacts")
    public ApiResponse<Void> updateContacts(@PathVariable String elderId, @RequestBody UpdateContactsRequest req, @RequestHeader("Authorization") String auth, HttpServletRequest request) {
        familyService.updateContacts(elderId, req, auth);
        auditLogService.record(familyService.resolveFamilyOperator(auth), "FAMILY", request, elderId, "UPDATE_CONTACTS", "SUCCESS", null, null);
        return ApiResponse.ok(null);
    }

    @GetMapping("/family/elders/{elderId}/medications")
    public ApiResponse<List<FamilyMedicationDto>> medications(@PathVariable String elderId, @RequestHeader("Authorization") String auth, HttpServletRequest request) {
        List<FamilyMedicationDto> result = familyService.medications(elderId, auth);
        auditLogService.record(familyService.resolveFamilyOperator(auth), "FAMILY", request, elderId, "VIEW_FAMILY_MEDICATIONS", "SUCCESS", null, null);
        return ApiResponse.ok(result);
    }

    @PostMapping("/family/elders/{elderId}/medications")
    public ApiResponse<FamilyMedicationDto> addMedication(@PathVariable String elderId, @RequestBody FamilyMedicationRequest req, @RequestHeader("Authorization") String auth, HttpServletRequest request) {
        FamilyMedicationDto result = familyService.addMedication(elderId, req, auth);
        auditLogService.record(familyService.resolveFamilyOperator(auth), "FAMILY", request, elderId, "ADD_FAMILY_MEDICATION", "SUCCESS", null, null);
        return ApiResponse.ok(result);
    }

    @PutMapping("/family/elders/{elderId}/medications/{medicationId}")
    public ApiResponse<Void> updateMedication(@PathVariable String elderId, @PathVariable String medicationId, @RequestBody FamilyMedicationRequest req, @RequestHeader("Authorization") String auth, HttpServletRequest request) {
        familyService.updateMedication(elderId, medicationId, req, auth);
        auditLogService.record(familyService.resolveFamilyOperator(auth), "FAMILY", request, elderId + ":" + medicationId, "UPDATE_FAMILY_MEDICATION", "SUCCESS", null, null);
        return ApiResponse.ok(null);
    }

    @DeleteMapping("/family/elders/{elderId}/medications/{medicationId}")
    public ApiResponse<Void> deleteMedication(@PathVariable String elderId, @PathVariable String medicationId, @RequestHeader("Authorization") String auth, HttpServletRequest request) {
        familyService.deleteMedication(elderId, medicationId, auth);
        auditLogService.record(familyService.resolveFamilyOperator(auth), "FAMILY", request, elderId + ":" + medicationId, "DELETE_FAMILY_MEDICATION", "SUCCESS", null, null);
        return ApiResponse.ok(null);
    }

    @GetMapping("/family/elders/{elderId}/qrcode")
    public ApiResponse<FamilyQrCodeDto> qrcode(@PathVariable String elderId, @RequestHeader("Authorization") String auth, HttpServletRequest request) {
        FamilyQrCodeDto result = familyService.qrcode(elderId, auth);
        auditLogService.record(familyService.resolveFamilyOperator(auth), "FAMILY", request, elderId, "VIEW_FAMILY_QRCODE", "SUCCESS", null, null);
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
