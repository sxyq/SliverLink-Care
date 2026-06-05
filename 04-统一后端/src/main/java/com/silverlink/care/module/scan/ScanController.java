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
    private final WeChatAuthService weChatAuthService;

    public ScanController(ScanService scanService, AuditLogService auditLogService, WeChatAuthService weChatAuthService) {
        this.scanService = scanService;
        this.auditLogService = auditLogService;
        this.weChatAuthService = weChatAuthService;
    }

    @PostMapping("/resolve")
    public ApiResponse<Map<String, Object>> resolve(@RequestBody Map<String, String> body, HttpServletRequest request) throws Exception {
        Map<String, Object> info = scanService.resolve(body.get("token"));
        auditLogService.record("扫码用户", "SCAN", request, info.getOrDefault("archiveNo", "").toString(), "SCAN_QR", "SUCCESS", null, null);
        return ApiResponse.ok(info);
    }

    @PostMapping("/auth/wechat")
    public ApiResponse<Map<String, String>> authWechat(@RequestBody Map<String, String> body) {
        Map<String, String> map = new LinkedHashMap<>();
        map.put("openid", weChatAuthService.resolveOpenId(body.get("code")));
        return ApiResponse.ok(map);
    }

    @PostMapping("/verification/start")
    public ApiResponse<ScanVerificationSessionDto> startVerification(@RequestBody Map<String, String> body, HttpServletRequest request) {
        String elderId = body.getOrDefault("elderId", "");
        String target = body.getOrDefault("target", "health");
        ScanVerificationSessionDto session = scanService.startVerificationSession(elderId, target);
        auditLogService.record("扫码用户", "SCAN", request, elderId, "SMS_RELAY_START", "SUCCESS", null, session.getSessionId());
        return ApiResponse.ok(session);
    }

    @GetMapping("/verification/status")
    public ApiResponse<ScanVerificationStatusDto> verificationStatus(@RequestParam String sessionId, HttpServletRequest request) {
        ScanVerificationStatusDto status = scanService.getVerificationStatus(sessionId);
        auditLogService.record("扫码用户", "SCAN", request, sessionId, "SMS_RELAY_STATUS", status.isVerified() ? "SUCCESS" : "PENDING", null, sessionId);
        return ApiResponse.ok(status);
    }

    @PostMapping("/verification/identity")
    public ApiResponse<ScanVerificationStatusDto> verifyIdentity(@RequestBody Map<String, String> body, HttpServletRequest request) {
        String elderId = body.getOrDefault("elderId", "");
        String target = body.getOrDefault("target", "health");
        String visitorName = body.getOrDefault("name", "");
        String visitorPhone = body.getOrDefault("phone", "");
        String visitorIdCard = body.getOrDefault("idCard", "");

        try {
            ScanVerificationStatusDto status = scanService.verifyByIdentity(elderId, target, visitorName, visitorPhone, visitorIdCard);
            auditLogService.record(
                    visitorName.isBlank() ? "访客登记" : visitorName,
                    "VISITOR",
                    request,
                    elderId,
                    "IDENTITY_VERIFY",
                    "SUCCESS",
                    null,
                    status.getSessionId(),
                    "IDENTITY",
                    visitorName,
                    visitorPhone,
                    visitorIdCard
            );
            return ApiResponse.ok(status);
        } catch (RuntimeException ex) {
            auditLogService.record(
                    visitorName.isBlank() ? "访客登记" : visitorName,
                    "VISITOR",
                    request,
                    elderId,
                    "IDENTITY_VERIFY",
                    "FAIL",
                    ex.getMessage(),
                    null,
                    "IDENTITY",
                    visitorName,
                    visitorPhone,
                    visitorIdCard
            );
            throw ex;
        }
    }

    @GetMapping("/archive")
    public ApiResponse<Map<String, Object>> archive(@RequestParam String elderId, @RequestParam String sessionId, HttpServletRequest request) {
        var context = scanService.authorizeSession(sessionId, elderId, "health");
        Map<String, Object> archive = scanService.getArchiveData(elderId);
        auditLogService.record(
                context.getVisitorName().isBlank() ? "扫码用户" : context.getVisitorName(),
                "VISITOR",
                request,
                elderId,
                "VIEW_ARCHIVE",
                "SUCCESS",
                null,
                sessionId,
                context.getVerificationMethod(),
                context.getVisitorName(),
                context.getVisitorPhone(),
                context.getVisitorIdCard()
        );
        return ApiResponse.ok(archive);
    }

    @GetMapping("/basic-info")
    public ApiResponse<Map<String, Object>> basicInfo(@RequestParam String elderId, @RequestParam String sessionId, HttpServletRequest request) {
        var context = scanService.authorizeSession(sessionId, elderId, "health");
        Map<String, Object> basicInfo = scanService.getVerifiedBasicInfoData(elderId);
        auditLogService.record(
                context.getVisitorName().isBlank() ? "扫码用户" : context.getVisitorName(),
                "VISITOR",
                request,
                elderId,
                "VIEW_BASIC_INFO",
                "SUCCESS",
                null,
                sessionId,
                context.getVerificationMethod(),
                context.getVisitorName(),
                context.getVisitorPhone(),
                context.getVisitorIdCard()
        );
        return ApiResponse.ok(basicInfo);
    }

    @GetMapping("/medications")
    public ApiResponse<List<Map<String, String>>> medications(@RequestParam String elderId, @RequestParam String sessionId, HttpServletRequest request) {
        var context = scanService.authorizeSession(sessionId, elderId, "health");
        List<Map<String, String>> medications = scanService.getMedicationsData(elderId);
        auditLogService.record(
                context.getVisitorName().isBlank() ? "扫码用户" : context.getVisitorName(),
                "VISITOR",
                request,
                elderId,
                "VIEW_MEDICATIONS",
                "SUCCESS",
                null,
                sessionId,
                context.getVerificationMethod(),
                context.getVisitorName(),
                context.getVisitorPhone(),
                context.getVisitorIdCard()
        );
        return ApiResponse.ok(medications);
    }

    @GetMapping("/scales")
    public ApiResponse<List<Map<String, Object>>> scales(@RequestParam String elderId, @RequestParam String sessionId, HttpServletRequest request) {
        var context = scanService.authorizeSession(sessionId, elderId, "health");
        List<Map<String, Object>> scales = scanService.getScalesData(elderId);
        auditLogService.record(
                context.getVisitorName().isBlank() ? "扫码用户" : context.getVisitorName(),
                "VISITOR",
                request,
                elderId,
                "VIEW_SCALES",
                "SUCCESS",
                null,
                sessionId,
                context.getVerificationMethod(),
                context.getVisitorName(),
                context.getVisitorPhone(),
                context.getVisitorIdCard()
        );
        return ApiResponse.ok(scales);
    }

    @GetMapping("/scales/{scaleName}")
    public ApiResponse<Map<String, Object>> scaleDetail(
            @PathVariable String scaleName,
            @RequestParam String elderId,
            @RequestParam String sessionId,
            HttpServletRequest request
    ) {
        var context = scanService.authorizeSession(sessionId, elderId, "health");
        Map<String, Object> scale = scanService.getScaleDetailData(elderId, scaleName);
        auditLogService.record(
                context.getVisitorName().isBlank() ? "扫码用户" : context.getVisitorName(),
                "VISITOR",
                request,
                elderId,
                "VIEW_SCALE_DETAIL",
                "SUCCESS",
                null,
                sessionId,
                context.getVerificationMethod(),
                context.getVisitorName(),
                context.getVisitorPhone(),
                context.getVisitorIdCard()
        );
        return ApiResponse.ok(scale);
    }
}
