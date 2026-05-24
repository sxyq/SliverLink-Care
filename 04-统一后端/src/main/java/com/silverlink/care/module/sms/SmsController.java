package com.silverlink.care.module.sms;

import com.silverlink.care.common.ApiResponse;
import com.silverlink.care.module.audit.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/sms")
public class SmsController {

    private final SmsService smsService;
    private final AuditLogService auditLogService;

    public SmsController(SmsService smsService, AuditLogService auditLogService) {
        this.smsService = smsService;
        this.auditLogService = auditLogService;
    }

    @PostMapping("/send")
    public ApiResponse<Map<String, String>> send(@RequestBody Map<String, String> body, HttpServletRequest request) {
        String phone = body.get("phone");
        try {
            String scene = body.getOrDefault("scene", "SCAN");
            smsService.sendCode(phone, scene);
            Map<String, String> map = new LinkedHashMap<>();
            map.put("phone", maskPhone(phone));
            auditLogService.record("扫码用户", "SCAN", request, maskPhone(phone), "SMS_SEND", "SUCCESS", null, null);
            return ApiResponse.ok(map);
        } catch (RuntimeException e) {
            auditLogService.record("扫码用户", "SCAN", request, maskPhone(phone), "SMS_SEND", "FAIL", e.getMessage(), null);
            return ApiResponse.fail(429, e.getMessage());
        }
    }

    @PostMapping("/verify")
    public ApiResponse<Map<String, Boolean>> verify(@RequestBody Map<String, String> body, HttpServletRequest request) {
        boolean ok = smsService.verify(body.get("phone"), body.get("code"), body.getOrDefault("scene", "SCAN"));
        Map<String, Boolean> map = new LinkedHashMap<>();
        map.put("verified", ok);
        auditLogService.record("扫码用户", "SCAN", request, maskPhone(body.get("phone")), "SMS_VERIFY", ok ? "SUCCESS" : "FAIL", ok ? null : "验证码错误", null);
        return ApiResponse.ok(map);
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.length() != 11) return phone;
        return phone.substring(0, 3) + "****" + phone.substring(7);
    }
}
