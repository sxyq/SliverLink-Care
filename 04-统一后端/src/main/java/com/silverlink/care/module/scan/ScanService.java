package com.silverlink.care.module.scan;

import com.silverlink.care.infrastructure.cache.SimpleTtlCache;
import com.silverlink.care.module.qrcode.QrCodeEntity;
import com.silverlink.care.module.qrcode.QrCodeService;
import com.silverlink.care.module.smsrelay.SmsRelayService;
import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;

@Service
public class ScanService {

    private final QrCodeService qrCodeService;
    private final SilverLinkDataService data;
    private final SmsRelayService smsRelayService;
    private final SimpleTtlCache<String, Map<String, Object>> localResolveCache = new SimpleTtlCache<>();
    private final SimpleTtlCache<String, Map<String, Object>> localScaleDetailCache = new SimpleTtlCache<>();
    private final SimpleTtlCache<String, ProtectedReadBundle> localProtectedReadBundleCache = new SimpleTtlCache<>();

    @Value("${silverlink.scan.resolve-cache-ttl-ms:10000}")
    private long resolveCacheTtlMs = 10_000L;

    @Value("${silverlink.scan.protected-read-cache-ttl-ms:15000}")
    private long protectedReadCacheTtlMs = 15_000L;

    public ScanService(QrCodeService qrCodeService, SilverLinkDataService data, SmsRelayService smsRelayService) {
        this.qrCodeService = qrCodeService;
        this.data = data;
        this.smsRelayService = smsRelayService;
    }

    public Map<String, Object> resolve(String token) throws Exception {
        if (token == null || token.isBlank()) {
            throw new RuntimeException("二维码无效或已停用");
        }
        Map<String, Object> cached = readCachedMap(resolveCacheKey(token), resolveCacheTtlMs, localResolveCache, () -> {
            try {
                QrCodeEntity entity = qrCodeService.resolve(token);
                if (entity == null || !"ENABLED".equals(entity.getStatus())) {
                    throw new RuntimeException("二维码无效或已停用");
                }
                Map<String, Object> result = new LinkedHashMap<>(data.scanBasic(entity.getElderId()));
                result.put("elderId", entity.getElderId());
                return new LinkedHashMap<>(result);
            } catch (Exception exception) {
                throw exception instanceof RuntimeException runtimeException
                        ? runtimeException
                        : new IllegalStateException("二维码解析失败", exception);
            }
        });
        return new LinkedHashMap<>(cached);
    }

    public Map<String, Object> getArchive(String elderId, String sessionId) {
        smsRelayService.authorizeVerifiedSession(sessionId, elderId, "health");
        return getArchiveData(elderId);
    }

    public Map<String, Object> getVerifiedBasicInfo(String elderId, String sessionId) {
        smsRelayService.authorizeVerifiedSession(sessionId, elderId, "health");
        return getVerifiedBasicInfoData(elderId);
    }

    public List<Map<String, String>> getMedications(String elderId, String sessionId) {
        smsRelayService.authorizeVerifiedSession(sessionId, elderId, "health");
        return getMedicationsData(elderId);
    }

    public List<Map<String, Object>> getScales(String elderId, String sessionId) {
        smsRelayService.authorizeVerifiedSession(sessionId, elderId, "health");
        return getScalesData(elderId);
    }

    public Map<String, Object> getScaleDetail(String elderId, String sessionId, String scaleName) {
        smsRelayService.authorizeVerifiedSession(sessionId, elderId, "health");
        return getScaleDetailData(elderId, scaleName);
    }

    public ScanVerificationSessionDto startVerificationSession(String elderId, String target) {
        QrCodeEntity currentQr = qrCodeService.findCurrentByElder(elderId);
        String relayDeviceId = currentQr == null ? "" : currentQr.getRelayDeviceId();
        return smsRelayService.createScanVerificationSession(elderId, target, relayDeviceId);
    }

    public ScanVerificationStatusDto getVerificationStatus(String sessionId) {
        return smsRelayService.getScanVerificationStatus(sessionId);
    }

    public ScanVerificationStatusDto verifyByIdentity(String elderId, String target, String visitorName, String visitorPhone, String visitorIdCard) {
        return smsRelayService.createIdentityVerificationSession(elderId, target, visitorName, visitorPhone, visitorIdCard);
    }

    public SmsRelayService.VerifiedSessionContext authorizeSession(String sessionId, String elderId, String target) {
        return smsRelayService.authorizeVerifiedSession(sessionId, elderId, target);
    }

    public Map<String, Object> getArchiveData(String elderId) {
        return new LinkedHashMap<>(readProtectedReadBundle(elderId).archive);
    }

    public Map<String, Object> getVerifiedBasicInfoData(String elderId) {
        return new LinkedHashMap<>(readProtectedReadBundle(elderId).basicInfo);
    }

    public List<Map<String, String>> getMedicationsData(String elderId) {
        return deepCopyStringList(readProtectedReadBundle(elderId).medications);
    }

    public List<Map<String, Object>> getScalesData(String elderId) {
        return deepCopyObjectList(readProtectedReadBundle(elderId).scales);
    }

    public Map<String, Object> getScaleDetailData(String elderId, String scaleName) {
        String normalizedScaleName = scaleName == null ? "" : scaleName.trim();
        String cacheKey = cacheKey("scan:scale-detail:", elderId + ":" + normalizedScaleName);
        return readCachedMap(
                cacheKey,
                protectedReadCacheTtlMs,
                localScaleDetailCache,
                () -> new LinkedHashMap<>(data.scaleDetail(elderId, normalizedScaleName))
        );
    }

    private Map<String, Object> readCachedMap(
            String cacheKey,
            long ttlMillis,
            SimpleTtlCache<String, Map<String, Object>> localFallbackCache,
            ThrowingSupplier<Map<String, Object>> loader
    ) {
        Map<String, Object> value = localFallbackCache.getOrLoad(
                cacheKey,
                ttlMillis,
                () -> new LinkedHashMap<>(loader.get())
        );
        return new LinkedHashMap<>(value);
    }

    private ProtectedReadBundle readProtectedReadBundle(String elderId) {
        String cacheKey = cacheKey("scan:bundle:", elderId);
        ProtectedReadBundle bundle = localProtectedReadBundleCache.getOrLoad(
                cacheKey,
                protectedReadCacheTtlMs,
                () -> loadProtectedReadBundle(elderId)
        );
        return bundle.copy();
    }

    private ProtectedReadBundle loadProtectedReadBundle(String elderId) {
        ProtectedReadBundle bundle = new ProtectedReadBundle();
        bundle.archive = new LinkedHashMap<>(data.health(elderId));
        bundle.basicInfo = new LinkedHashMap<>(data.elderDetail(elderId, false));
        bundle.medications = deepCopyStringList(data.medications(elderId));
        bundle.scales = deepCopyObjectList(data.scaleSummaries(elderId));
        return bundle;
    }

    private List<Map<String, String>> deepCopyStringList(List<Map<String, String>> source) {
        List<Map<String, String>> result = new ArrayList<>();
        for (Map<String, String> row : source) {
            result.add(new LinkedHashMap<>(row));
        }
        return result;
    }

    private List<Map<String, Object>> deepCopyObjectList(List<Map<String, Object>> source) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> row : source) {
            result.add(new LinkedHashMap<>(row));
        }
        return result;
    }

    private String cacheKey(String prefix, String suffix) {
        return prefix + (suffix == null ? "" : suffix);
    }

    static String resolveCacheKey(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest((token == null ? "" : token).getBytes(StandardCharsets.UTF_8));
            return "scan:resolve:" + HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private static final class ProtectedReadBundle {
        private Map<String, Object> archive = new LinkedHashMap<>();
        private Map<String, Object> basicInfo = new LinkedHashMap<>();
        private List<Map<String, String>> medications = new ArrayList<>();
        private List<Map<String, Object>> scales = new ArrayList<>();

        public Map<String, Object> getArchive() {
            return archive;
        }

        public void setArchive(Map<String, Object> archive) {
            this.archive = archive == null ? new LinkedHashMap<>() : new LinkedHashMap<>(archive);
        }

        public Map<String, Object> getBasicInfo() {
            return basicInfo;
        }

        public void setBasicInfo(Map<String, Object> basicInfo) {
            this.basicInfo = basicInfo == null ? new LinkedHashMap<>() : new LinkedHashMap<>(basicInfo);
        }

        public List<Map<String, String>> getMedications() {
            return medications;
        }

        public void setMedications(List<Map<String, String>> medications) {
            this.medications = medications == null ? new ArrayList<>() : copyStringRows(medications);
        }

        public List<Map<String, Object>> getScales() {
            return scales;
        }

        public void setScales(List<Map<String, Object>> scales) {
            this.scales = scales == null ? new ArrayList<>() : copyObjectRows(scales);
        }

        private ProtectedReadBundle copy() {
            ProtectedReadBundle copy = new ProtectedReadBundle();
            copy.archive = new LinkedHashMap<>(archive);
            copy.basicInfo = new LinkedHashMap<>(basicInfo);
            copy.medications = copyStringRows(medications);
            copy.scales = copyObjectRows(scales);
            return copy;
        }

        private static List<Map<String, String>> copyStringRows(List<Map<String, String>> source) {
            List<Map<String, String>> rows = new ArrayList<>();
            for (Map<String, String> row : source) {
                rows.add(new LinkedHashMap<>(row));
            }
            return rows;
        }

        private static List<Map<String, Object>> copyObjectRows(List<Map<String, Object>> source) {
            List<Map<String, Object>> rows = new ArrayList<>();
            for (Map<String, Object> row : source) {
                rows.add(new LinkedHashMap<>(row));
            }
            return rows;
        }
    }

    @FunctionalInterface
    private interface ThrowingSupplier<T> {
        T get();
    }
}
