package com.silverlink.care.module.smsrelay;

import com.silverlink.care.common.BizException;
import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import com.silverlink.care.module.scan.ScanVerificationSessionDto;
import com.silverlink.care.module.scan.ScanVerificationStatusDto;
import com.silverlink.care.module.sms.SmsService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SmsRelayService {

    private final SecureRandom random = new SecureRandom();
    private final JdbcTemplate jdbc;
    private final SmsService smsService;
    private final SilverLinkDataService data;

    @Value("${silverlink.smsrelay.receiver-phone:13800001111}")
    private String receiverPhone;

    @Value("${silverlink.smsrelay.message-prefix:SL}")
    private String messagePrefix;

    @Value("${silverlink.smsrelay.session-ttl-seconds:300}")
    private long sessionTtlSeconds;

    @Value("${silverlink.smsrelay.server-url:https://api.silverlink.example.com}")
    private String serverUrl;

    @Value("${silverlink.smsrelay.default-device-id:relay-android-01}")
    private String defaultDeviceId;

    @Value("${silverlink.smsrelay.default-device-secret:secret-001}")
    private String defaultDeviceSecret;

    @Value("${silverlink.smsrelay.signature-window-seconds:300}")
    private long signatureWindowSeconds;

    @Value("${silverlink.smsrelay.authorization-window-seconds:600}")
    private long authorizationWindowSeconds;

    private final ConcurrentHashMap<String, Long> relayNonceStore = new ConcurrentHashMap<>();

    public SmsRelayService(JdbcTemplate jdbc, SmsService smsService, SilverLinkDataService data) {
        this.jdbc = jdbc;
        this.smsService = smsService;
        this.data = data;
    }

    @PostConstruct
    public void ensureDefaultDevice() {
        Integer count = jdbc.queryForObject(
                "select count(*) from sms_relay_device where device_id=?",
                Integer.class,
                defaultDeviceId
        );
        if (count != null && count > 0) {
            return;
        }
        jdbc.update("""
                insert into sms_relay_device (device_id, receiver_phone, server_url, message_prefix, device_secret, status)
                values (?,?,?,?,?,?)
                """,
                defaultDeviceId,
                receiverPhone,
                serverUrl,
                messagePrefix,
                defaultDeviceSecret,
                "离线"
        );
    }

    public ScanVerificationSessionDto createScanVerificationSession(String elderId, String target, String relayDeviceId) {
        DeviceConfigDto device = relayDeviceId == null || relayDeviceId.isBlank()
                ? resolvePreferredDevice()
                : resolveDeviceById(relayDeviceId);
        String sessionId = "scan-session-" + System.currentTimeMillis();
        String bodyToken = randomAlphaNumeric(10);
        String body = device.getMessagePrefix() + " " + bodyToken;
        String expiresAt = Instant.now().plusSeconds(sessionTtlSeconds).toString();

        jdbc.update("""
                insert into scan_verification_session
                (session_id, elder_id, target, relay_device_id, receiver_phone, message_body, message_prefix, status, expires_at, verified)
                values (?,?,?,?,?,?,?,?,?,?)
                """,
                sessionId,
                elderId,
                target,
                device.getDeviceId(),
                device.getReceiverPhone(),
                body,
                device.getMessagePrefix(),
                "PENDING",
                expiresAt,
                false
        );
        return mapSession(jdbc.queryForMap("select * from scan_verification_session where session_id=?", sessionId));
    }

    public ScanVerificationStatusDto getScanVerificationStatus(String sessionId) {
        List<Map<String, Object>> rows = jdbc.queryForList("select * from scan_verification_session where session_id=?", sessionId);
        if (rows.isEmpty()) {
            throw new BizException(404, "Verification session not found");
        }
        Map<String, Object> row = rows.get(0);
        if ("PENDING".equals(str(row.get("status"))) && Instant.parse(str(row.get("expires_at"))).isBefore(Instant.now())) {
            jdbc.update(
                    "update scan_verification_session set status='EXPIRED', verified=0 where session_id=? and status='PENDING'",
                    sessionId
            );
            row.put("status", "EXPIRED");
            row.put("verified", false);
        }
        return mapStatus(row);
    }

    public ScanVerificationSessionDto createDirectSmsVerificationSession(String elderId, String target, String receiverPhone) {
        if (receiverPhone == null || receiverPhone.isBlank()) {
            throw new BizException(400, "Missing receiver phone");
        }

        String sessionId = "scan-session-" + System.currentTimeMillis();
        String scene = "SCAN:" + sessionId;
        String expiresAt = Instant.now().plusSeconds(sessionTtlSeconds).toString();

        smsService.sendCode(receiverPhone, scene);
        jdbc.update("""
                insert into scan_verification_session
                (session_id, elder_id, target, receiver_phone, message_body, message_prefix, status, expires_at, verified)
                values (?,?,?,?,?,?,?,?,?)
                """,
                sessionId,
                elderId,
                target,
                receiverPhone,
                "",
                "DIRECT_SMS",
                "PENDING",
                expiresAt,
                false
        );
        return mapSession(jdbc.queryForMap("select * from scan_verification_session where session_id=?", sessionId));
    }

    public ScanVerificationStatusDto verifyDirectSmsVerificationSession(String sessionId, String receiverPhone, String code) {
        if (sessionId == null || sessionId.isBlank()) {
            throw new BizException(401, "Missing verification session");
        }
        if (receiverPhone == null || receiverPhone.isBlank()) {
            throw new BizException(400, "Missing receiver phone");
        }

        List<Map<String, Object>> rows = jdbc.queryForList("select * from scan_verification_session where session_id=?", sessionId);
        if (rows.isEmpty()) {
            throw new BizException(404, "Verification session not found");
        }

        Map<String, Object> row = rows.get(0);
        if ("PENDING".equals(str(row.get("status"))) && Instant.parse(str(row.get("expires_at"))).isBefore(Instant.now())) {
            jdbc.update(
                    "update scan_verification_session set status='EXPIRED', verified=0 where session_id=? and status='PENDING'",
                    sessionId
            );
            row.put("status", "EXPIRED");
            row.put("verified", false);
            return mapStatus(row);
        }

        if (!normalizePhone(str(row.get("receiver_phone"))).equals(normalizePhone(receiverPhone))) {
            throw new BizException(403, "Verification phone mismatch");
        }

        boolean ok = smsService.verify(receiverPhone, code, "SCAN:" + sessionId);
        if (ok) {
            jdbc.update("""
                    update scan_verification_session
                    set status='VERIFIED', verified=1, verified_at=?, sender_phone_masked=?
                    where session_id=?
                    """,
                    Instant.now().toString(),
                    maskPhone(receiverPhone),
                    sessionId
            );
        }

        return getScanVerificationStatus(sessionId);
    }

    public ScanVerificationStatusDto createIdentityVerificationSession(
            String elderId,
            String target,
            String visitorName,
            String visitorPhone,
            String visitorIdCard
    ) {
        String normalizedName = normalizeVisitorName(visitorName);
        String normalizedPhone = normalizeVisitorPhone(visitorPhone);
        String normalizedIdCard = normalizeIdCard(visitorIdCard);
        String sessionId = "scan-session-" + System.currentTimeMillis();
        String now = Instant.now().toString();

        jdbc.update("""
                insert into scan_verification_session
                (session_id, elder_id, target, verification_method, receiver_phone, message_body, message_prefix, status, expires_at,
                 verified, verified_at, sender_phone_masked, visitor_name_enc, visitor_phone_enc, visitor_id_card_enc)
                values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                sessionId,
                elderId,
                target,
                "IDENTITY",
                normalizedPhone,
                "",
                "IDENTITY",
                "VERIFIED",
                Instant.now().plusSeconds(sessionTtlSeconds).toString(),
                true,
                now,
                maskPhone(normalizedPhone),
                data.enc(normalizedName),
                data.enc(normalizedPhone),
                data.enc(normalizedIdCard)
        );

        return getScanVerificationStatus(sessionId);
    }

    public void handleInbound(InboundSmsRequest request, String deviceSecret) {
        DeviceConfigDto device = requireDevice(request.getDeviceId(), deviceSecret);
        if (request.getReceiverPhone() == null || request.getReceiverPhone().isBlank()) {
            throw new BizException(400, "Missing receiver phone");
        }
        if (request.getSenderPhone() == null || request.getSenderPhone().isBlank()) {
            throw new BizException(400, "Missing sender phone");
        }
        if (request.getMessageBody() == null || request.getMessageBody().isBlank()) {
            throw new BizException(400, "Missing message body");
        }

        String normalizedReceiverPhone = normalizePhone(request.getReceiverPhone());
        if (!normalizedReceiverPhone.equals(normalizePhone(device.getReceiverPhone()))) {
            throw new BizException(400, "Receiver phone does not match device configuration");
        }

        String recordId = "rec-" + System.currentTimeMillis();
        long uploadedAt = Instant.now().toEpochMilli();
        jdbc.update("""
                insert into sms_relay_record
                (id, device_id, receiver_phone, sender_phone, message_body, received_at, message_prefix, uploaded_at, status)
                values (?,?,?,?,?,?,?,?,?)
                """,
                recordId,
                request.getDeviceId(),
                request.getReceiverPhone(),
                request.getSenderPhone(),
                request.getMessageBody(),
                request.getReceivedAt(),
                request.getMessagePrefix(),
                uploadedAt,
                "UPLOADED"
        );

        String normalizedBody = normalize(request.getMessageBody());
        String verifiedAt = Instant.now().toString();
        for (Map<String, Object> row : jdbc.queryForList("select * from scan_verification_session where status='PENDING'")) {
            if (Instant.parse(str(row.get("expires_at"))).isBefore(Instant.now())) {
                jdbc.update(
                        "update scan_verification_session set status='EXPIRED', verified=0 where session_id=? and status='PENDING'",
                        str(row.get("session_id"))
                );
                continue;
            }
            if (!normalize(str(row.get("message_body"))).equals(normalizedBody)) {
                continue;
            }
            if (!normalizePhone(str(row.get("receiver_phone"))).equals(normalizedReceiverPhone)) {
                continue;
            }
            jdbc.update("""
                    update scan_verification_session
                    set status='VERIFIED', verified=1, verified_at=?, sender_phone_masked=?
                    where session_id=?
                    """,
                    verifiedAt,
                    maskPhone(request.getSenderPhone()),
                    str(row.get("session_id"))
            );
        }
    }

    public void handleHeartbeat(HeartbeatRequest request, String deviceSecret) {
        requireDevice(request.getDeviceId(), deviceSecret);
        jdbc.update(
                "update sms_relay_device set last_heartbeat=?, status=? where device_id=?",
                Instant.now().toString(),
                "在线",
                request.getDeviceId()
        );
    }

    public DeviceConfigDto getDeviceConfig(String deviceId, String deviceSecret) {
        return requireDevice(deviceId, deviceSecret);
    }

    public void validateDeviceRequestSignature(
            String deviceId,
            String deviceSecret,
            String requestUri,
            String method,
            RelaySignatureHeaders headers,
            String payload
    ) {
        requireDevice(deviceId, deviceSecret);
        if (headers.timestamp() == null || headers.nonce() == null || headers.signature() == null) {
            throw new BizException(401, "Missing relay signature headers");
        }

        long ts;
        try {
            ts = Long.parseLong(headers.timestamp());
        } catch (NumberFormatException ex) {
            throw new BizException(400, "Invalid relay timestamp");
        }
        long now = System.currentTimeMillis() / 1000;
        if (Math.abs(now - ts) > signatureWindowSeconds) {
            throw new BizException(401, "Relay timestamp expired");
        }

        evictExpiredRelayNonces(now);
        String nonceKey = deviceId + ":" + headers.nonce();
        if (relayNonceStore.putIfAbsent(nonceKey, ts) != null) {
            throw new BizException(401, "Relay nonce already used");
        }

        String canonical = method.toUpperCase(Locale.ROOT) + "\n"
                + requestUri + "\n"
                + headers.timestamp() + "\n"
                + headers.nonce() + "\n"
                + (payload == null ? "" : payload);
        String expected = hmacSha256Hex(canonical, deviceSecret);
        if (!MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                headers.signature().getBytes(StandardCharsets.UTF_8)
        )) {
            throw new BizException(401, "Invalid relay signature");
        }
    }

    public List<SmsRelayRecordDto> listRecords() {
        List<Map<String, Object>> rows = jdbc.queryForList("select * from sms_relay_record order by uploaded_at desc");
        List<SmsRelayRecordDto> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            result.add(mapRecord(row));
        }
        return result;
    }

    public List<DeviceConfigDto> listDevices() {
        List<Map<String, Object>> rows = jdbc.queryForList("select * from sms_relay_device order by updated_at desc");
        List<DeviceConfigDto> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            result.add(mapDevice(row));
        }
        return result;
    }

    public DeviceConfigDto updateDevice(String deviceId, DeviceConfigDto body) {
        if (deviceId == null || deviceId.isBlank()) {
            throw new BizException(400, "Missing device id");
        }

        String nextReceiverPhone = normalizePhone(body.getReceiverPhone());
        if (nextReceiverPhone.isBlank()) {
            throw new BizException(400, "接收手机号不能为空");
        }

        String nextServerUrl = str(body.getServerUrl()).trim();
        if (nextServerUrl.isBlank()) {
            throw new BizException(400, "服务器地址不能为空");
        }

        String nextMessagePrefix = str(body.getMessagePrefix()).trim();
        if (nextMessagePrefix.isBlank()) {
            throw new BizException(400, "前缀规则不能为空");
        }

        int updated = jdbc.update("""
                update sms_relay_device
                set receiver_phone=?, server_url=?, message_prefix=?
                where device_id=?
                """,
                nextReceiverPhone,
                nextServerUrl,
                nextMessagePrefix,
                deviceId
        );

        if (updated == 0) {
            throw new BizException(404, "设备不存在");
        }

        return mapDevice(jdbc.queryForMap("select * from sms_relay_device where device_id=?", deviceId));
    }

    public List<ScanVerificationAdminDto> listVerificationSessions() {
        expirePendingSessions();
        List<Map<String, Object>> rows = jdbc.queryForList("select * from scan_verification_session order by created_at desc");
        List<ScanVerificationAdminDto> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            result.add(mapAdminSession(row));
        }
        return result;
    }

    public VerifiedSessionContext authorizeVerifiedSession(String sessionId, String elderId, String target) {
        if (sessionId == null || sessionId.isBlank()) {
            throw new BizException(401, "Missing verification session");
        }
        List<Map<String, Object>> rows = jdbc.queryForList("select * from scan_verification_session where session_id=?", sessionId);
        if (rows.isEmpty()) {
            throw new BizException(404, "Verification session not found");
        }
        Map<String, Object> row = rows.get(0);
        if ("PENDING".equals(str(row.get("status"))) && Instant.parse(str(row.get("expires_at"))).isBefore(Instant.now())) {
            jdbc.update(
                    "update scan_verification_session set status='EXPIRED', verified=0 where session_id=? and status='PENDING'",
                    sessionId
            );
            throw new BizException(401, "Verification session expired");
        }
        if (!bool(row.get("verified")) || !"VERIFIED".equals(str(row.get("status")))) {
            throw new BizException(401, "Verification session not authorized");
        }
        if (elderId != null && !elderId.isBlank() && !elderId.equals(str(row.get("elder_id")))) {
            throw new BizException(403, "Verification session elder mismatch");
        }
        if (target != null && !target.isBlank()) {
            String sessionTarget = str(row.get("target"));
            if (!sessionTarget.isBlank() && !target.equals(sessionTarget)) {
                throw new BizException(403, "Verification session target mismatch");
            }
        }
        String verifiedAt = str(row.get("verified_at"));
        if (verifiedAt.isBlank()) {
            throw new BizException(401, "Verification session not authorized");
        }
        if (Instant.parse(verifiedAt).plusSeconds(authorizationWindowSeconds).isBefore(Instant.now())) {
            throw new BizException(401, "Verification authorization expired");
        }
        return mapVerifiedSessionContext(row);
    }

    private DeviceConfigDto requireDevice(String deviceId, String deviceSecret) {
        if (deviceId == null || deviceId.isBlank()) {
            throw new BizException(401, "Missing device id");
        }
        if (deviceSecret == null || deviceSecret.isBlank()) {
            throw new BizException(401, "Missing device secret");
        }
        List<Map<String, Object>> rows = jdbc.queryForList("select * from sms_relay_device where device_id=?", deviceId);
        if (rows.isEmpty()) {
            throw new BizException(401, "Unknown device");
        }
        Map<String, Object> row = rows.get(0);
        if (!deviceSecret.equals(str(row.get("device_secret")))) {
            throw new BizException(401, "Invalid device secret");
        }
        return mapDevice(row);
    }

    private void expirePendingSessions() {
        for (Map<String, Object> row : jdbc.queryForList("select session_id, expires_at from scan_verification_session where status='PENDING'")) {
            if (Instant.parse(str(row.get("expires_at"))).isBefore(Instant.now())) {
                jdbc.update(
                        "update scan_verification_session set status='EXPIRED', verified=0 where session_id=? and status='PENDING'",
                        str(row.get("session_id"))
                );
            }
        }
    }

    private ScanVerificationSessionDto mapSession(Map<String, Object> row) {
        ScanVerificationSessionDto dto = new ScanVerificationSessionDto();
        dto.setSessionId(str(row.get("session_id")));
        dto.setElderId(str(row.get("elder_id")));
        dto.setReceiverPhone(str(row.get("receiver_phone")));
        dto.setReceiverPhoneMasked(maskPhone(str(row.get("receiver_phone"))));
        dto.setMessageBody(str(row.get("message_body")));
        dto.setMessagePrefix(str(row.get("message_prefix")));
        dto.setStatus(str(row.get("status")));
        dto.setExpiresAt(str(row.get("expires_at")));
        return dto;
    }

    private ScanVerificationStatusDto mapStatus(Map<String, Object> row) {
        ScanVerificationStatusDto dto = new ScanVerificationStatusDto();
        dto.setSessionId(str(row.get("session_id")));
        dto.setElderId(str(row.get("elder_id")));
        dto.setStatus(str(row.get("status")));
        dto.setVerified(bool(row.get("verified")));
        dto.setVerifiedAt(str(row.get("verified_at")));
        dto.setSenderPhoneMasked(str(row.get("sender_phone_masked")));
        return dto;
    }

    private SmsRelayRecordDto mapRecord(Map<String, Object> row) {
        SmsRelayRecordDto dto = new SmsRelayRecordDto();
        dto.setId(str(row.get("id")));
        dto.setDeviceId(str(row.get("device_id")));
        dto.setReceiverPhone(str(row.get("receiver_phone")));
        dto.setSenderPhone(str(row.get("sender_phone")));
        dto.setMessageBody(str(row.get("message_body")));
        dto.setReceivedAt(longValue(row.get("received_at")));
        dto.setMessagePrefix(str(row.get("message_prefix")));
        dto.setUploadedAt(longValue(row.get("uploaded_at")));
        dto.setStatus(str(row.get("status")));
        return dto;
    }

    private DeviceConfigDto mapDevice(Map<String, Object> row) {
        DeviceConfigDto dto = new DeviceConfigDto();
        dto.setDeviceId(str(row.get("device_id")));
        dto.setReceiverPhone(str(row.get("receiver_phone")));
        dto.setServerUrl(str(row.get("server_url")));
        dto.setMessagePrefix(str(row.get("message_prefix")));
        dto.setStatus(str(row.get("status")));
        dto.setServiceStatus("在线".equals(str(row.get("status"))) ? "后台服务运行中" : "等待设备连接");
        dto.setLastHeartbeat(str(row.get("last_heartbeat")));
        return dto;
    }

    private DeviceConfigDto resolvePreferredDevice() {
        List<Map<String, Object>> preferred = jdbc.queryForList("""
                select * from sms_relay_device
                order by
                    case
                        when device_id = ? then 0
                        when status = '在线' then 1
                        else 2
                    end,
                    updated_at desc
                limit 1
                """, defaultDeviceId);
        if (preferred.isEmpty()) {
            throw new BizException(503, "未找到已登记的短信中转设备");
        }
        return mapDevice(preferred.get(0));
    }

    private DeviceConfigDto resolveDeviceById(String deviceId) {
        List<Map<String, Object>> rows = jdbc.queryForList("select * from sms_relay_device where device_id=?", deviceId);
        if (rows.isEmpty()) {
            throw new BizException(404, "未找到指定短信中转设备");
        }
        return mapDevice(rows.get(0));
    }

    private String randomAlphaNumeric(int length) {
        final String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder builder = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            builder.append(alphabet.charAt(random.nextInt(alphabet.length())));
        }
        return builder.toString();
    }

    private ScanVerificationAdminDto mapAdminSession(Map<String, Object> row) {
        ScanVerificationAdminDto dto = new ScanVerificationAdminDto();
        dto.setSessionId(str(row.get("session_id")));
        dto.setElderId(str(row.get("elder_id")));
        dto.setTarget(str(row.get("target")));
        dto.setRelayDeviceId(str(row.get("relay_device_id")));
        dto.setReceiverPhone(str(row.get("receiver_phone")));
        dto.setMessageBody(str(row.get("message_body")));
        dto.setStatus(str(row.get("status")));
        dto.setExpiresAt(str(row.get("expires_at")));
        dto.setVerified(bool(row.get("verified")));
        dto.setVerifiedAt(str(row.get("verified_at")));
        dto.setSenderPhoneMasked(str(row.get("sender_phone_masked")));
        dto.setCreatedAt(str(row.get("created_at")));
        return dto;
    }

    private VerifiedSessionContext mapVerifiedSessionContext(Map<String, Object> row) {
        VerifiedSessionContext context = new VerifiedSessionContext();
        context.setSessionId(str(row.get("session_id")));
        context.setElderId(str(row.get("elder_id")));
        context.setTarget(str(row.get("target")));
        context.setVerificationMethod(str(row.get("verification_method")));
        context.setVisitorName(data.dec(row.get("visitor_name_enc")));
        context.setVisitorPhone(data.dec(row.get("visitor_phone_enc")));
        context.setVisitorIdCard(data.dec(row.get("visitor_id_card_enc")));
        context.setSenderPhoneMasked(str(row.get("sender_phone_masked")));
        return context;
    }

    private String normalizeVisitorName(String visitorName) {
        String normalized = visitorName == null ? "" : visitorName.trim();
        if (normalized.isBlank()) {
            throw new BizException(400, "请输入姓名");
        }
        return normalized;
    }

    private String normalizeVisitorPhone(String visitorPhone) {
        String normalized = normalizePhone(visitorPhone);
        if (!normalized.matches("1\\d{10}")) {
            throw new BizException(400, "手机号必须为 11 位数字");
        }
        return normalized;
    }

    private String normalizeIdCard(String visitorIdCard) {
        String normalized = visitorIdCard == null ? "" : visitorIdCard.trim().toUpperCase(Locale.ROOT);
        if (!normalized.matches("(\\d{15}|\\d{17}[0-9X])")) {
            throw new BizException(400, "身份证号格式不正确");
        }
        if (normalized.length() == 18 && !isValidMainlandIdCard(normalized)) {
            throw new BizException(400, "身份证号校验失败");
        }
        return normalized;
    }

    private boolean isValidMainlandIdCard(String idCard) {
        int[] weights = {7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2};
        char[] checksums = {'1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'};
        int total = 0;
        for (int i = 0; i < 17; i++) {
            total += (idCard.charAt(i) - '0') * weights[i];
        }
        return checksums[total % 11] == idCard.charAt(17);
    }

    private String str(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private boolean bool(Object value) {
        if (value instanceof Boolean boolValue) {
            return boolValue;
        }
        if (value instanceof Number number) {
            return number.intValue() != 0;
        }
        return Boolean.parseBoolean(str(value));
    }

    private long longValue(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        return value == null ? 0L : Long.parseLong(String.valueOf(value));
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

    private void evictExpiredRelayNonces(long nowSeconds) {
        for (Map.Entry<String, Long> entry : relayNonceStore.entrySet()) {
            if (Math.abs(nowSeconds - entry.getValue()) > signatureWindowSeconds) {
                relayNonceStore.remove(entry.getKey(), entry.getValue());
            }
        }
    }

    private String hmacSha256Hex(String value, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(digest.length * 2);
            for (byte item : digest) {
                builder.append(String.format("%02x", item));
            }
            return builder.toString();
        } catch (Exception ex) {
            throw new BizException(500, "Failed to validate relay signature");
        }
    }

    public static class VerifiedSessionContext {
        private String sessionId;
        private String elderId;
        private String target;
        private String verificationMethod;
        private String visitorName;
        private String visitorPhone;
        private String visitorIdCard;
        private String senderPhoneMasked;

        public String getSessionId() {
            return sessionId;
        }

        public void setSessionId(String sessionId) {
            this.sessionId = sessionId;
        }

        public String getElderId() {
            return elderId;
        }

        public void setElderId(String elderId) {
            this.elderId = elderId;
        }

        public String getTarget() {
            return target;
        }

        public void setTarget(String target) {
            this.target = target;
        }

        public String getVerificationMethod() {
            return verificationMethod;
        }

        public void setVerificationMethod(String verificationMethod) {
            this.verificationMethod = verificationMethod;
        }

        public String getVisitorName() {
            return visitorName;
        }

        public void setVisitorName(String visitorName) {
            this.visitorName = visitorName;
        }

        public String getVisitorPhone() {
            return visitorPhone;
        }

        public void setVisitorPhone(String visitorPhone) {
            this.visitorPhone = visitorPhone;
        }

        public String getVisitorIdCard() {
            return visitorIdCard;
        }

        public void setVisitorIdCard(String visitorIdCard) {
            this.visitorIdCard = visitorIdCard;
        }

        public String getSenderPhoneMasked() {
            return senderPhoneMasked;
        }

        public void setSenderPhoneMasked(String senderPhoneMasked) {
            this.senderPhoneMasked = senderPhoneMasked;
        }
    }
}
