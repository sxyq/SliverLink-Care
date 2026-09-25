package com.silverlink.care.module.smsrelay;

import com.silverlink.care.common.ApiResponse;
import com.silverlink.care.common.CursorPage;
import com.silverlink.care.module.audit.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sms-relay")
public class SmsRelayController {

    private final SmsRelayService smsRelayService;
    private final AuditLogService auditLogService;

    public SmsRelayController(SmsRelayService smsRelayService, AuditLogService auditLogService) {
        this.smsRelayService = smsRelayService;
        this.auditLogService = auditLogService;
    }

    // 安卓端 - 申请接入。申请凭据仅用于读取本申请的审批结果。
    @PostMapping("/enrollment-requests")
    public ApiResponse<SmsRelayEnrollmentStatusDto> createEnrollmentRequest(
            @RequestBody SmsRelayEnrollmentRequest request,
            @RequestHeader(value = "X-Relay-Enrollment-Token", required = false) String requestToken) {
        return ApiResponse.ok(smsRelayService.createEnrollmentRequest(request, requestToken));
    }

    @GetMapping("/enrollment-requests/{requestId}")
    public ApiResponse<SmsRelayEnrollmentStatusDto> getEnrollmentStatus(
            @PathVariable String requestId,
            @RequestHeader(value = "X-Relay-Enrollment-Token", required = false) String requestToken) {
        return ApiResponse.ok(smsRelayService.getEnrollmentStatus(requestId, requestToken));
    }

    // 管理后台 - 查看设备接入申请
    @GetMapping("/admin/enrollment-requests")
    public ApiResponse<List<SmsRelayEnrollmentAdminDto>> listEnrollmentRequests() {
        return ApiResponse.ok(smsRelayService.listEnrollmentRequests());
    }

    @PostMapping("/admin/enrollment-requests/{requestId}/approve")
    public ApiResponse<SmsRelayEnrollmentAdminDto> approveEnrollmentRequest(
            @PathVariable String requestId,
            HttpServletRequest request) {
        SmsRelayEnrollmentAdminDto result = smsRelayService.approveEnrollmentRequest(requestId);
        auditLogService.record(SecurityContextHolder.getContext().getAuthentication(), request, requestId,
                "APPROVE_SMS_RELAY_ENROLLMENT", "SUCCESS");
        return ApiResponse.ok(result);
    }

    @PostMapping("/admin/enrollment-requests/{requestId}/reject")
    public ApiResponse<SmsRelayEnrollmentAdminDto> rejectEnrollmentRequest(
            @PathVariable String requestId,
            @RequestBody SmsRelayEnrollmentDecisionRequest body,
            HttpServletRequest request) {
        SmsRelayEnrollmentAdminDto result = smsRelayService.rejectEnrollmentRequest(requestId, body == null ? null : body.getReason());
        auditLogService.record(SecurityContextHolder.getContext().getAuthentication(), request, requestId,
                "REJECT_SMS_RELAY_ENROLLMENT", "SUCCESS");
        return ApiResponse.ok(result);
    }

    // 安卓端 - 接收短信回传（需设备密钥认证）
    @PostMapping("/inbound")
    public ApiResponse<Void> inbound(
            @RequestBody InboundSmsRequest request,
            @RequestHeader(value = "X-Relay-Device-Secret", required = false) String deviceSecret,
            @RequestHeader(value = "X-Relay-Timestamp", required = false) String relayTimestamp,
            @RequestHeader(value = "X-Relay-Nonce", required = false) String relayNonce,
            @RequestHeader(value = "X-Relay-Signature", required = false) String relaySignature) {
        smsRelayService.validateDeviceRequestSignature(
                request.getDeviceId(),
                deviceSecret,
                "/api/sms-relay/inbound",
                "POST",
                new RelaySignatureHeaders(relayTimestamp, relayNonce, relaySignature),
                signedPayload(request)
        );
        smsRelayService.handleInbound(request, deviceSecret);
        return ApiResponse.ok(null);
    }

    private String signedPayload(InboundSmsRequest request) {
        String payload = String.join("\n",
                String.valueOf(request.getDeviceId()),
                String.valueOf(request.getReceiverPhone()),
                String.valueOf(request.getSenderPhone()),
                String.valueOf(request.getMessageBody()),
                String.valueOf(request.getReceivedAt()),
                String.valueOf(request.getMessagePrefix())
        );
        if (request.getClientRecordId() != null && !request.getClientRecordId().isBlank()) {
            return payload + "\n" + request.getClientRecordId();
        }
        return payload;
    }

    // 安卓端 - 心跳（需设备密钥认证）
    @PostMapping("/heartbeat")
    public ApiResponse<Void> heartbeat(
            @RequestBody HeartbeatRequest request,
            @RequestHeader(value = "X-Relay-Device-Secret", required = false) String deviceSecret,
            @RequestHeader(value = "X-Relay-Timestamp", required = false) String relayTimestamp,
            @RequestHeader(value = "X-Relay-Nonce", required = false) String relayNonce,
            @RequestHeader(value = "X-Relay-Signature", required = false) String relaySignature) {
        smsRelayService.validateDeviceRequestSignature(
                request.getDeviceId(),
                deviceSecret,
                "/api/sms-relay/heartbeat",
                "POST",
                new RelaySignatureHeaders(relayTimestamp, relayNonce, relaySignature),
                request.getDeviceId() + "\n" + request.getTimestamp()
        );
        smsRelayService.handleHeartbeat(request, deviceSecret);
        return ApiResponse.ok(null);
    }

    // 安卓端 - 获取设备配置（需设备密钥认证）
    @GetMapping("/devices/{deviceId}/config")
    public ApiResponse<DeviceConfigDto> getDeviceConfig(
            @PathVariable String deviceId,
            @RequestHeader(value = "X-Relay-Device-Secret", required = false) String deviceSecret,
            @RequestHeader(value = "X-Relay-Timestamp", required = false) String relayTimestamp,
            @RequestHeader(value = "X-Relay-Nonce", required = false) String relayNonce,
            @RequestHeader(value = "X-Relay-Signature", required = false) String relaySignature) {
        smsRelayService.validateDeviceRequestSignature(
                deviceId,
                deviceSecret,
                "/api/sms-relay/devices/" + deviceId + "/config",
                "GET",
                new RelaySignatureHeaders(relayTimestamp, relayNonce, relaySignature),
                deviceId
        );
        return ApiResponse.ok(smsRelayService.getDeviceConfig(deviceId, deviceSecret));
    }

    // 管理后台 - 查看短信中转记录
    @GetMapping("/admin/records")
    public ApiResponse<List<SmsRelayRecordDto>> listRecords() {
        // Compatibility endpoint: bounded while older management clients roll over to /page.
        return ApiResponse.ok(smsRelayService.listRecords());
    }

    @GetMapping("/admin/records/page")
    public ApiResponse<CursorPage<SmsRelayRecordDto>> pageRecords(
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String deviceId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String receiverPhone,
            @RequestParam(required = false) String senderPhone,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to
    ) {
        return ApiResponse.ok(smsRelayService.pageRecords(cursor, limit, deviceId, status, receiverPhone, senderPhone, from, to));
    }

    // 管理后台 - 查看设备列表
    @GetMapping("/admin/devices")
    public ApiResponse<List<DeviceConfigDto>> listDevices() {
        return ApiResponse.ok(smsRelayService.listDevices());
    }

    // 管理后台 - 修改设备配置
    @PutMapping("/admin/devices/{deviceId}")
    public ApiResponse<DeviceConfigDto> updateDevice(@PathVariable String deviceId, @RequestBody DeviceConfigDto body) {
        return ApiResponse.ok(smsRelayService.updateDevice(deviceId, body));
    }

    @PostMapping("/admin/devices/{deviceId}/revoke")
    public ApiResponse<DeviceConfigDto> revokeDevice(@PathVariable String deviceId, HttpServletRequest request) {
        DeviceConfigDto result = smsRelayService.revokeDevice(deviceId);
        auditLogService.record(SecurityContextHolder.getContext().getAuthentication(), request, deviceId,
                "REVOKE_SMS_RELAY_DEVICE", "SUCCESS");
        return ApiResponse.ok(result);
    }

    // 管理后台 - 查看验证会话
    @GetMapping("/admin/sessions")
    public ApiResponse<List<ScanVerificationAdminDto>> listSessions() {
        // Compatibility endpoint: bounded while older management clients roll over to /page.
        return ApiResponse.ok(smsRelayService.listVerificationSessions());
    }

    @GetMapping("/admin/sessions/page")
    public ApiResponse<CursorPage<ScanVerificationAdminDto>> pageSessions(
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String relayDeviceId,
            @RequestParam(required = false) String elderId,
            @RequestParam(required = false) String receiverPhone,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to
    ) {
        return ApiResponse.ok(smsRelayService.pageVerificationSessions(cursor, limit, status, relayDeviceId, elderId, receiverPhone, from, to));
    }

    @GetMapping("/admin/summary")
    public ApiResponse<Map<String, Object>> summary() {
        return ApiResponse.ok(smsRelayService.adminSummary());
    }
}
