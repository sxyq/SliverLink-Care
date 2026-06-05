package com.silverlink.care.module.scan;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.silverlink.care.infrastructure.cache.JsonTwoLevelCache;
import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import com.silverlink.care.module.qrcode.QrCodeEntity;
import com.silverlink.care.module.qrcode.QrCodeService;
import com.silverlink.care.module.smsrelay.SmsRelayService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ScanServiceTest {

    private QrCodeService qrCodeService;
    private SilverLinkDataService data;
    private SmsRelayService smsRelayService;
    private ScanService service;

    @BeforeEach
    void setUp() {
        qrCodeService = mock(QrCodeService.class);
        data = mock(SilverLinkDataService.class);
        smsRelayService = mock(SmsRelayService.class);
        ObjectProvider<StringRedisTemplate> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(null);
        JsonTwoLevelCache cache = new JsonTwoLevelCache(provider);
        service = new ScanService(qrCodeService, data, smsRelayService, cache, new ObjectMapper());
    }

    @Test
    void resolveReturnsScanBasicForEnabledQrCode() throws Exception {
        QrCodeEntity entity = new QrCodeEntity();
        entity.setElderId("elder-1");
        entity.setStatus("ENABLED");

        when(qrCodeService.resolve("token-1")).thenReturn(entity);
        when(data.scanBasic("elder-1")).thenReturn(Map.of("archiveNo", "A-001", "name", "李奶奶"));

        Map<String, Object> result = service.resolve("token-1");

        assertEquals("elder-1", result.get("elderId"));
        assertEquals("A-001", result.get("archiveNo"));
        assertEquals("李奶奶", result.get("name"));
    }

    @Test
    void resolveRejectsMissingOrDisabledQrCode() throws Exception {
        RuntimeException blank = assertThrows(RuntimeException.class, () -> service.resolve(""));
        assertTrue(blank.getMessage().contains("二维码无效"));

        when(qrCodeService.resolve("missing")).thenReturn(null);
        assertThrows(RuntimeException.class, () -> service.resolve("missing"));

        QrCodeEntity disabled = new QrCodeEntity();
        disabled.setStatus("DISABLED");
        when(qrCodeService.resolve("disabled")).thenReturn(disabled);
        assertThrows(RuntimeException.class, () -> service.resolve("disabled"));
    }

    @Test
    void delegatesProtectedReadAndVerificationFlows() {
        Map<String, Object> archive = Map.of("summary", "archive");
        Map<String, Object> basicInfo = Map.of("name", "李奶奶");
        List<Map<String, String>> medications = List.of(Map.of("name", "阿司匹林"));
        List<Map<String, Object>> scales = List.of(Map.of("name", "PHQ-9", "score", 4));

        when(data.health("elder-1")).thenReturn(archive);
        when(data.elderDetail("elder-1", false)).thenReturn(basicInfo);
        when(data.medications("elder-1")).thenReturn(medications);
        when(data.scaleSummaries("elder-1")).thenReturn(scales);

        ScanVerificationStatusDto status = new ScanVerificationStatusDto();
        status.setSessionId("session-1");
        when(smsRelayService.getScanVerificationStatus("session-1")).thenReturn(status);
        when(smsRelayService.createIdentityVerificationSession("elder-1", "health", "张三", "13800000000", "500101199001010000"))
                .thenReturn(status);

        SmsRelayService.VerifiedSessionContext context = new SmsRelayService.VerifiedSessionContext();
        context.setSessionId("session-1");
        context.setElderId("elder-1");
        context.setTarget("health");
        when(smsRelayService.authorizeVerifiedSession("session-1", "elder-1", "health")).thenReturn(context);

        QrCodeEntity boundQr = new QrCodeEntity();
        boundQr.setRelayDeviceId("device-1");
        ScanVerificationSessionDto relaySession = new ScanVerificationSessionDto();
        relaySession.setSessionId("relay-session");
        ScanVerificationSessionDto noRelaySession = new ScanVerificationSessionDto();
        noRelaySession.setSessionId("plain-session");
        when(qrCodeService.findCurrentByElder("elder-1")).thenReturn(boundQr);
        when(qrCodeService.findCurrentByElder("elder-2")).thenReturn(null);
        when(smsRelayService.createScanVerificationSession("elder-1", "health", "device-1")).thenReturn(relaySession);
        when(smsRelayService.createScanVerificationSession("elder-2", "health", "")).thenReturn(noRelaySession);

        assertEquals(archive, service.getArchive("elder-1", "session-1"));
        assertEquals(basicInfo, service.getVerifiedBasicInfo("elder-1", "session-1"));
        assertEquals(medications, service.getMedications("elder-1", "session-1"));
        assertEquals(scales, service.getScales("elder-1", "session-1"));
        assertEquals(archive, service.getArchiveData("elder-1"));
        assertEquals(basicInfo, service.getVerifiedBasicInfoData("elder-1"));
        assertEquals(medications, service.getMedicationsData("elder-1"));
        assertEquals(scales, service.getScalesData("elder-1"));
        assertSame(status, service.getVerificationStatus("session-1"));
        assertSame(status, service.verifyByIdentity("elder-1", "health", "张三", "13800000000", "500101199001010000"));
        assertSame(context, service.authorizeSession("session-1", "elder-1", "health"));
        assertEquals("relay-session", service.startVerificationSession("elder-1", "health").getSessionId());
        assertEquals("plain-session", service.startVerificationSession("elder-2", "health").getSessionId());
    }

    @Test
    void cachesResolveAndProtectedReadDataWhenTtlIsEnabled() throws Exception {
        org.springframework.test.util.ReflectionTestUtils.setField(service, "resolveCacheTtlMs", 10_000L);
        org.springframework.test.util.ReflectionTestUtils.setField(service, "protectedReadCacheTtlMs", 10_000L);

        QrCodeEntity entity = new QrCodeEntity();
        entity.setElderId("elder-1");
        entity.setStatus("ENABLED");
        when(qrCodeService.resolve("token-1")).thenReturn(entity);
        when(data.scanBasic("elder-1")).thenReturn(Map.of("archiveNo", "A-001"));
        when(data.health("elder-1")).thenReturn(Map.of("summary", "archive"));
        when(data.elderDetail("elder-1", false)).thenReturn(Map.of("name", "李奶奶"));
        when(data.medications("elder-1")).thenReturn(List.of(Map.of("name", "阿司匹林")));
        when(data.scaleSummaries("elder-1")).thenReturn(List.of(Map.of("name", "PHQ-9", "score", 4)));

        service.resolve("token-1");
        service.resolve("token-1");
        service.getArchiveData("elder-1");
        service.getArchiveData("elder-1");
        service.getVerifiedBasicInfoData("elder-1");
        service.getVerifiedBasicInfoData("elder-1");
        service.getMedicationsData("elder-1");
        service.getMedicationsData("elder-1");
        service.getScalesData("elder-1");
        service.getScalesData("elder-1");

        verify(qrCodeService, times(1)).resolve("token-1");
        verify(data, times(1)).scanBasic("elder-1");
        verify(data, times(1)).health("elder-1");
        verify(data, times(1)).elderDetail("elder-1", false);
        verify(data, times(1)).medications("elder-1");
        verify(data, times(1)).scaleSummaries("elder-1");
    }

    @Test
    void getScaleDetailUsesProtectedFlowAndCachesResults() {
        org.springframework.test.util.ReflectionTestUtils.setField(service, "protectedReadCacheTtlMs", 10_000L);

        Map<String, Object> detail = Map.of("scaleName", "PHQ-9", "score", 5);
        when(data.scaleDetail("elder-1", "PHQ-9")).thenReturn(detail);

        Map<String, Object> first = service.getScaleDetailData("elder-1", "PHQ-9");
        Map<String, Object> second = service.getScaleDetailData("elder-1", "PHQ-9");

        assertEquals("PHQ-9", first.get("scaleName"));
        assertNotSame(first, second);
        verify(data, times(1)).scaleDetail("elder-1", "PHQ-9");

        SmsRelayService.VerifiedSessionContext context = new SmsRelayService.VerifiedSessionContext();
        context.setSessionId("session-1");
        context.setElderId("elder-1");
        context.setTarget("health");
        when(smsRelayService.authorizeVerifiedSession("session-1", "elder-1", "health")).thenReturn(context);

        assertEquals(5, service.getScaleDetail("elder-1", "session-1", "PHQ-9").get("score"));
        verify(smsRelayService).authorizeVerifiedSession("session-1", "elder-1", "health");
    }

    @Test
    void threeArgConstructorUsesLocalFallbackCacheWhenRedisCacheBeanIsAbsent() throws Exception {
        ScanService localService = new ScanService(qrCodeService, data, smsRelayService);
        org.springframework.test.util.ReflectionTestUtils.setField(localService, "resolveCacheTtlMs", 10_000L);

        QrCodeEntity entity = new QrCodeEntity();
        entity.setElderId("elder-2");
        entity.setStatus("ENABLED");
        when(qrCodeService.resolve("token-2")).thenReturn(entity);
        when(data.scanBasic("elder-2")).thenReturn(Map.of("archiveNo", "B-002"));

        Map<String, Object> first = localService.resolve("token-2");
        Map<String, Object> second = localService.resolve("token-2");

        assertEquals("elder-2", first.get("elderId"));
        assertNotSame(first, second);
        verify(qrCodeService, times(1)).resolve("token-2");
        verify(data, times(1)).scanBasic("elder-2");
    }

    @Test
    void privateCacheHelpersCoverListAndBundleFallbackPaths() throws Exception {
        ScanService localService = new ScanService(qrCodeService, data, smsRelayService);
        org.springframework.test.util.ReflectionTestUtils.setField(localService, "protectedReadCacheTtlMs", 10_000L);
        when(data.health("elder-3")).thenReturn(Map.of("summary", "archive"));
        when(data.elderDetail("elder-3", false)).thenReturn(Map.of("name", "李奶奶"));
        when(data.medications("elder-3")).thenReturn(List.of(Map.of("name", "阿司匹林")));
        when(data.scaleSummaries("elder-3")).thenReturn(List.of(Map.of("name", "PHQ-9", "score", 4)));

        Method readBundle = ScanService.class.getDeclaredMethod("readProtectedReadBundle", String.class);
        readBundle.setAccessible(true);
        Object bundle = readBundle.invoke(localService, "elder-3");
        org.junit.jupiter.api.Assertions.assertNotNull(bundle);

        Class<?> supplierType = Class.forName("com.silverlink.care.module.scan.ScanService$ThrowingSupplier");
        Object supplier = Proxy.newProxyInstance(
                supplierType.getClassLoader(),
                new Class[]{supplierType},
                (proxy, method, args) -> List.of(Map.of("name", "列表缓存"))
        );
        Method readCachedList = ScanService.class.getDeclaredMethod(
                "readCachedList",
                String.class,
                long.class,
                Class.forName("com.silverlink.care.infrastructure.cache.SimpleTtlCache"),
                com.fasterxml.jackson.core.type.TypeReference.class,
                supplierType
        );
        readCachedList.setAccessible(true);
        @SuppressWarnings("unchecked")
        List<Map<String, String>> first = (List<Map<String, String>>) readCachedList.invoke(
                localService,
                "scan:list:test",
                10_000L,
                new com.silverlink.care.infrastructure.cache.SimpleTtlCache<>(),
                new com.fasterxml.jackson.core.type.TypeReference<List<Map<String, String>>>() {},
                supplier
        );
        @SuppressWarnings("unchecked")
        List<Map<String, String>> second = (List<Map<String, String>>) readCachedList.invoke(
                service,
                "scan:list:test:redis",
                10_000L,
                new com.silverlink.care.infrastructure.cache.SimpleTtlCache<>(),
                new com.fasterxml.jackson.core.type.TypeReference<List<Map<String, String>>>() {},
                supplier
        );

        assertEquals("列表缓存", first.get(0).get("name"));
        assertEquals("列表缓存", second.get(0).get("name"));
    }
}
