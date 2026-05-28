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
        private int sessionLookupCount;

        @Override
        public int update(String sql, Object... args) {
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
                if (args.length == 15) {
                    row.put("verification_method", args[3]);
                    row.put("receiver_phone", args[4]);
                    row.put("message_body", args[5]);
                    row.put("message_prefix", args[6]);
                    row.put("status", args[7]);
                    row.put("expires_at", args[8]);
                    row.put("verified", args[9]);
                    row.put("verified_at", args[10]);
                    row.put("sender_phone_masked", args[11]);
                    row.put("visitor_name_enc", args[12]);
                    row.put("visitor_phone_enc", args[13]);
                    row.put("visitor_id_card_enc", args[14]);
                } else if (args.length == 10) {
                    row.put("relay_device_id", args[3]);
                    row.put("receiver_phone", args[4]);
                    row.put("message_body", args[5]);
                    row.put("message_prefix", args[6]);
                    row.put("status", args[7]);
                    row.put("expires_at", args[8]);
                    row.put("verified", args[9]);
                } else if (args.length == 9) {
                    row.put("receiver_phone", args[3]);
                    row.put("message_body", args[4]);
                    row.put("message_prefix", args[5]);
                    row.put("status", args[6]);
                    row.put("expires_at", args[7]);
                    row.put("verified", args[8]);
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
        public List<Map<String, Object>> queryForList(String sql, Object... args) {
            if (sql.contains("from sms_relay_device where device_id=?")) {
                Map<String, Object> row = devices.get(String.valueOf(args[0]));
                return row == null ? List.of() : List.of(row);
            }
            if (sql.contains("from scan_verification_session where session_id=?")) {
                sessionLookupCount++;
                Map<String, Object> row = sessions.get(String.valueOf(args[0]));
                return row == null ? List.of() : List.of(row);
            }
            return new ArrayList<>();
        }
    }
}
