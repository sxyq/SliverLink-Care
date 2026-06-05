package com.silverlink.care.module.elder;

import com.silverlink.care.common.ApiResponse;
import com.silverlink.care.module.audit.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/elder")
public class ElderController {

    private final ElderService elderService;
    private final AuditLogService auditLogService;

    public ElderController(ElderService elderService, AuditLogService auditLogService) {
        this.elderService = elderService;
        this.auditLogService = auditLogService;
    }

    @PutMapping("/{id}/basic")
    public ApiResponse<Map<String, String>> updateBasic(@PathVariable String id, @RequestBody Map<String, Object> body, Authentication authentication, HttpServletRequest request) {
        elderService.saveBasic(id, body);
        auditLogService.record(authentication, request, id, "UPDATE_BASIC", "SUCCESS");
        return ApiResponse.ok(Map.of("recordId", "basic-" + System.currentTimeMillis()));
    }

    @PostMapping("/{id}/health-records")
    public ApiResponse<Map<String, String>> saveHealth(@PathVariable String id, @RequestBody Map<String, Object> body, Authentication authentication, HttpServletRequest request) {
        elderService.saveHealth(id, body);
        auditLogService.record(authentication, request, id, "SAVE_HEALTH_RECORD", "SUCCESS");
        return ApiResponse.ok(Map.of("recordId", "health-" + System.currentTimeMillis()));
    }

    @PostMapping("/{id}/medications")
    public ApiResponse<Map<String, String>> saveMedications(@PathVariable String id, @RequestBody java.util.List<Map<String, String>> body, Authentication authentication, HttpServletRequest request) {
        elderService.saveMedications(id, body);
        auditLogService.record(authentication, request, id, "SAVE_MEDICATIONS", "SUCCESS");
        return ApiResponse.ok(Map.of("recordId", "med-" + System.currentTimeMillis()));
    }

    @PostMapping("/{id}/scale-records")
    public ApiResponse<Map<String, String>> saveScales(@PathVariable String id, @RequestBody java.util.List<Map<String, Object>> body, Authentication authentication, HttpServletRequest request) {
        elderService.saveScales(id, body);
        auditLogService.record(authentication, request, id, "SAVE_SCALE_RECORDS", "SUCCESS");
        return ApiResponse.ok(Map.of("recordId", "scale-" + System.currentTimeMillis()));
    }

    @GetMapping("/{id}/scale-records")
    public ApiResponse<java.util.List<Map<String, Object>>> getScales(@PathVariable String id) {
        return ApiResponse.ok(elderService.getScales(id));
    }

    @GetMapping("/{id}/medications")
    public ApiResponse<java.util.List<Map<String, String>>> getMedications(@PathVariable String id) {
        return ApiResponse.ok(elderService.getMedications(id));
    }
}
