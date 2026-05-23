package com.silverlink.care.module.audit;

import com.silverlink.care.common.ApiResponse;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/audit-logs")
public class AuditLogController {

    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public ApiResponse<List<AuditLogEntity>> list(
            @RequestParam(required = false) String operator,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String result) {
        if (operator == null && action == null && result == null) {
            return ApiResponse.ok(auditLogService.listAll());
        }
        return ApiResponse.ok(auditLogService.filter(operator, action, result));
    }

    @PostMapping("/report")
    public ApiResponse<Map<String, Boolean>> report(@RequestBody Map<String, Object> body) {
        auditLogService.record(
                String.valueOf(body.getOrDefault("operator", "scan-client")),
                "SCAN_USER",
                "CLIENT",
                String.valueOf(body.getOrDefault("target", "")),
                String.valueOf(body.getOrDefault("action", "client-report")),
                "成功",
                "",
                String.valueOf(body.getOrDefault("requestId", ""))
        );
        return ApiResponse.ok(Map.of("ok", true));
    }
}
