package com.silverlink.care.module.smsrelay;

import com.silverlink.care.common.BizException;
import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import com.silverlink.care.module.scan.ScanVerificationSessionDto;
import com.silverlink.care.module.scan.ScanVerificationStatusDto;
import com.silverlink.care.module.sms.SmsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SmsRelayServiceTest {

    private FakeJdbcTemplate jdbc;
    private SmsRelayService service;

    @BeforeEach
    void setUp() {
        jdbc = new FakeJdbcTemplate();
        service = new SmsRelayService(jdbc, null, new StubDataService());
        ReflectionTestUtils.setField(service, "signatureWindowSeconds", 300L);
        ReflectionTestUtils.setField(service, "authorizationWindowSeconds", 600L);
    }

    @Test
    void updateDeviceValidatesRequiredFieldsAndMapsUpdatedRow() {
        DeviceConfigDto body = new DeviceConfigDto();
        body.setReceiverPhone(" 138-0000-0000 ");
        body.setServerUrl(" https://api.example.com ");
        body.setMessagePrefix(" SL ");
        jdbc.devices.put("device-1", new HashMap<>(deviceRow("device-1", "secret-1")));

        DeviceConfigDto result = service.updateDevice("device-1", body);

        assertEquals("device-1", result.getDeviceId());
        assertEquals("13800000000", result.getReceiverPhone());
        assertEquals("等待设备连接", result.getServiceStatus());

        assertThrows(BizException.class, () -> service.updateDevice("", body));
        body.setReceiverPhone("");
        assertThrows(BizException.class, () -> service.updateDevice("device-1", body));
    }

    @Test
    void createScanVerificationSessionUsesRequestedOrPreferredDevice() {
        ReflectionTestUtils.setField(service, "defaultDeviceId", "device-default");
        jdbc.devices.put("device-default", new HashMap<>(deviceRow("device-default", "secret-default")));
        jdbc.devices.put("device-2", new HashMap<>(deviceRow("device-2", "secret-2")));

        ScanVerificationSessionDto requested = service.createScanVerificationSession("elder-1", "health", "device-2");
        ScanVerificationSessionDto preferred = service.createScanVerificationSession("elder-2", "archive", null);

        assertEquals("13800000000", requested.getReceiverPhone());
        assertTrue(requested.getMessageBody().startsWith("SL "));
        assertTrue(requested.getSessionId().startsWith("scan-session-"));
        assertEquals("13800000000", preferred.getReceiverPhone());
        assertTrue(preferred.getMessageBody().startsWith("SL "));
        assertMessage("未找到指定短信中转设备", () -> service.createScanVerificationSession("elder-3", "health", "missing"));
    }

    @Test
    void handleHeartbeatAndGetDeviceConfigUpdateStatusAndHeartbeat() {
        jdbc.devices.put("device-1", new HashMap<>(deviceRow("device-1", "secret-1")));
        HeartbeatRequest request = new HeartbeatRequest();
        request.setDeviceId("device-1");
        request.setTimestamp(System.currentTimeMillis());

        service.handleHeartbeat(request, "secret-1");
        DeviceConfigDto config = service.getDeviceConfig("device-1", "secret-1");

        assertEquals("device-1", config.getDeviceId());
        assertEquals("在线", config.getStatus());
        assertEquals("后台服务运行中", config.getServiceStatus());
        assertTrue(config.getLastHeartbeat() != null && !config.getLastHeartbeat().isBlank());
    }

    @Test
    void listRecordsListDevicesAndVerificationSessionsMapRows() {
        jdbc.devices.put("device-1", new HashMap<>(deviceRow("device-1", "secret-1")));
        Map<String, Object> onlineDevice = new HashMap<>(deviceRow("device-2", "secret-2"));
        onlineDevice.put("status", "在线");
        onlineDevice.put("last_heartbeat", Instant.now().toString());
        jdbc.devices.put("device-2", onlineDevice);

        Map<String, Object> record = new HashMap<>();
        record.put("id", "rec-1");
        record.put("device_id", "device-1");
        record.put("receiver_phone", "13800000000");
        record.put("sender_phone", "13900000000");
        record.put("message_body", "SL 123456");
        record.put("received_at", "1710000000000");
        record.put("message_prefix", "SL");
        record.put("uploaded_at", 1710000000100L);
        record.put("status", "UPLOADED");
        jdbc.records.add(record);

        jdbc.sessions.put("verified-admin", new HashMap<>(Map.ofEntries(
                Map.entry("session_id", "verified-admin"),
                Map.entry("elder_id", "elder-1"),
                Map.entry("target", "health"),
                Map.entry("relay_device_id", "device-1"),
                Map.entry("receiver_phone", "13800000000"),
                Map.entry("message_body", "SL 123456"),
                Map.entry("status", "VERIFIED"),
                Map.entry("expires_at", Instant.now().plusSeconds(120).toString()),
                Map.entry("verified", true),
                Map.entry("verified_at", Instant.now().toString()),
                Map.entry("sender_phone_masked", "139****0000"),
                Map.entry("created_at", "2026-05-29T00:00:00Z")
        )));
        jdbc.sessions.put("expired-admin", new HashMap<>(Map.ofEntries(
                Map.entry("session_id", "expired-admin"),
                Map.entry("elder_id", "elder-2"),
                Map.entry("target", "archive"),
                Map.entry("relay_device_id", "device-2"),
                Map.entry("receiver_phone", "13800000001"),
                Map.entry("message_body", "SL 654321"),
                Map.entry("status", "PENDING"),
                Map.entry("expires_at", Instant.now().minusSeconds(5).toString()),
                Map.entry("verified", false),
                Map.entry("verified_at", ""),
                Map.entry("sender_phone_masked", ""),
                Map.entry("created_at", "2026-05-28T23:59:59Z")
        )));

        service.expirePendingSessionsScheduled();

        List<SmsRelayRecordDto> records = service.listRecords();
        List<DeviceConfigDto> devices = service.listDevices();
        List<ScanVerificationAdminDto> sessions = service.listVerificationSessions();

        assertEquals(1, records.size());
        assertEquals(1710000000000L, records.get(0).getReceivedAt());
        assertEquals(1710000000100L, records.get(0).getUploadedAt());
        assertEquals(2, devices.size());
        assertEquals("后台服务运行中", devices.get(1).getServiceStatus());
        assertEquals(2, sessions.size());
        assertTrue(sessions.stream().anyMatch(dto -> "expired-admin".equals(dto.getSessionId()) && "EXPIRED".equals(dto.getStatus())));
        assertTrue(sessions.stream().anyMatch(dto -> "verified-admin".equals(dto.getSessionId()) && dto.isVerified()));
    }

    @Test
    void authorizeVerifiedSessionRejectsInvalidStatesAndReturnsContext() {
        assertThrows(BizException.class, () -> service.authorizeVerifiedSession("missing", "elder-1", "health"));

        jdbc.sessions.put("pending", new HashMap<>(sessionRow("pending", "elder-1", "health", "PENDING", false, Instant.now().plusSeconds(60))));
        assertThrows(BizException.class, () -> service.authorizeVerifiedSession("pending", "elder-1", "health"));

        jdbc.sessions.put("verified", new HashMap<>(sessionRow("verified", "elder-1", "health", "VERIFIED", true, Instant.now().plusSeconds(60))));

        SmsRelayService.VerifiedSessionContext context = service.authorizeVerifiedSession("verified", "elder-1", "health");

        assertEquals("verified", context.getSessionId());
        assertEquals("访客", context.getVisitorName());
        assertEquals("13800000000", context.getVisitorPhone());
        assertThrows(BizException.class, () -> service.authorizeVerifiedSession("verified", "elder-2", "health"));
        assertThrows(BizException.class, () -> service.authorizeVerifiedSession("verified", "elder-1", "medication"));
    }

    @Test
    void authorizeVerifiedSessionUsesCacheWhenEnabled() {
        ReflectionTestUtils.setField(service, "authorizedSessionCacheTtlMs", 60_000L);
        jdbc.sessions.put("verified", new HashMap<>(sessionRow("verified", "elder-1", "health", "VERIFIED", true, Instant.now().plusSeconds(60))));

        SmsRelayService.VerifiedSessionContext first = service.authorizeVerifiedSession("verified", "elder-1", "health");
        SmsRelayService.VerifiedSessionContext second = service.authorizeVerifiedSession("verified", "elder-1", "health");

        assertEquals("verified", first.getSessionId());
        assertEquals("verified", second.getSessionId());
        assertEquals(1, jdbc.sessionLookupCount);
    }

    @Test
    void validateDeviceRequestSignatureAcceptsValidSignatureAndRejectsFailures() throws Exception {
        jdbc.devices.put("device-1", new HashMap<>(deviceRow("device-1", "secret-1")));
        String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
        String payload = "device-1\n13800000000";
        String signature = hmac("POST\n/api/sms-relay/inbound\n" + timestamp + "\nnonce-1\n" + payload, "secret-1");

        service.validateDeviceRequestSignature(
                "device-1",
                "secret-1",
                "/api/sms-relay/inbound",
                "post",
                new RelaySignatureHeaders(timestamp, "nonce-1", signature),
                payload
        );

        BizException replay = assertThrows(BizException.class, () -> service.validateDeviceRequestSignature(
                "device-1",
                "secret-1",
                "/api/sms-relay/inbound",
                "POST",
                new RelaySignatureHeaders(timestamp, "nonce-1", signature),
                payload
        ));
        assertEquals(401, replay.getCode());

        assertThrows(BizException.class, () -> service.validateDeviceRequestSignature(
                "device-1", "secret-1", "/api/sms-relay/inbound", "POST",
                new RelaySignatureHeaders(null, "nonce-2", "sig"),
                payload
        ));
        assertThrows(BizException.class, () -> service.validateDeviceRequestSignature(
                "device-1", "secret-1", "/api/sms-relay/inbound", "POST",
                new RelaySignatureHeaders("bad", "nonce-3", "sig"),
                payload
        ));
        assertThrows(BizException.class, () -> service.validateDeviceRequestSignature(
                "device-1", "secret-1", "/api/sms-relay/inbound", "POST",
                new RelaySignatureHeaders(timestamp, "nonce-4", "bad"),
                payload
        ));
    }

    @Test
    void createIdentityVerificationSessionValidatesVisitorFields() {
        assertMessage("请输入姓名", () -> service.createIdentityVerificationSession("elder-1", "health", "", "13800000000", "500102200212180836"));
        assertMessage("手机号必须为 11 位数字", () -> service.createIdentityVerificationSession("elder-1", "health", "访客", "1234", "500102200212180836"));
        assertMessage("身份证号格式不正确", () -> service.createIdentityVerificationSession("elder-1", "health", "访客", "13800000000", "1234"));
        assertMessage("身份证号校验失败", () -> service.createIdentityVerificationSession("elder-1", "health", "访客", "13800000000", "500102200212180837"));
    }

    @Test
    void getScanVerificationStatusMarksExpiredPendingSession() {
        jdbc.sessions.put("expired", new HashMap<>(sessionRow("expired", "elder-1", "health", "PENDING", false, Instant.now().minusSeconds(5))));

        ScanVerificationStatusDto result = service.getScanVerificationStatus("expired");

        assertEquals("EXPIRED", result.getStatus());
        assertEquals(false, result.isVerified());
    }

    @Test
    void directSmsVerificationCreatesSessionAndUpdatesStatusWhenCodeMatches() {
        SmsService smsService = mock(SmsService.class);
        when(smsService.verify("13800000000", "123456", "SCAN:session-direct")).thenReturn(true);

        SmsRelayService directService = new SmsRelayService(jdbc, smsService, new StubDataService());
        ReflectionTestUtils.setField(directService, "sessionTtlSeconds", 300L);

        ScanVerificationSessionDto created = directService.createDirectSmsVerificationSession("elder-1", "health", "13800000000");
        String createdSessionId = created.getSessionId();
        when(smsService.verify("13800000000", "123456", "SCAN:" + createdSessionId)).thenReturn(true);

        ScanVerificationStatusDto verified = directService.verifyDirectSmsVerificationSession(createdSessionId, "13800000000", "123456");

        assertEquals("VERIFIED", verified.getStatus());
        assertTrue(verified.isVerified());
        verify(smsService).sendCode("13800000000", "SCAN:" + createdSessionId);
        verify(smsService).verify("13800000000", "123456", "SCAN:" + createdSessionId);
    }

    @Test
    void directSmsVerificationRejectsPhoneMismatchAndExpiresGracefully() {
        SmsService smsService = mock(SmsService.class);
        SmsRelayService directService = new SmsRelayService(jdbc, smsService, new StubDataService());

        jdbc.sessions.put("mismatch", new HashMap<>(directSessionRow("mismatch", "elder-1", "health", "13800000000", "PENDING", Instant.now().plusSeconds(60))));
        assertMessage("Verification phone mismatch", () -> directService.verifyDirectSmsVerificationSession("mismatch", "13900000000", "123456"));

        jdbc.sessions.put("expired-direct", new HashMap<>(directSessionRow("expired-direct", "elder-1", "health", "13800000000", "PENDING", Instant.now().minusSeconds(5))));
        ScanVerificationStatusDto expired = directService.verifyDirectSmsVerificationSession("expired-direct", "13800000000", "123456");
        assertEquals("EXPIRED", expired.getStatus());
        assertEquals(false, expired.isVerified());
    }

    @Test
    void helperMethodsSerializeCacheEntriesAndExposeDtoAccessors() {
        SmsRelayService.VerifiedSessionContext context = new SmsRelayService.VerifiedSessionContext();
        context.setSessionId("session-1");
        context.setElderId("elder-1");
        context.setTarget("health");
        context.setVerificationMethod("IDENTITY");
        context.setVisitorName("访客");
        context.setVisitorPhone("13800000000");
        context.setVisitorIdCard("500102200212180836");
        context.setSenderPhoneMasked("138****0000");

        SmsRelayService.CachedAuthorizedSession cached = new SmsRelayService.CachedAuthorizedSession();
        Instant authorizedUntil = Instant.now().plusSeconds(90);
        cached.setContext(context);
        cached.setAuthorizedUntil(authorizedUntil);

        Long ttl = ReflectionTestUtils.invokeMethod(service, "effectiveAuthorizedSessionTtl", cached);
        String key = ReflectionTestUtils.invokeMethod(service, "authorizedSessionCacheKey", "session-1");
        String json = ReflectionTestUtils.invokeMethod(service, "toJson", Map.of("sessionId", "session-1"));
        String verifiedContextJson = """
                {"sessionId":"session-1","elderId":"elder-1","target":"health","verificationMethod":"IDENTITY","visitorName":"访客","visitorPhone":"13800000000","visitorIdCard":"500102200212180836","senderPhoneMasked":"138****0000"}
                """.trim();
        SmsRelayService.VerifiedSessionContext decoded =
                ReflectionTestUtils.invokeMethod(service, "fromJson", verifiedContextJson, SmsRelayService.VerifiedSessionContext.class);
        Long parsedLong = ReflectionTestUtils.invokeMethod(service, "longValue", "1710000000000");

        assertNotNull(ttl);
        assertTrue(ttl >= 0L);
        assertEquals("smsrelay:authorized-session:session-1", key);
        assertNotNull(json);
        assertEquals("session-1", decoded.getSessionId());
        assertEquals("138****0000", decoded.getSenderPhoneMasked());
        assertEquals(1710000000000L, parsedLong);
        assertEquals(context, cached.getContext());
        assertEquals(authorizedUntil, cached.getAuthorizedUntil());
    }

    private static Map<String, Object> deviceRow(String deviceId, String secret) {
        return Map.of(
                "device_id", deviceId,
                "device_secret", secret,
                "receiver_phone", "13800000000",
                "server_url", "https://api.example.com",
                "message_prefix", "SL",
                "status", "离线",
                "last_heartbeat", ""
        );
    }

    private static Map<String, Object> sessionRow(
            String sessionId,
            String elderId,
            String target,
            String status,
            boolean verified,
            Instant expiresAt
    ) {
        return Map.ofEntries(
                Map.entry("session_id", sessionId),
                Map.entry("elder_id", elderId),
                Map.entry("target", target),
                Map.entry("status", status),
                Map.entry("verified", verified),
                Map.entry("expires_at", expiresAt.toString()),
                Map.entry("verified_at", Instant.now().toString()),
                Map.entry("verification_method", "IDENTITY"),
                Map.entry("visitor_name_enc", "name-enc"),
                Map.entry("visitor_phone_enc", "phone-enc"),
                Map.entry("visitor_id_card_enc", "id-enc"),
                Map.entry("sender_phone_masked", "138****0000")
        );
    }

    private static Map<String, Object> directSessionRow(
            String sessionId,
            String elderId,
            String target,
            String receiverPhone,
            String status,
            Instant expiresAt
    ) {
        return Map.ofEntries(
                Map.entry("session_id", sessionId),
                Map.entry("elder_id", elderId),
                Map.entry("target", target),
                Map.entry("receiver_phone", receiverPhone),
                Map.entry("message_body", ""),
                Map.entry("message_prefix", "DIRECT_SMS"),
                Map.entry("status", status),
                Map.entry("verified", false),
                Map.entry("expires_at", expiresAt.toString()),
                Map.entry("verified_at", ""),
                Map.entry("verification_method", "DIRECT_SMS"),
                Map.entry("sender_phone_masked", "")
        );
    }

    private static void assertMessage(String message, ThrowingRunnable runnable) {
        BizException ex = assertThrows(BizException.class, runnable::run);
        assertTrue(ex.getMessage().contains(message));
    }

    private static String hmac(String value, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] digest = mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
        StringBuilder builder = new StringBuilder(digest.length * 2);
        for (byte item : digest) {
            builder.append(String.format("%02x", item));
        }
        return builder.toString();
    }

    private interface ThrowingRunnable {
        void run();
    }

    private static class StubDataService extends SilverLinkDataService {
        StubDataService() {
            super(null, null, null, null);
        }

        @Override
        public String enc(String value) {
            return value == null ? "" : value;
        }

        @Override
        public String dec(Object value) {
            String text = value == null ? "" : String.valueOf(value);
            return switch (text) {
                case "name-enc" -> "访客";
                case "phone-enc" -> "13800000000";
                case "id-enc" -> "500102200212180836";
                default -> text;
            };
        }
    }

    private static class FakeJdbcTemplate extends JdbcTemplate {
        private final Map<String, Map<String, Object>> devices = new HashMap<>();
        private final Map<String, Map<String, Object>> sessions = new HashMap<>();
        private final List<Map<String, Object>> records = new ArrayList<>();
        private int sessionLookupCount;

        @Override
        public int update(String sql, Object... args) {
            if (sql.contains("update sms_relay_device set last_heartbeat")) {
                String deviceId = String.valueOf(args[2]);
                Map<String, Object> row = devices.get(deviceId);
                if (row == null) {
                    return 0;
                }
                row.put("last_heartbeat", args[0]);
                row.put("status", args[1]);
                return 1;
            }
            if (sql.contains("update sms_relay_device") && args.length >= 4) {
                String deviceId = String.valueOf(args[3]);
                Map<String, Object> row = devices.get(deviceId);
                if (row == null) {
                    return 0;
                }
                row.put("receiver_phone", args[0]);
                row.put("server_url", args[1]);
                row.put("message_prefix", args[2]);
                return 1;
            }
            if (sql.contains("insert into scan_verification_session")) {
                Map<String, Object> row = new HashMap<>();
                row.put("session_id", args[0]);
                row.put("elder_id", args[1]);
                row.put("target", args[2]);
                if (args.length == 16) {
                    row.put("verification_method", args[3]);
                    row.put("receiver_phone", args[4]);
                    row.put("message_body", args[5]);
                    row.put("message_prefix", args[7]);
                    row.put("status", args[8]);
                    row.put("expires_at", args[9]);
                    row.put("verified", args[10]);
                    row.put("verified_at", args[11]);
                    row.put("sender_phone_masked", args[12]);
                    row.put("visitor_name_enc", args[13]);
                    row.put("visitor_phone_enc", args[14]);
                    row.put("visitor_id_card_enc", args[15]);
                } else if (args.length == 11) {
                    row.put("relay_device_id", args[3]);
                    row.put("receiver_phone", args[4]);
                    row.put("message_body", args[5]);
                    row.put("message_prefix", args[7]);
                    row.put("status", args[8]);
                    row.put("expires_at", args[9]);
                    row.put("verified", args[10]);
                } else if (args.length == 10) {
                    row.put("receiver_phone", args[3]);
                    row.put("message_body", args[4]);
                    row.put("message_prefix", args[6]);
                    row.put("status", args[7]);
                    row.put("expires_at", args[8]);
                    row.put("verified", args[9]);
                    row.put("verification_method", "DIRECT_SMS");
                }
                sessions.put(String.valueOf(args[0]), row);
                return 1;
            }
            if (sql.contains("update scan_verification_session") && sql.contains("set status='VERIFIED'")) {
                String sessionId = String.valueOf(args[2]);
                Map<String, Object> row = sessions.get(sessionId);
                if (row == null) {
                    return 0;
                }
                row.put("status", "VERIFIED");
                row.put("verified", true);
                row.put("verified_at", args[0]);
                row.put("sender_phone_masked", args[1]);
                return 1;
            }
            if (sql.contains("update scan_verification_session") && sql.contains("set status='EXPIRED'")) {
                if (args.length == 1) {
                    for (Map<String, Object> row : sessions.values()) {
                        if ("PENDING".equals(row.get("status"))) {
                            row.put("status", "EXPIRED");
                            row.put("verified", false);
                        }
                    }
                    return 1;
                }
                String sessionId = String.valueOf(args[0]);
                Map<String, Object> row = sessions.get(sessionId);
                if (row == null) {
                    return 0;
                }
                row.put("status", "EXPIRED");
                row.put("verified", false);
                return 1;
            }
            return 1;
        }

        @Override
        public Map<String, Object> queryForMap(String sql, Object... args) {
            if (sql.contains("from sms_relay_device")) {
                return devices.get(String.valueOf(args[0]));
            }
            if (sql.contains("from scan_verification_session")) {
                return sessions.get(String.valueOf(args[0]));
            }
            return Map.of();
        }

        @Override
        public List<Map<String, Object>> queryForList(String sql) {
            if (sql.contains("from sms_relay_record")) {
                return new ArrayList<>(records);
            }
            if (sql.contains("from sms_relay_device order by updated_at desc")) {
                return new ArrayList<>(devices.values());
            }
            if (sql.contains("from scan_verification_session") && sql.contains("order by created_at desc")) {
                return new ArrayList<>(sessions.values());
            }
            if (sql.contains("from scan_verification_session where status='PENDING'")) {
                List<Map<String, Object>> rows = new ArrayList<>();
                for (Map<String, Object> row : sessions.values()) {
                    if ("PENDING".equals(row.get("status"))) {
                        rows.add(row);
                    }
                }
                return rows;
            }
            return super.queryForList(sql);
        }

        @Override
        public List<Map<String, Object>> queryForList(String sql, Object... args) {
            if (sql.contains("from sms_relay_record")) {
                return new ArrayList<>(records);
            }
            if (sql.contains("from sms_relay_device order by updated_at desc")) {
                return new ArrayList<>(devices.values());
            }
            if (sql.contains("from sms_relay_device where device_id=?")) {
                Map<String, Object> row = devices.get(String.valueOf(args[0]));
                return row == null ? List.of() : List.of(row);
            }
            if (sql.contains("from sms_relay_device") && sql.contains("limit 1")) {
                if (args.length > 0) {
                    String preferredId = String.valueOf(args[0]);
                    Map<String, Object> preferred = devices.get(preferredId);
                    if (preferred != null) {
                        return List.of(preferred);
                    }
                }
                return devices.isEmpty() ? List.of() : List.of(devices.values().iterator().next());
            }
            if (sql.contains("from scan_verification_session where session_id=?")) {
                sessionLookupCount++;
                Map<String, Object> row = sessions.get(String.valueOf(args[0]));
                return row == null ? List.of() : List.of(row);
            }
            if (sql.contains("from scan_verification_session where status='PENDING'")) {
                List<Map<String, Object>> rows = new ArrayList<>();
                for (Map<String, Object> row : sessions.values()) {
                    if ("PENDING".equals(row.get("status"))) {
                        rows.add(row);
                    }
                }
                return rows;
            }
            if (sql.contains("from scan_verification_session") && sql.contains("order by created_at desc")) {
                return new ArrayList<>(sessions.values());
            }
            return new ArrayList<>();
        }
    }
}
