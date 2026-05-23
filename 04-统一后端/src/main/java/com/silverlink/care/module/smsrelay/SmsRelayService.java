package com.silverlink.care.module.smsrelay;

import com.silverlink.care.module.scan.ScanVerificationSessionDto;
import com.silverlink.care.module.scan.ScanVerificationStatusDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SmsRelayService {

    private final List<SmsRelayRecordDto> records = new ArrayList<>();
    private final ConcurrentHashMap<String, DeviceConfigDto> devices = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, String> deviceSecrets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, ScanVerificationSessionDto> sessions = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, ScanVerificationStatusDto> sessionStatuses = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    @Value("${silverlink.smsrelay.receiver-phone:13800001111}")
    private String receiverPhone;

    @Value("${silverlink.smsrelay.message-prefix:SL}")
    private String messagePrefix;

    @Value("${silverlink.smsrelay.session-ttl-seconds:300}")
    private long sessionTtlSeconds;

    public SmsRelayService() {
        DeviceConfigDto device1 = new DeviceConfigDto();
        device1.setDeviceId("relay-android-01");
        device1.setReceiverPhone("13800001111");
        device1.setServerUrl("https://api.silverlink.example.com");
        device1.setMessagePrefix("SL");
        device1.setStatus("在线");
        device1.setLastHeartbeat(Instant.now().toString());
        devices.put("relay-android-01", device1);
        deviceSecrets.put("relay-android-01", "secret-001");
    }

    public ScanVerificationSessionDto createScanVerificationSession(String elderId, String target) {
        String sessionId = "scan-session-" + System.currentTimeMillis();
        String code = String.format(Locale.ROOT, "%06d", random.nextInt(1_000_000));
        String body = messagePrefix + " " + code;
        String expiresAt = Instant.now().plusSeconds(sessionTtlSeconds).toString();

        ScanVerificationSessionDto session = new ScanVerificationSessionDto();
        session.setSessionId(sessionId);
        session.setReceiverPhone(receiverPhone);
        session.setReceiverPhoneMasked(maskPhone(receiverPhone));
        session.setMessageBody(body);
        session.setMessagePrefix(messagePrefix);
        session.setStatus("PENDING");
        session.setExpiresAt(expiresAt);
        sessions.put(sessionId, session);

        ScanVerificationStatusDto status = new ScanVerificationStatusDto();
        status.setSessionId(sessionId);
        status.setStatus("PENDING");
        status.setVerified(false);
        sessionStatuses.put(sessionId, status);
        return session;
    }

    public ScanVerificationStatusDto getScanVerificationStatus(String sessionId) {
        ScanVerificationSessionDto session = sessions.get(sessionId);
        ScanVerificationStatusDto status = sessionStatuses.get(sessionId);
        if (session == null || status == null) {
            throw new RuntimeException("Verification session not found");
        }
        if ("PENDING".equals(status.getStatus()) && session.getExpiresAt() != null && Instant.parse(session.getExpiresAt()).isBefore(Instant.now())) {
            status.setStatus("EXPIRED");
            status.setVerified(false);
        }
        return status;
    }

    public void handleInbound(InboundSmsRequest request, String deviceSecret) {
        String expectedSecret = deviceSecrets.get(request.getDeviceId());
        if (expectedSecret != null && !expectedSecret.equals(deviceSecret)) {
            throw new RuntimeException("Invalid device secret");
        }

        SmsRelayRecordDto record = new SmsRelayRecordDto();
        record.setId("rec-" + System.currentTimeMillis());
        record.setDeviceId(request.getDeviceId());
        record.setReceiverPhone(request.getReceiverPhone());
        record.setSenderPhone(request.getSenderPhone());
        record.setMessageBody(request.getMessageBody());
        record.setReceivedAt(request.getReceivedAt());
        record.setMessagePrefix(request.getMessagePrefix());
        record.setUploadedAt(Instant.now().toEpochMilli());
        record.setStatus("UPLOADED");
        records.add(record);

        String normalizedBody = normalize(request.getMessageBody());
        for (ScanVerificationSessionDto session : sessions.values()) {
            if (!"PENDING".equals(session.getStatus())) continue;
            if (session.getExpiresAt() != null && Instant.parse(session.getExpiresAt()).isBefore(Instant.now())) continue;
            if (!normalize(session.getMessageBody()).equals(normalizedBody)) continue;
            if (!normalizePhone(session.getReceiverPhone()).equals(normalizePhone(request.getReceiverPhone()))) continue;

            session.setStatus("VERIFIED");
            ScanVerificationStatusDto status = sessionStatuses.get(session.getSessionId());
            if (status == null) {
                status = new ScanVerificationStatusDto();
                status.setSessionId(session.getSessionId());
            }
            status.setStatus("VERIFIED");
            status.setVerified(true);
            status.setVerifiedAt(Instant.now().toString());
            status.setSenderPhoneMasked(maskPhone(request.getSenderPhone()));
            sessionStatuses.put(session.getSessionId(), status);
        }
    }

    public void handleHeartbeat(HeartbeatRequest request, String deviceSecret) {
        String expectedSecret = deviceSecrets.get(request.getDeviceId());
        if (expectedSecret != null && !expectedSecret.equals(deviceSecret)) {
            throw new RuntimeException("Invalid device secret");
        }

        DeviceConfigDto device = devices.get(request.getDeviceId());
        if (device != null) {
            device.setLastHeartbeat(Instant.now().toString());
            device.setStatus("在线");
        }
    }

    public DeviceConfigDto getDeviceConfig(String deviceId, String deviceSecret) {
        String expectedSecret = deviceSecrets.get(deviceId);
        if (expectedSecret != null && !expectedSecret.equals(deviceSecret)) {
            throw new RuntimeException("Invalid device secret");
        }
        return devices.get(deviceId);
    }

    public List<SmsRelayRecordDto> listRecords() {
        return new ArrayList<>(records);
    }

    public List<DeviceConfigDto> listDevices() {
        return new ArrayList<>(devices.values());
    }

    private String normalize(String text) {
        return text == null ? "" : text.trim().replaceAll("\\s+", " ");
    }

    private String normalizePhone(String phone) {
        return phone == null ? "" : phone.replaceAll("\\D", "");
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) return "****";
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }
}
