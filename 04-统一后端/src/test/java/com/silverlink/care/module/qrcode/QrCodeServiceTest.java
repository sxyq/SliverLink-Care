package com.silverlink.care.module.qrcode;

import com.silverlink.care.common.BizException;
import com.silverlink.care.infrastructure.crypto.AesGcmCryptoService;
import com.silverlink.care.infrastructure.crypto.HashService;
import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class QrCodeServiceTest {

    private AesGcmCryptoService crypto;
    private HashService hashService;
    private FakeJdbcTemplate jdbc;
    private StubDataService data;
    private QrCodeService service;

    @BeforeEach
    void setUp() throws Exception {
        crypto = mock(AesGcmCryptoService.class);
        hashService = mock(HashService.class);
        jdbc = new FakeJdbcTemplate();
        data = new StubDataService();
        service = new QrCodeService(crypto, hashService, jdbc, data);
        ReflectionTestUtils.setField(service, "publicBaseUrl", "https://example.com/scan?token=");

        when(crypto.encrypt(anyString())).thenReturn("token-generated");
        when(hashService.sha256("token-generated")).thenReturn("hash-generated");
        when(hashService.sha256("token-existing")).thenReturn("hash-existing");
        when(hashService.sha256("token-resolve")).thenReturn("hash-resolve");
        when(crypto.decrypt("token-resolve")).thenReturn("{\"qrId\":\"QR-RESOLVE\"}");
    }

    @Test
    void generateReuseResolveAndRegenerateCoverCorePaths() throws Exception {
        QrCodeEntity created = service.generate("elder-new", "A-001");
        assertEquals("elder-new", created.getElderId());
        assertEquals("ENABLED", created.getStatus());
        assertEquals(1, jdbc.qrCodes.size());

        QrCodeEntity existing = qrRow("qr-existing", "QR-EXISTING", "elder-existing", "A-002", "token-existing", "hash-existing", "device-1", "2026-05-26T10:00:00Z");
        jdbc.qrCodes.add(rowOf(existing));
        QrCodeIssueResult reused = service.generateWithToken("elder-existing", "A-002");
        assertEquals("token-existing", reused.getToken());
        assertEquals("https://example.com/scan?token=token-existing", reused.getUrl());

        QrCodeEntity resolveRow = qrRow("qr-resolve", "QR-RESOLVE", "elder-resolve", "A-003", "token-resolve", "hash-resolve", "", "2026-05-26T10:00:01Z");
        jdbc.qrCodes.add(rowOf(resolveRow));
        QrCodeEntity resolved = service.resolve("token-resolve");
        assertNotNull(resolved);
        assertEquals("elder-resolve", resolved.getElderId());

        QrCodeEntity toRegenerate = qrRow("qr-regenerate", "QR-OLD", "elder-regenerate", "A-004", "token-old", "hash-old", "device-9", "2026-05-26T10:00:02Z");
        jdbc.qrCodes.add(rowOf(toRegenerate));
        QrCodeIssueResult regenerated = service.regenerateWithToken("qr-regenerate");
        assertEquals("qr-regenerate", regenerated.getEntity().getId());
        assertEquals("device-9", regenerated.getEntity().getRelayDeviceId());

        assertNull(service.regenerateWithToken("missing"));
    }

    @Test
    void bindRelayDeviceListAndBuildUrlCoverRemainingPaths() {
        jdbc.devices.put("device-2", Map.of("device_id", "device-2", "receiver_phone", "13900000000"));
        jdbc.qrCodes.add(rowOf(qrRow("qr-bind", "QR-BIND", "elder-bind", "A-005", "token-bind", "hash-bind", "", "2026-05-26T10:00:03Z")));
        jdbc.qrCodes.add(withExtra(rowOf(qrRow("qr-list", "QR-LIST", "elder-list", "A-006", "token-list", "hash-list", "device-2", "2026-05-26T10:00:04Z")),
                "elder_name_enc", "enc:李奶奶",
                "elder_age", 79,
                "elder_phone_enc", "enc:13812345678",
                "relay_receiver_phone", "13900000000"));

        BizException missingId = assertThrows(BizException.class, () -> service.bindRelayDevice("", "device-2"));
        assertEquals(400, missingId.getCode());

        BizException missingDevice = assertThrows(BizException.class, () -> service.bindRelayDevice("qr-bind", "device-missing"));
        assertEquals(404, missingDevice.getCode());

        QrCodeEntity bound = service.bindRelayDevice("qr-bind", "device-2");
        assertEquals("device-2", bound.getRelayDeviceId());
        assertEquals("13900000000", bound.getRelayReceiverPhone());

        QrCodeEntity unbound = service.bindRelayDevice("qr-bind", "  ");
        assertEquals("", unbound.getRelayDeviceId());

        assertEquals("https://example.com/scan?token=abc", service.buildPublicUrl("abc"));
        assertEquals("https://example.com/scan?token=a%2Bb%2Fc%3D", service.buildPublicUrl("a+b/c="));
        ReflectionTestUtils.setField(service, "publicBaseUrl", "https://example.com/s");
        assertEquals("https://example.com/s/s/abc", service.buildPublicUrl("abc"));
        assertEquals("https://example.com/s/s/a%2Bb%2Fc%3D", service.buildPublicUrl("a+b/c="));

        var rows = service.listAll();
        assertEquals(2, rows.size());
        QrCodeEntity listed = rows.stream().filter(item -> "qr-list".equals(item.getId())).findFirst().orElseThrow();
        assertEquals("李奶奶", listed.getElderName());
        assertEquals(79, listed.getElderAge());
        assertEquals("13812345678", listed.getElderPhone());
    }

    @Test
    void ensureEveryElderHasOneQrCodeBackfillsAndDeduplicates() {
        jdbc.elders.add(Map.of("id", "elder-1", "archive_no", "A-001"));
        jdbc.elders.add(Map.of("id", "elder-2", "archive_no", "A-002"));
        jdbc.qrCodes.add(rowOf(qrRow("qr-2-old", "QR-2-OLD", "elder-2", "A-002", "token-2-old", "hash-2-old", "", "2026-05-26T09:00:00Z")));
        jdbc.qrCodes.add(rowOf(qrRow("qr-2-new", "QR-2-NEW", "elder-2", "A-002", "token-2-new", "hash-2-new", "", "2026-05-26T10:00:00Z")));

        service.ensureEveryElderHasOneQrCode();

        long elder1Count = jdbc.qrCodes.stream().filter(row -> "elder-1".equals(row.get("elder_id"))).count();
        long elder2Count = jdbc.qrCodes.stream().filter(row -> "elder-2".equals(row.get("elder_id"))).count();
        assertEquals(1, elder1Count);
        assertEquals(1, elder2Count);
        assertTrue(jdbc.qrCodes.stream().anyMatch(row -> "qr-2-new".equals(row.get("id"))));
    }

    @Test
    void regenerateAndDisableConvenienceMethodsUpdateEntityState() throws Exception {
        QrCodeEntity original = qrRow("qr-disable", "QR-OLD", "elder-disable", "A-007", "token-old", "hash-old", "", "2026-05-26T11:00:00Z");
        jdbc.qrCodes.add(rowOf(original));

        QrCodeEntity regenerated = service.regenerate("qr-disable");
        assertNotNull(regenerated);
        assertEquals("qr-disable", regenerated.getId());
        assertEquals("ENABLED", regenerated.getStatus());

        service.disable("qr-disable");
        QrCodeEntity disabled = service.findById("qr-disable");
        assertEquals("DISABLED", disabled.getStatus());
        assertNotNull(disabled.getDisabledAt());
    }

    @Test
    void resolveAcceptsLegacySpaceBrokenToken() throws Exception {
        QrCodeEntity resolveRow = qrRow("qr-resolve-space", "QR-RESOLVE", "elder-resolve", "A-003", "token+resolve", "hash-space", "", "2026-05-26T10:00:01Z");
        jdbc.qrCodes.add(rowOf(resolveRow));
        when(hashService.sha256("token+resolve")).thenReturn("hash-space");
        when(crypto.decrypt("token+resolve")).thenReturn("{\"qrId\":\"QR-RESOLVE\"}");

        QrCodeEntity resolved = service.resolve("token resolve");
        assertNotNull(resolved);
        assertEquals("elder-resolve", resolved.getElderId());
    }

    private static QrCodeEntity qrRow(String id, String qrId, String elderId, String archiveNo, String token, String hash, String relayDeviceId, String createdAt) {
        QrCodeEntity entity = new QrCodeEntity();
        entity.setId(id);
        entity.setQrId(qrId);
        entity.setElderId(elderId);
        entity.setArchiveNo(archiveNo);
        entity.setQrToken(token);
        entity.setQrTokenHash(hash);
        entity.setRelayDeviceId(relayDeviceId);
        entity.setStatus("ENABLED");
        entity.setKeyId("demo-key-v1");
        entity.setCreatedAt(createdAt);
        return entity;
    }

    private static Map<String, Object> rowOf(QrCodeEntity entity) {
        Map<String, Object> row = new HashMap<>();
        row.put("id", entity.getId());
        row.put("qr_id", entity.getQrId());
        row.put("elder_id", entity.getElderId());
        row.put("archive_no", entity.getArchiveNo());
        row.put("relay_device_id", entity.getRelayDeviceId());
        row.put("relay_receiver_phone", entity.getRelayReceiverPhone());
        row.put("qr_token", entity.getQrToken());
        row.put("qr_token_hash", entity.getQrTokenHash());
        row.put("status", entity.getStatus());
        row.put("key_id", entity.getKeyId());
        row.put("created_at", entity.getCreatedAt());
        row.put("disabled_at", entity.getDisabledAt());
        return row;
    }

    @SafeVarargs
    private static Map<String, Object> withExtra(Map<String, Object> base, Object... items) {
        for (int i = 0; i < items.length; i += 2) {
            base.put(String.valueOf(items[i]), items[i + 1]);
        }
        return base;
    }

    private static class StubDataService extends SilverLinkDataService {
        StubDataService() {
            super(null, null, null, null);
        }

        @Override
        public String dec(Object value) {
            String text = str(value);
            return text.startsWith("enc:") ? text.substring(4) : text;
        }

        @Override
        public String str(Object value) {
            return value == null ? "" : String.valueOf(value);
        }

        @Override
        public int intValue(Object value) {
            if (value == null) {
                return 0;
            }
            if (value instanceof Number number) {
                return number.intValue();
            }
            return Integer.parseInt(String.valueOf(value));
        }
    }

    private static class FakeJdbcTemplate extends JdbcTemplate {
        private final List<Map<String, Object>> qrCodes = new ArrayList<>();
        private final List<Map<String, Object>> elders = new ArrayList<>();
        private final Map<String, Map<String, Object>> devices = new HashMap<>();

        @Override
        public List<Map<String, Object>> queryForList(String sql) {
            return queryForList(sql, new Object[0]);
        }

        @Override
        public List<Map<String, Object>> queryForList(String sql, Object... args) {
            if (sql.contains("from qr_code where id=?")) {
                return qrCodes.stream()
                        .filter(row -> String.valueOf(row.get("id")).equals(String.valueOf(args[0])))
                        .map(row -> (Map<String, Object>) new HashMap<>(row))
                        .toList();
            }
            if (sql.contains("from qr_code where elder_id=? order by created_at desc limit 1")) {
                return qrCodes.stream()
                        .filter(row -> String.valueOf(row.get("elder_id")).equals(String.valueOf(args[0])))
                        .sorted(Comparator.comparing(row -> String.valueOf(row.get("created_at")), Comparator.reverseOrder()))
                        .limit(1)
                        .map(row -> (Map<String, Object>) new HashMap<>(row))
                        .toList();
            }
            if (sql.contains("from qr_code where elder_id=? order by created_at desc")) {
                return qrCodes.stream()
                        .filter(row -> String.valueOf(row.get("elder_id")).equals(String.valueOf(args[0])))
                        .sorted(Comparator.comparing(row -> String.valueOf(row.get("created_at")), Comparator.reverseOrder()))
                        .map(row -> (Map<String, Object>) new HashMap<>(row))
                        .toList();
            }
            if (sql.contains("from qr_code where qr_id=? and qr_token_hash=?")) {
                return qrCodes.stream()
                        .filter(row -> String.valueOf(row.get("qr_id")).equals(String.valueOf(args[0]))
                                && String.valueOf(row.get("qr_token_hash")).equals(String.valueOf(args[1])))
                        .map(row -> (Map<String, Object>) new HashMap<>(row))
                        .toList();
            }
            if (sql.contains("from sms_relay_device where device_id=?")) {
                Map<String, Object> row = devices.get(String.valueOf(args[0]));
                return row == null ? List.of() : List.of(new HashMap<>(row));
            }
            if (sql.contains("left join sms_relay_device d on d.device_id = q.relay_device_id") && sql.contains("where q.id=?")) {
                return qrCodes.stream()
                        .filter(row -> String.valueOf(row.get("id")).equals(String.valueOf(args[0])))
                        .map(this::withRelayPhone)
                        .toList();
            }
            if (sql.contains("left join elder e on e.id = q.elder_id")) {
                return qrCodes.stream()
                        .sorted(Comparator.comparing(row -> String.valueOf(row.get("created_at")), Comparator.reverseOrder()))
                        .map(this::withRelayPhone)
                        .toList();
            }
            if (sql.contains("select id, archive_no from elder order by created_at asc")) {
                return elders.stream().map(row -> (Map<String, Object>) new HashMap<>(row)).toList();
            }
            return List.of();
        }

        @Override
        public <T> T queryForObject(String sql, Class<T> requiredType, Object... args) {
            if (sql.contains("select count(*) from sms_relay_device where device_id=?")) {
                Integer value = devices.containsKey(String.valueOf(args[0])) ? 1 : 0;
                return requiredType.cast(value);
            }
            return null;
        }

        @Override
        public int update(String sql, Object... args) {
            if (sql.startsWith("insert into qr_code")) {
                Map<String, Object> row = new HashMap<>();
                row.put("id", args[0]);
                row.put("qr_id", args[1]);
                row.put("elder_id", args[2]);
                row.put("archive_no", args[3]);
                row.put("relay_device_id", args[4]);
                row.put("qr_token", args[5]);
                row.put("qr_token_hash", args[6]);
                row.put("status", args[7]);
                row.put("key_id", args[8]);
                row.put("created_at", args[9]);
                row.put("disabled_at", args[10]);
                qrCodes.add(row);
                return 1;
            }
            if (sql.startsWith("update qr_code set qr_id=?")) {
                for (Map<String, Object> row : qrCodes) {
                    if (String.valueOf(row.get("id")).equals(String.valueOf(args[7]))) {
                        row.put("qr_id", args[0]);
                        row.put("archive_no", args[1]);
                        row.put("relay_device_id", args[2]);
                        row.put("qr_token", args[3]);
                        row.put("qr_token_hash", args[4]);
                        row.put("status", "ENABLED");
                        row.put("key_id", args[5]);
                        row.put("created_at", args[6]);
                        row.put("disabled_at", null);
                        return 1;
                    }
                }
                return 0;
            }
            if (sql.startsWith("update qr_code set status='DISABLED'")) {
                for (Map<String, Object> row : qrCodes) {
                    if (String.valueOf(row.get("id")).equals(String.valueOf(args[1]))) {
                        row.put("status", "DISABLED");
                        row.put("disabled_at", args[0]);
                    }
                }
                return 1;
            }
            if (sql.startsWith("update qr_code set relay_device_id=?")) {
                for (Map<String, Object> row : qrCodes) {
                    if (String.valueOf(row.get("id")).equals(String.valueOf(args[1]))) {
                        row.put("relay_device_id", args[0]);
                        return 1;
                    }
                }
                return 0;
            }
            if (sql.startsWith("delete from qr_code where elder_id=? and id<>?")) {
                qrCodes.removeIf(row -> String.valueOf(row.get("elder_id")).equals(String.valueOf(args[0]))
                        && !String.valueOf(row.get("id")).equals(String.valueOf(args[1])));
                return 1;
            }
            return 0;
        }

        private Map<String, Object> withRelayPhone(Map<String, Object> row) {
            Map<String, Object> copy = new HashMap<>(row);
            String relayDeviceId = String.valueOf(copy.getOrDefault("relay_device_id", ""));
            if (copy.get("relay_receiver_phone") == null && devices.containsKey(relayDeviceId)) {
                copy.put("relay_receiver_phone", devices.get(relayDeviceId).get("receiver_phone"));
            }
            return copy;
        }
    }
}
