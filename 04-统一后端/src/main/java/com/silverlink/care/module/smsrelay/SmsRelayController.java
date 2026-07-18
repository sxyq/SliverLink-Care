package com.silverlink.care.module.smsrelay;

import com.silverlink.care.common.ApiResponse;
import com.silverlink.care.common.CursorPage;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sms-relay")
public class SmsRelayController {

    private final SmsRelayService smsRelayService;

    public SmsRelayController(SmsRelayService smsRelayService) {
        this.smsRelayService = smsRelayService;
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
