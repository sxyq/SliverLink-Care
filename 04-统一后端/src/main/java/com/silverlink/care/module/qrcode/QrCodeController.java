package com.silverlink.care.module.qrcode;

import com.silverlink.care.common.ApiResponse;
import com.silverlink.care.module.audit.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/qrcodes")
public class QrCodeController {

    private final QrCodeService qrCodeService;
    private final AuditLogService auditLogService;

    public QrCodeController(QrCodeService qrCodeService, AuditLogService auditLogService) {
        this.qrCodeService = qrCodeService;
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public ApiResponse<java.util.Collection<Map<String, Object>>> list() {
        java.util.List<Map<String, Object>> rows = new java.util.ArrayList<>();
        for (QrCodeEntity entity : qrCodeService.listAll()) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", entity.getId());
            map.put("qrId", entity.getQrId());
            map.put("elderId", entity.getElderId());
            map.put("archiveNo", entity.getArchiveNo());
            map.put("elderName", entity.getElderName());
            map.put("elderAge", entity.getElderAge());
            map.put("elderPhone", entity.getElderPhone());
            map.put("relayDeviceId", entity.getRelayDeviceId());
            map.put("relayReceiverPhone", entity.getRelayReceiverPhone());
            map.put("status", entity.getStatus());
            map.put("createdAt", entity.getCreatedAt());
            map.put("url", entity.getQrToken() == null || entity.getQrToken().isBlank() ? "" : qrCodeService.buildPublicUrl(entity.getQrToken()));
            rows.add(map);
        }
        return ApiResponse.ok(rows);
    }

    @PostMapping
    public ApiResponse<Map<String, String>> create(@RequestBody Map<String, String> body, HttpServletRequest request) throws Exception {
        QrCodeIssueResult issued = qrCodeService.generateWithToken(body.get("elderId"), body.get("archiveNo"));
        if (body.get("relayDeviceId") != null) {
            qrCodeService.bindRelayDevice(issued.getEntity().getId(), body.get("relayDeviceId"));
        }
        QrCodeEntity e = issued.getEntity();
        Map<String, String> map = toResponseMap(issued);
        map.put("securityNote", "二维码不包含明文身份和健康信息，仅包含加密 token。");
        auditLogService.record("admin", "SYSTEM_ADMIN", request, e.getQrId(), "GENERATE_QR", "SUCCESS", null, null);
        return ApiResponse.ok(map);
    }

    @PutMapping("/{id}/disable")
    public ApiResponse<Void> disable(@PathVariable String id, HttpServletRequest request) {
        qrCodeService.disable(id);
        auditLogService.record("admin", "SYSTEM_ADMIN", request, id, "DISABLE_QR", "SUCCESS", null, null);
        return ApiResponse.ok();
    }

    @PostMapping("/{id}/regenerate")
    public ApiResponse<Map<String, String>> regenerate(@PathVariable String id, HttpServletRequest request) throws Exception {
        QrCodeIssueResult issued = qrCodeService.regenerateWithToken(id);
        if (issued == null) return ApiResponse.fail(404, "not found");
        auditLogService.record("admin", "SYSTEM_ADMIN", request, id, "REGENERATE_QR", "SUCCESS", null, null);
        return ApiResponse.ok(toResponseMap(issued));
    }

    @PutMapping("/{id}/relay-device")
    public ApiResponse<Map<String, Object>> bindRelayDevice(@PathVariable String id, @RequestBody Map<String, String> body, HttpServletRequest request) {
        QrCodeEntity entity = qrCodeService.bindRelayDevice(id, body.get("relayDeviceId"));
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", entity.getId());
        map.put("relayDeviceId", entity.getRelayDeviceId());
        map.put("relayReceiverPhone", entity.getRelayReceiverPhone());
        auditLogService.record("admin", "SYSTEM_ADMIN", request, id, "BIND_QR_RELAY_DEVICE", "SUCCESS", null, entity.getRelayDeviceId());
        return ApiResponse.ok(map);
    }

    private Map<String, String> toResponseMap(QrCodeIssueResult issued) {
        QrCodeEntity e = issued.getEntity();
        Map<String, String> map = new LinkedHashMap<>();
        map.put("id", e.getId());
        map.put("qrId", e.getQrId());
        map.put("elderId", e.getElderId());
        map.put("archiveNo", e.getArchiveNo());
        map.put("status", e.getStatus());
        map.put("token", issued.getToken());
        map.put("url", issued.getUrl());
        return map;
    }
}
