package com.silverlink.care.module.review;

import com.silverlink.care.common.ApiResponse;
import com.silverlink.care.module.audit.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/review-requests")
public class AdminReviewRequestController {

    private final AdminReviewRequestService reviewRequestService;
    private final AuditLogService auditLogService;

    public AdminReviewRequestController(AdminReviewRequestService reviewRequestService, AuditLogService auditLogService) {
        this.reviewRequestService = reviewRequestService;
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public ApiResponse<List<Map<String, Object>>> list(@RequestParam(defaultValue = "PENDING") String status) {
        return ApiResponse.ok(reviewRequestService.list(status));
    }

    @PostMapping("/{id}/approve")
    public ApiResponse<Map<String, Object>> approve(@PathVariable String id, Authentication authentication, HttpServletRequest request) {
        String adminAccount = authentication == null ? "admin" : authentication.getName();
        Map<String, Object> result = reviewRequestService.approve(id, adminAccount);
        auditLogService.record(adminAccount, "SYSTEM_ADMIN", request, id, "APPROVE_QR_DISABLE_REQUEST", "SUCCESS", null, null);
        return ApiResponse.ok(result);
    }

    @PostMapping("/{id}/reject")
    public ApiResponse<Map<String, Object>> reject(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication authentication,
            HttpServletRequest request
    ) {
        String adminAccount = authentication == null ? "admin" : authentication.getName();
        Map<String, Object> result = reviewRequestService.reject(id, adminAccount, body == null ? "" : body.get("note"));
        auditLogService.record(adminAccount, "SYSTEM_ADMIN", request, id, "REJECT_QR_DISABLE_REQUEST", "SUCCESS", null, null);
        return ApiResponse.ok(result);
    }
}
