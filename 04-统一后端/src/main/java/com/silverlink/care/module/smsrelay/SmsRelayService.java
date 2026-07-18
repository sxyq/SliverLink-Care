package com.silverlink.care.module.smsrelay;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.silverlink.care.common.BizException;
import com.silverlink.care.common.CursorCodec;
import com.silverlink.care.common.CursorPage;
import com.silverlink.care.infrastructure.cache.JsonTwoLevelCache;
import com.silverlink.care.infrastructure.cache.SimpleTtlCache;
import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import com.silverlink.care.module.scan.ScanVerificationSessionDto;
import com.silverlink.care.module.scan.ScanVerificationStatusDto;
import com.silverlink.care.module.sms.SmsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class SmsRelayService {

    private static final char[] TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();

    private final byte[] sessionEntropyKey = initSessionEntropyKey();
    private final ThreadLocal<Mac> sessionMac = ThreadLocal.withInitial(() -> newMac(sessionEntropyKey));
    private final AtomicLong sessionSequence = new AtomicLong();
    private final JdbcTemplate jdbc;
    private final SmsService smsService;
    private final SilverLinkDataService data;
    private final JsonTwoLevelCache cache;
    private final ObjectMapper objectMapper;

    @Value("${silverlink.smsrelay.receiver-phone:13800001111}")
    private String receiverPhone;

    @Value("${silverlink.smsrelay.message-prefix:SL}")
    private String messagePrefix;

    @Value("${silverlink.smsrelay.session-ttl-seconds:300}")
    private long sessionTtlSeconds;

    @Value("${silverlink.smsrelay.server-url:https://api.silverlink.example.com}")
    private String serverUrl;

    @Value("${silverlink.smsrelay.default-device-id}")
    private String defaultDeviceId;

    @Value("${silverlink.smsrelay.default-device-secret}")
    private String defaultDeviceSecret;

    @Value("${silverlink.smsrelay.signature-window-seconds:300}")
    private long signatureWindowSeconds;

    @Value("${silverlink.smsrelay.authorization-window-seconds:600}")
    private long authorizationWindowSeconds;

    @Value("${silverlink.smsrelay.authorized-session-cache-ttl-ms:60000}")
    private long authorizedSessionCacheTtlMs;

    @Value("${silverlink.smsrelay.device-cache-ttl-ms:60000}")
    private long deviceCacheTtlMs;

    private final ConcurrentHashMap<String, Long> relayNonceStore = new ConcurrentHashMap<>();
    private final SimpleTtlCache<String, CachedAuthorizedSession> authorizedSessionCache = new SimpleTtlCache<>();
    private final SimpleTtlCache<String, ScanVerificationStatusDto> verifiedStatusCache = new SimpleTtlCache<>();
    private final SimpleTtlCache<String, DeviceConfigDto> preferredDeviceCache = new SimpleTtlCache<>();
    private final SimpleTtlCache<String, RelayDeviceSnapshot> deviceSnapshotCache = new SimpleTtlCache<>();

    public SmsRelayService(JdbcTemplate jdbc, SmsService smsService, SilverLinkDataService data) {
        this(jdbc, smsService, data, null, new ObjectMapper());
    }

    @Autowired
    public SmsRelayService(
            JdbcTemplate jdbc,
            SmsService smsService,
            SilverLinkDataService data,
            JsonTwoLevelCache cache,
            ObjectMapper objectMapper
    ) {
        this.jdbc = jdbc;
        this.smsService = smsService;
        this.data = data;
        this.cache = cache;
        this.objectMapper = objectMapper;
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
                sha256Hex(defaultDeviceSecret),
                "离线"
        );
    }

    public ScanVerificationSessionDto createScanVerificationSession(String elderId, String target, String relayDeviceId) {
        Instant now = Instant.now();
        DeviceConfigDto device = relayDeviceId == null || relayDeviceId.isBlank()
                ? resolvePreferredDevice()
                : resolveDeviceById(relayDeviceId);
        SessionMaterial sessionMaterial = newSessionMaterial();
        String sessionId = sessionMaterial.sessionId();
        String bodyToken = sessionMaterial.bodyToken();
        String body = device.getMessagePrefix() + " " + bodyToken;
        String expiresAt = now.plusSeconds(sessionTtlSeconds).toString();

        jdbc.update("""
                insert into scan_verification_session
                (session_id, elder_id, target, relay_device_id, receiver_phone, message_body, message_body_hash, message_prefix, status, expires_at, verified)
                values (?,?,?,?,?,?,?,?,?,?,?)
                """,
                sessionId,
                elderId,
                target,
                device.getDeviceId(),
                device.getReceiverPhone(),
                previewMessageBody(body),
                sha256Hex(normalize(body)),
                device.getMessagePrefix(),
                "PENDING",
                expiresAt,
                false
        );
        return buildSessionDto(sessionId, elderId, device.getReceiverPhone(), body, device.getMessagePrefix(), "PENDING", expiresAt);
    }

    public ScanVerificationStatusDto getScanVerificationStatus(String sessionId) {
        ScanVerificationStatusDto cachedVerified = verifiedStatusCache.get(sessionId);
        if (cachedVerified != null) {
            return cachedVerified;
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
            invalidateAuthorizedSession(sessionId);
            row.put("status", "EXPIRED");
            row.put("verified", false);
        }
        ScanVerificationStatusDto status = mapStatus(row);
        if (status.isVerified() && "VERIFIED".equals(status.getStatus())) {
            cacheVerifiedStatus(status, sessionTtlMillis(str(row.get("expires_at"))));
        }
        return status;
    }

    public ScanVerificationSessionDto createDirectSmsVerificationSession(String elderId, String target, String receiverPhone) {
        if (receiverPhone == null || receiverPhone.isBlank()) {
            throw new BizException(400, "Missing receiver phone");
        }

        Instant now = Instant.now();
        String sessionId = newSessionId();
        String scene = "SCAN:" + sessionId;
        String expiresAt = now.plusSeconds(sessionTtlSeconds).toString();

        smsService.sendCode(receiverPhone, scene);
        jdbc.update("""
                insert into scan_verification_session
                (session_id, elder_id, target, receiver_phone, message_body, message_body_hash, message_prefix, status, expires_at, verified)
                values (?,?,?,?,?,?,?,?,?,?)
                """,
                sessionId,
                elderId,
                target,
                receiverPhone,
                "",
                "",
                "DIRECT_SMS",
                "PENDING",
                expiresAt,
                false
        );
        return buildSessionDto(sessionId, elderId, receiverPhone, "", "DIRECT_SMS", "PENDING", expiresAt);
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
            String verifiedAt = Instant.now().toString();
            String senderPhoneMasked = maskPhone(receiverPhone);
            jdbc.update("""
                    update scan_verification_session
                    set status='VERIFIED', verified=1, verified_at=?, sender_phone_masked=?
                    where session_id=?
                    """,
                    verifiedAt,
                    senderPhoneMasked,
                    sessionId
            );
            cacheVerifiedStatus(
                    buildStatusDto(sessionId, str(row.get("elder_id")), "VERIFIED", true, verifiedAt, senderPhoneMasked),
                    sessionTtlMillis(str(row.get("expires_at")))
            );
            invalidateAuthorizedSession(sessionId);
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
        Instant nowInstant = Instant.now();
        String sessionId = newSessionId();
        String now = nowInstant.toString();

        jdbc.update("""
                insert into scan_verification_session
                (session_id, elder_id, target, verification_method, receiver_phone, message_body, message_body_hash, message_prefix, status, expires_at,
                 verified, verified_at, sender_phone_masked, visitor_name_enc, visitor_phone_enc, visitor_id_card_enc)
                values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                sessionId,
                elderId,
                target,
                "IDENTITY",
                normalizedPhone,
                "",
                "",
                "IDENTITY",
                "VERIFIED",
                nowInstant.plusSeconds(sessionTtlSeconds).toString(),
                true,
                now,
                maskPhone(normalizedPhone),
                data.enc(normalizedName),
                data.enc(normalizedPhone),
                data.enc(normalizedIdCard)
        );

        invalidateAuthorizedSession(sessionId);
        ScanVerificationStatusDto status = buildStatusDto(sessionId, elderId, "VERIFIED", true, now, maskPhone(normalizedPhone));
        cacheVerifiedStatus(status, sessionTtlMillis(nowInstant.plusSeconds(sessionTtlSeconds).toString()));
        return status;
    }

    public void handleInbound(InboundSmsRequest request, String deviceSecret) {
        RelayDeviceSnapshot device = requireDeviceAuth(request.getDeviceId(), deviceSecret);
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
        if (!normalizedReceiverPhone.equals(normalizePhone(device.receiverPhone()))) {
            throw new BizException(400, "Receiver phone does not match device configuration");
        }

        String recordId = normalizeClientRecordId(request.getClientRecordId());
        if (recordId.isBlank()) {
            recordId = newRelayRecordId();
        }
        long uploadedAt = Instant.now().toEpochMilli();
        int inserted;
        try {
            inserted = jdbc.update("""
                    insert into sms_relay_record
                    (id, device_id, receiver_phone, sender_phone, message_body, received_at, message_prefix, uploaded_at, status)
                    values (?,?,?,?,?,?,?,?,?)
                    """,
                    recordId,
                    request.getDeviceId(),
                    request.getReceiverPhone(),
                    request.getSenderPhone(),
                    previewMessageBody(request.getMessageBody()),
                    request.getReceivedAt(),
                    request.getMessagePrefix(),
                    uploadedAt,
                    "UPLOADED"
            );
        } catch (DuplicateKeyException duplicate) {
            // A client retry with the same signed ID already reached the database.
            return;
        }
        if (inserted == 0) {
            return;
        }
        invalidateAdminSummary();

        String normalizedBody = normalize(request.getMessageBody());
        String normalizedBodyHash = sha256Hex(normalizedBody);
        String verifiedAt = Instant.now().toString();
        List<Map<String, Object>> matchedRows = jdbc.queryForList(
                """
                select session_id, elder_id, receiver_phone, message_body, message_body_hash, expires_at
                from scan_verification_session
                where status='PENDING' and receiver_phone=? and (message_body_hash=? or message_body=?)
                order by created_at desc
                limit 1
                """,
                request.getReceiverPhone(),
                normalizedBodyHash,
                normalizedBody
        );
        for (Map<String, Object> row : matchedRows) {
            if (Instant.parse(str(row.get("expires_at"))).isBefore(Instant.now())) {
                jdbc.update(
                        "update scan_verification_session set status='EXPIRED', verified=0 where session_id=? and status='PENDING'",
                        str(row.get("session_id"))
                );
                continue;
            }
            String storedBodyHash = str(row.get("message_body_hash"));
            boolean hashMatches = !storedBodyHash.isBlank() && storedBodyHash.equals(normalizedBodyHash);
            if (!hashMatches && !normalize(str(row.get("message_body"))).equals(normalizedBody)) {
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
            cacheVerifiedStatus(
                    buildStatusDto(
                            str(row.get("session_id")),
                            str(row.get("elder_id")),
                            "VERIFIED",
                            true,
                            verifiedAt,
                            maskPhone(request.getSenderPhone())
                    ),
                    sessionTtlMillis(str(row.get("expires_at")))
            );
            invalidateAuthorizedSession(str(row.get("session_id")));
        }
    }

    public void handleHeartbeat(HeartbeatRequest request, String deviceSecret) {
        requireDeviceAuth(request.getDeviceId(), deviceSecret);
        jdbc.update(
                "update sms_relay_device set last_heartbeat=?, status=? where device_id=?",
                Instant.now().toString(),
                "在线",
                request.getDeviceId()
        );
        invalidateAdminSummary();
    }

    public DeviceConfigDto getDeviceConfig(String deviceId, String deviceSecret) {
        requireDeviceAuth(deviceId, deviceSecret);
        return mapDevice(loadDeviceRow(deviceId));
    }

    public void validateDeviceRequestSignature(
            String deviceId,
            String deviceSecret,
            String requestUri,
            String method,
            RelaySignatureHeaders headers,
            String payload
    ) {
        requireDeviceAuth(deviceId, deviceSecret);
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
        return pageRecords(null, 50, null, null, null, null, null, null).items();
    }

    public CursorPage<SmsRelayRecordDto> pageRecords(
            String cursor,
            Integer requestedLimit,
            String deviceId,
            String status,
            String receiverPhone,
            String senderPhone,
            String from,
            String to
    ) {
        int limit = requestedLimit == null ? 50 : Math.max(1, Math.min(100, requestedLimit));
        Map<String, String> decoded = CursorCodec.decode(cursor);
        StringBuilder sql = new StringBuilder("select * from sms_relay_record force index (")
                .append(recordPageIndex(deviceId, status, receiverPhone, senderPhone)).append(") where 1=1");
        List<Object> args = new ArrayList<>();
        addExact(sql, args, "device_id", deviceId);
        addExact(sql, args, "status", status);
        addExact(sql, args, "receiver_phone", receiverPhone);
        addExact(sql, args, "sender_phone", senderPhone);
        addLongRange(sql, args, "uploaded_at", from, to);
        String cursorUploadedAt = decoded.get("uploadedAt");
        String cursorId = decoded.get("id");
        if (cursorUploadedAt != null && cursorId != null) {
            sql.append(" and (uploaded_at < ? or (uploaded_at = ? and id < ?))");
            long timestamp = parseLong(cursorUploadedAt, "分页游标无效");
            args.add(timestamp);
            args.add(timestamp);
            args.add(cursorId);
        }
        sql.append(" order by uploaded_at desc, id desc limit ?");
        args.add(limit + 1);
        List<Map<String, Object>> rows = jdbc.queryForList(sql.toString(), args.toArray());
        List<SmsRelayRecordDto> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            result.add(mapRecord(row));
        }
        boolean hasMore = result.size() > limit;
        if (hasMore) result = new ArrayList<>(result.subList(0, limit));
        String next = null;
        if (hasMore && !result.isEmpty()) {
            SmsRelayRecordDto last = result.get(result.size() - 1);
            next = CursorCodec.encode(Map.of("uploadedAt", String.valueOf(last.getUploadedAt()), "id", last.getId()));
        }
        return new CursorPage<>(result, next, hasMore);
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

        Map<String, Object> row = loadDeviceRow(deviceId);
        refreshDeviceCaches(deviceId, row);
        invalidateAdminSummary();
        return mapDevice(row);
    }

    public List<ScanVerificationAdminDto> listVerificationSessions() {
        return pageVerificationSessions(null, null, null, null, null, null, null, null).items();
    }

    public CursorPage<ScanVerificationAdminDto> pageVerificationSessions(
            String cursor,
            Integer requestedLimit,
            String status,
            String relayDeviceId,
            String elderId,
            String receiverPhone,
            String from,
            String to
    ) {
        int limit = requestedLimit == null ? 50 : Math.max(1, Math.min(100, requestedLimit));
        Map<String, String> decoded = CursorCodec.decode(cursor);
        StringBuilder sql = new StringBuilder("select * from scan_verification_session force index (")
                .append(sessionPageIndex(status, relayDeviceId, elderId, receiverPhone)).append(") where 1=1");
        List<Object> args = new ArrayList<>();
        addExact(sql, args, "status", status);
        addExact(sql, args, "relay_device_id", relayDeviceId);
        addExact(sql, args, "elder_id", elderId);
        addExact(sql, args, "receiver_phone", receiverPhone);
        addDateRange(sql, args, "created_at", from, to);
        String cursorCreatedAt = decoded.get("createdAt");
        String cursorSessionId = decoded.get("sessionId");
        if (cursorCreatedAt != null && cursorSessionId != null) {
            sql.append(" and (created_at < ? or (created_at = ? and session_id < ?))");
            args.add(java.sql.Timestamp.valueOf(cursorCreatedAt));
            args.add(java.sql.Timestamp.valueOf(cursorCreatedAt));
            args.add(cursorSessionId);
        }
        sql.append(" order by created_at desc, session_id desc limit ?");
        args.add(limit + 1);
        List<Map<String, Object>> rows = jdbc.queryForList(sql.toString(), args.toArray());
        List<ScanVerificationAdminDto> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            result.add(mapAdminSession(row));
        }
        boolean hasMore = result.size() > limit;
        if (hasMore) result = new ArrayList<>(result.subList(0, limit));
        String next = null;
        if (hasMore && !result.isEmpty()) {
            ScanVerificationAdminDto last = result.get(result.size() - 1);
            next = CursorCodec.encode(Map.of("createdAt", normalizeSqlTimestamp(last.getCreatedAt()), "sessionId", last.getSessionId()));
        }
        return new CursorPage<>(result, next, hasMore);
    }

    public Map<String, Object> adminSummary() {
        if (cache == null) return buildAdminSummary();
        String payload = cache.getOrLoad("smsrelay:summary:v1", 1_000L, 5_000L, this::serializeAdminSummary);
        return fromJsonMap(payload);
    }

    public VerifiedSessionContext authorizeVerifiedSession(String sessionId, String elderId, String target) {
        if (sessionId == null || sessionId.isBlank()) {
            throw new BizException(401, "Missing verification session");
        }
        CachedAuthorizedSession cached = authorizedSessionCache.getOrLoadEntry(
                sessionId,
                () -> loadAuthorizedSession(sessionId)
        );
        if (cache != null && cached != null) {
            cache.put(authorizedSessionCacheKey(sessionId), toJson(cached), effectiveAuthorizedSessionTtl(cached));
        }
        validateAuthorizedContext(cached.context(), elderId, target, cached.authorizedUntil());
        return cached.context();
    }

    private SimpleTtlCache.LoadedValue<CachedAuthorizedSession> loadAuthorizedSession(String sessionId) {
        if (cache != null) {
            String payload = cache.get(authorizedSessionCacheKey(sessionId));
            if (payload != null) {
                CachedAuthorizedSession cached = fromJson(payload, CachedAuthorizedSession.class);
                long ttlMillis = effectiveAuthorizedSessionTtl(cached);
                if (ttlMillis > 0L) {
                    return new SimpleTtlCache.LoadedValue<>(cached, ttlMillis);
                }
            }
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
            invalidateAuthorizedSession(sessionId);
            throw new BizException(401, "Verification session expired");
        }
        if (!bool(row.get("verified")) || !"VERIFIED".equals(str(row.get("status")))) {
            throw new BizException(401, "Verification session not authorized");
        }
        String verifiedAt = str(row.get("verified_at"));
        if (verifiedAt.isBlank()) {
            throw new BizException(401, "Verification session not authorized");
        }
        Instant authorizedUntil = Instant.parse(verifiedAt).plusSeconds(authorizationWindowSeconds);
        VerifiedSessionContext context = mapVerifiedSessionContext(row);
        long ttlByAuthorization = Math.max(0L, authorizedUntil.toEpochMilli() - System.currentTimeMillis());
        long ttlBySessionExpiry = Long.MAX_VALUE;
        String expiresAt = str(row.get("expires_at"));
        if (!expiresAt.isBlank()) {
            ttlBySessionExpiry = Math.max(0L, Instant.parse(expiresAt).toEpochMilli() - System.currentTimeMillis());
        }
        long ttlMillis = Math.min(authorizedSessionCacheTtlMs, Math.min(ttlByAuthorization, ttlBySessionExpiry));
        return new SimpleTtlCache.LoadedValue<>(new CachedAuthorizedSession(context, authorizedUntil), ttlMillis);
    }

    private RelayDeviceSnapshot requireDeviceAuth(String deviceId, String deviceSecret) {
        if (deviceId == null || deviceId.isBlank()) {
            throw new BizException(401, "Missing device id");
        }
        if (deviceSecret == null || deviceSecret.isBlank()) {
            throw new BizException(401, "Missing device secret");
        }
        RelayDeviceSnapshot snapshot;
        try {
            snapshot = loadDeviceSnapshot(deviceId);
        } catch (BizException ex) {
            if (ex.getCode() == 404) {
                throw new BizException(401, "Unknown device");
            }
            throw ex;
        }
        String normalizedSecretHash = sha256Hex(deviceSecret);
        if (!normalizedSecretHash.equals(snapshot.deviceSecret()) && !deviceSecret.equals(snapshot.deviceSecret())) {
            throw new BizException(401, "Invalid device secret");
        }
        return snapshot;
    }

    @Scheduled(fixedDelayString = "${silverlink.smsrelay.expire-pending-interval-ms:60000}")
    public void expirePendingSessionsScheduled() {
        // ISO-8601 values sort lexicographically. One SQL update avoids scanning all sessions in Java.
        jdbc.update("update scan_verification_session set status='EXPIRED', verified=0 "
                + "where status='PENDING' and expires_at < ?", Instant.now().toString());
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
        return preferredDeviceCache.getOrLoad("preferred-device", deviceCacheTtlMs, () -> {
            List<Map<String, Object>> preferred = jdbc.queryForList("""
                    select device_id from sms_relay_device
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
            return mapDeviceSnapshot(loadDeviceSnapshot(str(preferred.get(0).get("device_id"))));
        });
    }

    private DeviceConfigDto resolveDeviceById(String deviceId) {
        return mapDeviceSnapshot(loadDeviceSnapshot(deviceId));
    }

    private RelayDeviceSnapshot loadDeviceSnapshot(String deviceId) {
        return deviceSnapshotCache.getOrLoad(deviceId, deviceCacheTtlMs, () -> mapDeviceSnapshot(loadDeviceRow(deviceId)));
    }

    private Map<String, Object> loadDeviceRow(String deviceId) {
        List<Map<String, Object>> rows = jdbc.queryForList("select * from sms_relay_device where device_id=?", deviceId);
        if (rows.isEmpty()) {
            throw new BizException(404, "未找到指定短信中转设备");
        }
        return rows.get(0);
    }

    private DeviceConfigDto mapDeviceSnapshot(RelayDeviceSnapshot snapshot) {
        DeviceConfigDto dto = new DeviceConfigDto();
        dto.setDeviceId(snapshot.deviceId());
        dto.setReceiverPhone(snapshot.receiverPhone());
        dto.setServerUrl(snapshot.serverUrl());
        dto.setMessagePrefix(snapshot.messagePrefix());
        return dto;
    }

    private RelayDeviceSnapshot mapDeviceSnapshot(Map<String, Object> row) {
        return new RelayDeviceSnapshot(
                str(row.get("device_id")),
                str(row.get("receiver_phone")),
                str(row.get("server_url")),
                str(row.get("message_prefix")),
                str(row.get("device_secret"))
        );
    }

    private void refreshDeviceCaches(String deviceId, Map<String, Object> row) {
        if (deviceId == null || deviceId.isBlank()) {
            return;
        }
        deviceSnapshotCache.put(deviceId, mapDeviceSnapshot(row), deviceCacheTtlMs);
        preferredDeviceCache.invalidate("preferred-device");
    }

    private String newSessionId() {
        return newSessionMaterial().sessionId();
    }

    private SessionMaterial newSessionMaterial() {
        long nowMillis = System.currentTimeMillis();
        long seq = sessionSequence.incrementAndGet();
        byte[] digest = sessionMac.get().doFinal(
                (nowMillis + ":" + seq + ":" + Thread.currentThread().getId()).getBytes(StandardCharsets.UTF_8)
        );
        String encoded = encodeDigest(digest, 18);
        return new SessionMaterial(
                "scan-session-"
                        + Long.toString(nowMillis, 36)
                        + "-"
                        + Long.toString(seq, 36)
                        + "-"
                        + encoded.substring(0, 8),
                encoded.substring(8, 18)
        );
    }

    private String newRelayRecordId() {
        return "rec-" + UUID.randomUUID();
    }

    private String normalizeClientRecordId(String clientRecordId) {
        String value = str(clientRecordId).trim();
        if (value.length() > 64 || !value.matches("[A-Za-z0-9._:-]+")) {
            return "";
        }
        return value;
    }

    private void validateAuthorizedContext(VerifiedSessionContext context, String elderId, String target, Instant authorizedUntil) {
        if (elderId != null && !elderId.isBlank() && !elderId.equals(context.getElderId())) {
            throw new BizException(403, "Verification session elder mismatch");
        }
        if (target != null && !target.isBlank()) {
            String sessionTarget = str(context.getTarget());
            if (!sessionTarget.isBlank() && !target.equals(sessionTarget)) {
                throw new BizException(403, "Verification session target mismatch");
            }
        }
        if (authorizedUntil.isBefore(Instant.now())) {
            invalidateAuthorizedSession(context.getSessionId());
            throw new BizException(401, "Verification authorization expired");
        }
    }

    private void invalidateAuthorizedSession(String sessionId) {
        authorizedSessionCache.invalidate(sessionId);
        if (cache != null) {
            cache.invalidate(authorizedSessionCacheKey(sessionId));
        }
    }

    private ScanVerificationSessionDto buildSessionDto(
            String sessionId,
            String elderId,
            String receiverPhone,
            String messageBody,
            String messagePrefix,
            String status,
            String expiresAt
    ) {
        ScanVerificationSessionDto dto = new ScanVerificationSessionDto();
        dto.setSessionId(sessionId);
        dto.setElderId(elderId);
        dto.setReceiverPhone(receiverPhone);
        dto.setReceiverPhoneMasked(maskPhone(receiverPhone));
        dto.setMessageBody(messageBody);
        dto.setMessagePrefix(messagePrefix);
        dto.setStatus(status);
        dto.setExpiresAt(expiresAt);
        return dto;
    }

    private ScanVerificationStatusDto buildStatusDto(
            String sessionId,
            String elderId,
            String status,
            boolean verified,
            String verifiedAt,
            String senderPhoneMasked
    ) {
        ScanVerificationStatusDto dto = new ScanVerificationStatusDto();
        dto.setSessionId(sessionId);
        dto.setElderId(elderId);
        dto.setStatus(status);
        dto.setVerified(verified);
        dto.setVerifiedAt(verifiedAt);
        dto.setSenderPhoneMasked(senderPhoneMasked);
        return dto;
    }

    private void cacheVerifiedStatus(ScanVerificationStatusDto status, long ttlMillis) {
        if (status == null || status.getSessionId() == null || status.getSessionId().isBlank()) {
            return;
        }
        verifiedStatusCache.put(status.getSessionId(), status, ttlMillis);
    }

    private long sessionTtlMillis(String expiresAt) {
        if (expiresAt == null || expiresAt.isBlank()) {
            return 0L;
        }
        try {
            return Math.max(0L, Instant.parse(expiresAt).toEpochMilli() - System.currentTimeMillis());
        } catch (RuntimeException ex) {
            return 0L;
        }
    }

    private long effectiveAuthorizedSessionTtl(CachedAuthorizedSession cached) {
        long ttlByAuthorization = Math.max(0L, cached.authorizedUntil().toEpochMilli() - System.currentTimeMillis());
        return Math.min(authorizedSessionCacheTtlMs, ttlByAuthorization);
    }

    private String authorizedSessionCacheKey(String sessionId) {
        return "smsrelay:authorized-session:" + sessionId;
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to serialize sms relay cache value", exception);
        }
    }

    private Map<String, Object> buildAdminSummary() {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("deviceCount", scalarLong("select count(*) from sms_relay_device"));
        summary.put("onlineDeviceCount", scalarLong("select count(*) from sms_relay_device where status='在线'"));
        summary.put("recordCount", scalarLong("select count(*) from sms_relay_record"));
        summary.put("sessionCount", scalarLong("select count(*) from scan_verification_session"));
        summary.put("recordStatus", groupedCounts("sms_relay_record"));
        summary.put("sessionStatus", groupedCounts("scan_verification_session"));
        return summary;
    }

    private String serializeAdminSummary() {
        return toJson(buildAdminSummary());
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> fromJsonMap(String payload) {
        try {
            return objectMapper.readValue(payload, LinkedHashMap.class);
        } catch (Exception ignored) {
            return buildAdminSummary();
        }
    }

    private long scalarLong(String sql) {
        Number value = jdbc.queryForObject(sql, Number.class);
        return value == null ? 0L : value.longValue();
    }

    private List<Map<String, Object>> groupedCounts(String table) {
        return jdbc.queryForList("select status, count(*) value from " + table + " group by status")
                .stream().map(row -> Map.<String, Object>of(
                        "status", str(row.get("status")), "value", longValue(row.get("value"))
                )).toList();
    }

    private void invalidateAdminSummary() {
        if (cache != null) cache.invalidate("smsrelay:summary:v1");
    }

    private String recordPageIndex(String deviceId, String status, String receiverPhone, String senderPhone) {
        if (deviceId != null && !deviceId.isBlank()) return "idx_sms_record_device_uploaded_id";
        if (status != null && !status.isBlank()) return "idx_sms_record_status_uploaded_id";
        if (receiverPhone != null && !receiverPhone.isBlank()) return "idx_sms_record_receiver_uploaded_id";
        if (senderPhone != null && !senderPhone.isBlank()) return "idx_sms_record_sender_uploaded_id";
        return "idx_sms_record_uploaded_id";
    }

    private String sessionPageIndex(String status, String relayDeviceId, String elderId, String receiverPhone) {
        if (status != null && !status.isBlank()) return "idx_scan_session_status_created_id";
        if (relayDeviceId != null && !relayDeviceId.isBlank()) return "idx_scan_session_device_created_id";
        if (elderId != null && !elderId.isBlank()) return "idx_scan_session_elder_created_id";
        if (receiverPhone != null && !receiverPhone.isBlank()) return "idx_scan_session_receiver_created_id";
        return "idx_scan_session_created_id";
    }

    private void addExact(StringBuilder sql, List<Object> args, String column, String value) {
        if (value == null || value.isBlank()) return;
        sql.append(" and ").append(column).append(" = ?");
        args.add(value);
    }

    private void addLongRange(StringBuilder sql, List<Object> args, String column, String from, String to) {
        if (from != null && !from.isBlank()) {
            sql.append(" and ").append(column).append(" >= ?");
            args.add(parseLong(from, "时间参数无效"));
        }
        if (to != null && !to.isBlank()) {
            sql.append(" and ").append(column).append(" <= ?");
            args.add(parseLong(to, "时间参数无效"));
        }
    }

    private void addDateRange(StringBuilder sql, List<Object> args, String column, String from, String to) {
        if (from != null && !from.isBlank()) {
            sql.append(" and ").append(column).append(" >= ?");
            args.add(java.sql.Timestamp.valueOf(normalizeSqlTimestamp(from)));
        }
        if (to != null && !to.isBlank()) {
            sql.append(" and ").append(column).append(" <= ?");
            args.add(java.sql.Timestamp.valueOf(normalizeSqlTimestamp(to) + (to.length() == 10 ? " 23:59:59.999999" : "")));
        }
    }

    private String normalizeSqlTimestamp(String value) {
        String normalized = value.replace('T', ' ').replace("Z", "");
        return normalized.length() == 10 ? normalized + " 00:00:00" : normalized;
    }

    private long parseLong(String value, String message) {
        try {
            return Long.parseLong(value);
        } catch (RuntimeException exception) {
            throw new BizException(400, message);
        }
    }

    private <T> T fromJson(String payload, Class<T> type) {
        try {
            return objectMapper.readValue(payload, type);
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to deserialize sms relay cache value", exception);
        }
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

    private String previewMessageBody(String messageBody) {
        String normalized = normalize(messageBody);
        if (normalized.isBlank()) {
            return "";
        }
        int previewLength = Math.min(8, normalized.length());
        return normalized.substring(0, previewLength) + "***";
    }

    private String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(str(value).getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(hashed.length * 2);
            for (byte item : hashed) {
                builder.append(String.format("%02x", item));
            }
            return builder.toString();
        } catch (Exception ex) {
            throw new BizException(500, "Failed to hash relay secret");
        }
    }

    private void evictExpiredRelayNonces(long nowSeconds) {
        for (Map.Entry<String, Long> entry : relayNonceStore.entrySet()) {
            if (Math.abs(nowSeconds - entry.getValue()) > signatureWindowSeconds) {
                relayNonceStore.remove(entry.getKey(), entry.getValue());
            }
        }
    }

    private static byte[] initSessionEntropyKey() {
        byte[] key = new byte[32];
        new SecureRandom().nextBytes(key);
        return key;
    }

    private static Mac newMac(byte[] key) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return mac;
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to initialize session entropy generator", ex);
        }
    }

    private static String encodeDigest(byte[] digest, int length) {
        StringBuilder builder = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            int index = digest[i % digest.length] & 31;
            builder.append(TOKEN_ALPHABET[index]);
        }
        return builder.toString();
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

    public static class CachedAuthorizedSession {
        private VerifiedSessionContext context;
        private Instant authorizedUntil;

        public CachedAuthorizedSession() {
        }

        public CachedAuthorizedSession(VerifiedSessionContext context, Instant authorizedUntil) {
            this.context = context;
            this.authorizedUntil = authorizedUntil;
        }

        public VerifiedSessionContext context() {
            return context;
        }

        public Instant authorizedUntil() {
            return authorizedUntil;
        }

        public VerifiedSessionContext getContext() {
            return context;
        }

        public void setContext(VerifiedSessionContext context) {
            this.context = context;
        }

        public Instant getAuthorizedUntil() {
            return authorizedUntil;
        }

        public void setAuthorizedUntil(Instant authorizedUntil) {
            this.authorizedUntil = authorizedUntil;
        }
    }

    private record RelayDeviceSnapshot(
            String deviceId,
            String receiverPhone,
            String serverUrl,
            String messagePrefix,
            String deviceSecret
    ) {
    }

    private record SessionMaterial(String sessionId, String bodyToken) {
    }
}
