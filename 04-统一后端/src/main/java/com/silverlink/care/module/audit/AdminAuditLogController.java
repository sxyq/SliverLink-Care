package com.silverlink.care.module.audit;

import com.silverlink.care.common.ApiResponse;
import com.silverlink.care.common.CursorPage;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/audit-logs")
public class AdminAuditLogController {

    private final AuditLogService auditLogService;
    private final AuditLogExportService exportService;

    public AdminAuditLogController(AuditLogService auditLogService, AuditLogExportService exportService) {
        this.auditLogService = auditLogService;
        this.exportService = exportService;
    }

    @GetMapping("/page")
    public ApiResponse<CursorPage<AuditLogEntity>> page(
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String operator,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String result,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String verificationMethod,
            @RequestParam(required = false) String sourceIp,
            @RequestParam(required = false) String target
    ) {
        return ApiResponse.ok(auditLogService.page(
                new AuditLogQuery(from, to, operator, action, result, role, verificationMethod, sourceIp, target),
                cursor,
                limit
        ));
    }

    @GetMapping("/summary")
    public ApiResponse<Map<String, Object>> summary(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String operator,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String result,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String verificationMethod,
            @RequestParam(required = false) String sourceIp,
            @RequestParam(required = false) String target
    ) {
        return ApiResponse.ok(auditLogService.summary(
                new AuditLogQuery(from, to, operator, action, result, role, verificationMethod, sourceIp, target)
        ));
    }

    @PostMapping("/exports")
    public ApiResponse<Map<String, Object>> createExport(@RequestBody(required = false) AuditLogQuery query, Authentication authentication) {
        String operator = authentication == null ? "unknown" : authentication.getName();
        Map<String, Object> task = exportService.create(query, operator);
        auditLogService.record(authentication, "SERVER", "audit-export", "EXPORT_AUDIT_LOG", "SUCCESS");
        return ApiResponse.ok(task);
    }

    @GetMapping("/exports/{id}")
    public ApiResponse<Map<String, Object>> exportStatus(@org.springframework.web.bind.annotation.PathVariable String id, Authentication authentication) {
        return ApiResponse.ok(exportService.task(id, authentication == null ? "unknown" : authentication.getName()));
    }

    @GetMapping("/exports/{id}/download")
    public ResponseEntity<Resource> download(@org.springframework.web.bind.annotation.PathVariable String id, Authentication authentication) {
        Resource resource = exportService.download(id, authentication == null ? "unknown" : authentication.getName());
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv"))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename("audit-" + id + ".csv").build().toString())
                .body(resource);
    }
}
