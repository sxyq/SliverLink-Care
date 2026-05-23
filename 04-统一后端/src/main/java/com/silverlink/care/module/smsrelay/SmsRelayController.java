package com.silverlink.care.module.smsrelay;

import com.silverlink.care.common.ApiResponse;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
            @RequestHeader(value = "X-Relay-Device-Secret", required = false) String deviceSecret) {
        smsRelayService.handleInbound(request, deviceSecret);
        return ApiResponse.ok(null);
    }

    // 安卓端 - 心跳（需设备密钥认证）
    @PostMapping("/heartbeat")
    public ApiResponse<Void> heartbeat(
            @RequestBody HeartbeatRequest request,
            @RequestHeader(value = "X-Relay-Device-Secret", required = false) String deviceSecret) {
        smsRelayService.handleHeartbeat(request, deviceSecret);
        return ApiResponse.ok(null);
    }

    // 安卓端 - 获取设备配置（需设备密钥认证）
    @GetMapping("/devices/{deviceId}/config")
    public ApiResponse<DeviceConfigDto> getDeviceConfig(
            @PathVariable String deviceId,
            @RequestHeader(value = "X-Relay-Device-Secret", required = false) String deviceSecret) {
        return ApiResponse.ok(smsRelayService.getDeviceConfig(deviceId, deviceSecret));
    }

    // 管理后台 - 查看短信中转记录
    @GetMapping("/admin/records")
    public ApiResponse<List<SmsRelayRecordDto>> listRecords() {
        return ApiResponse.ok(smsRelayService.listRecords());
    }

    // 管理后台 - 查看设备列表
    @GetMapping("/admin/devices")
    public ApiResponse<List<DeviceConfigDto>> listDevices() {
        return ApiResponse.ok(smsRelayService.listDevices());
    }
}
