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
    public ApiResponse<FamilyLoginResultDto> login(@RequestBody FamilyLoginRequest req) {
        return ApiResponse.ok(familyService.login(req));
    }

    @PostMapping("/family/logout")
    public ApiResponse<Void> logout(HttpServletRequest request) {
        auditLogService.record("family-user", "FAMILY", request.getRemoteAddr(), "绯荤粺", "LOGOUT", "SUCCESS", null, null);
        return ApiResponse.ok(null);
    }

    @GetMapping("/family/me/elders")
    public ApiResponse<List<FamilyElderDto>> myElders(@RequestHeader("Authorization") String auth) {
        return ApiResponse.ok(familyService.myElders(auth));
    }

    @GetMapping("/family/elders/{elderId}")
    public ApiResponse<FamilyElderDetailDto> elderDetail(@PathVariable String elderId, @RequestHeader("Authorization") String auth) {
        return ApiResponse.ok(familyService.elderDetail(elderId, auth));
    }

    @PutMapping("/family/elders/{elderId}/contacts")
    public ApiResponse<Void> updateContacts(@PathVariable String elderId, @RequestBody UpdateContactsRequest req, @RequestHeader("Authorization") String auth, HttpServletRequest request) {
        familyService.updateContacts(elderId, req, auth);
        auditLogService.record("family-user", "FAMILY", request.getRemoteAddr(), elderId, "UPDATE_CONTACTS", "SUCCESS", null, null);
        return ApiResponse.ok(null);
    }

    @GetMapping("/family/elders/{elderId}/medications")
    public ApiResponse<List<FamilyMedicationDto>> medications(@PathVariable String elderId, @RequestHeader("Authorization") String auth) {
        return ApiResponse.ok(familyService.medications(elderId, auth));
    }

    @PostMapping("/family/elders/{elderId}/medications")
    public ApiResponse<FamilyMedicationDto> addMedication(@PathVariable String elderId, @RequestBody FamilyMedicationRequest req, @RequestHeader("Authorization") String auth, HttpServletRequest request) {
        FamilyMedicationDto result = familyService.addMedication(elderId, req, auth);
        auditLogService.record("family-user", "FAMILY", request.getRemoteAddr(), elderId, "ADD_FAMILY_MEDICATION", "SUCCESS", null, null);
        return ApiResponse.ok(result);
    }

    @PutMapping("/family/elders/{elderId}/medications/{medicationId}")
    public ApiResponse<Void> updateMedication(@PathVariable String elderId, @PathVariable String medicationId, @RequestBody FamilyMedicationRequest req, @RequestHeader("Authorization") String auth, HttpServletRequest request) {
        familyService.updateMedication(elderId, medicationId, req, auth);
        auditLogService.record("family-user", "FAMILY", request.getRemoteAddr(), elderId + ":" + medicationId, "UPDATE_FAMILY_MEDICATION", "SUCCESS", null, null);
        return ApiResponse.ok(null);
    }

    @DeleteMapping("/family/elders/{elderId}/medications/{medicationId}")
    public ApiResponse<Void> deleteMedication(@PathVariable String elderId, @PathVariable String medicationId, @RequestHeader("Authorization") String auth, HttpServletRequest request) {
        familyService.deleteMedication(elderId, medicationId, auth);
        auditLogService.record("family-user", "FAMILY", request.getRemoteAddr(), elderId + ":" + medicationId, "DELETE_FAMILY_MEDICATION", "SUCCESS", null, null);
        return ApiResponse.ok(null);
    }

    @GetMapping("/family/elders/{elderId}/qrcode")
    public ApiResponse<FamilyQrCodeDto> qrcode(@PathVariable String elderId, @RequestHeader("Authorization") String auth) {
        return ApiResponse.ok(familyService.qrcode(elderId, auth));
    }

    @GetMapping("/admin/family-bindings")
    public ApiResponse<List<FamilyBindingAdminDto>> listBindings() {
        return ApiResponse.ok(familyService.listBindings());
    }

    @PutMapping("/admin/family-bindings/{id}/disable")
    public ApiResponse<Void> unbind(@PathVariable String id, HttpServletRequest request) {
        familyService.unbind(id);
        auditLogService.record("admin", "SYSTEM_ADMIN", request.getRemoteAddr(), id, "UNBIND_FAMILY", "SUCCESS", null, null);
        return ApiResponse.ok(null);
    }
}
