package com.silverlink.care.module.scan;

import com.silverlink.care.common.ApiResponse;
import com.silverlink.care.module.audit.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/scan")
public class ScanController {

    private final ScanService scanService;
    private final AuditLogService auditLogService;

    public ScanController(ScanService scanService, AuditLogService auditLogService) {
        this.scanService = scanService;
        this.auditLogService = auditLogService;
    }

    @PostMapping("/resolve")
    public ApiResponse<Map<String, Object>> resolve(@RequestBody Map<String, String> body, HttpServletRequest request) throws Exception {
        Map<String, Object> info = scanService.resolve(body.get("token"));
        auditLogService.record("扫码用户", "SCAN", request.getRemoteAddr(), info.getOrDefault("archiveNo", "").toString(), "SCAN_QR", "SUCCESS", null, null);
        return ApiResponse.ok(info);
    }

    @PostMapping("/auth/wechat")
    public ApiResponse<Map<String, String>> authWechat(@RequestBody Map<String, String> body) {
        Map<String, String> map = new LinkedHashMap<>();
        map.put("openid", "demo-openid-" + System.currentTimeMillis());
        return ApiResponse.ok(map);
    }

    @PostMapping("/verification/start")
    public ApiResponse<ScanVerificationSessionDto> startVerification(@RequestBody Map<String, String> body, HttpServletRequest request) {
        String elderId = body.getOrDefault("elderId", "");
        String target = body.getOrDefault("target", "health");
        ScanVerificationSessionDto session = scanService.startVerificationSession(elderId, target);
        auditLogService.record("扫码用户", "SCAN", request.getRemoteAddr(), elderId, "SMS_RELAY_START", "SUCCESS", null, session.getSessionId());
        return ApiResponse.ok(session);
    }

    @GetMapping("/verification/status")
    public ApiResponse<ScanVerificationStatusDto> verificationStatus(@RequestParam String sessionId, HttpServletRequest request) {
        ScanVerificationStatusDto status = scanService.getVerificationStatus(sessionId);
        auditLogService.record("扫码用户", "SCAN", request.getRemoteAddr(), sessionId, "SMS_RELAY_STATUS", status.isVerified() ? "SUCCESS" : "PENDING", null, sessionId);
        return ApiResponse.ok(status);
    }

    @GetMapping("/archive")
    public ApiResponse<Map<String, Object>> archive(@RequestParam String elderId, HttpServletRequest request) {
        auditLogService.record("扫码用户", "SCAN", request.getRemoteAddr(), elderId, "VIEW_ARCHIVE", "SUCCESS", null, null);
        return ApiResponse.ok(scanService.getArchive(elderId));
    }

    @GetMapping("/medications")
    public ApiResponse<List<Map<String, String>>> medications(@RequestParam String elderId) {
        return ApiResponse.ok(scanService.getMedications(elderId));
    }

    @GetMapping("/scales")
    public ApiResponse<List<Map<String, Object>>> scales(@RequestParam String elderId) {
        return ApiResponse.ok(scanService.getScales(elderId));
    }
}
