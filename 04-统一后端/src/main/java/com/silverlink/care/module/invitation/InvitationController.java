package com.silverlink.care.module.invitation;

import com.silverlink.care.common.ApiResponse;
import com.silverlink.care.module.audit.AuditLogService;
import com.silverlink.care.security.AuthCookieService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class InvitationController {

    private final InvitationService invitationService;
    private final AuditLogService auditLogService;
    private final AuthCookieService authCookieService;

    public InvitationController(InvitationService invitationService, AuditLogService auditLogService, AuthCookieService authCookieService) {
        this.invitationService = invitationService;
        this.auditLogService = auditLogService;
        this.authCookieService = authCookieService;
    }

    @GetMapping("/invitations/{code}/preview")
    public ApiResponse<InvitationPreviewDto> preview(@PathVariable String code) {
        return ApiResponse.ok(invitationService.preview(code));
    }

    @PostMapping("/invitations/{code}/send-sms")
    public ApiResponse<Void> sendSms(@PathVariable String code, @RequestBody SendSmsRequest req, HttpServletRequest request) {
        invitationService.sendSms(code, req.getPhone());
        auditLogService.record("family-register", "INVITATION", request, code, "INVITATION_SEND_SMS", "SUCCESS", null, null);
        return ApiResponse.ok(null);
    }

    @PostMapping("/invitations/{code}/register")
    public ApiResponse<RegisterResultDto> register(
            @PathVariable String code,
            @RequestBody RegisterRequest req,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        RegisterResultDto result = invitationService.register(code, req);
        boolean ok = Boolean.TRUE.equals(result.getOk());
        if (ok && result.getToken() != null && !result.getToken().isBlank()) {
            authCookieService.issueFamilyCookie(request, response, result.getToken(), 86400000L);
        }
        auditLogService.record(req.getPhone(), "FAMILY", request, code, "INVITATION_REGISTER", ok ? "SUCCESS" : "FAIL", ok ? null : result.getMessage(), null);
        return ApiResponse.ok(result);
    }

    @GetMapping("/admin/invitations")
    public ApiResponse<List<InvitationAdminDto>> listForAdmin() {
        return ApiResponse.ok(invitationService.listForAdmin());
    }

    @PostMapping("/admin/invitations")
    public ApiResponse<InvitationAdminDto> create(@RequestBody CreateInvitationRequest req, HttpServletRequest request) {
        InvitationAdminDto result = invitationService.create(req);
        auditLogService.record("admin", "SYSTEM_ADMIN", request, result.getCode(), "CREATE_INVITATION", "SUCCESS", null, null);
        return ApiResponse.ok(result);
    }

    @PutMapping("/admin/invitations/{id}/disable")
    public ApiResponse<Void> disable(@PathVariable String id, HttpServletRequest request) {
        invitationService.disable(id);
        auditLogService.record("admin", "SYSTEM_ADMIN", request, id, "DISABLE_INVITATION", "SUCCESS", null, null);
        return ApiResponse.ok(null);
    }

    @DeleteMapping("/admin/invitations/{id}")
    public ApiResponse<Void> delete(@PathVariable String id, HttpServletRequest request) {
        invitationService.delete(id);
        auditLogService.record("admin", "SYSTEM_ADMIN", request, id, "DELETE_INVITATION", "SUCCESS", null, null);
        return ApiResponse.ok(null);
    }
}
