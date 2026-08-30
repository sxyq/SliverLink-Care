package com.silverlink.care.module.nameplate;

import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import com.silverlink.care.module.nameplate.dto.NameplatePreviewResponse;
import com.silverlink.care.module.qrcode.QrCodeEntity;
import com.silverlink.care.module.qrcode.QrCodeIssueResult;
import com.silverlink.care.module.qrcode.QrCodeService;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.PDFTextStripperByArea;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.awt.geom.Rectangle2D;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class NameplateServiceTest {

    private SilverLinkDataService data;
    private QrCodeService qrCodeService;
    private NameplateService service;

    @BeforeEach
    void setUp() {
        data = mock(SilverLinkDataService.class);
        qrCodeService = mock(QrCodeService.class);
        service = new NameplateService(data, qrCodeService);
    }

    @Test
    void previewReturnsBlankTemplatePlaceholders() {
        NameplatePreviewResponse response = service.preview("elder-1", true);

        assertEquals("elder-1", response.getElderId());
        assertEquals("________", response.getFrontName());
        assertEquals("________", response.getFrontAge());
        assertEquals("________", response.getFrontPhone());
        assertEquals("placeholder-qr-token", response.getBackQrToken());
        assertEquals("________", response.getBackArchiveNo());
        verifyNoInteractions(data, qrCodeService);
    }

    @Test
    void previewUsesCurrentQrAndFallsBackForMissingFields() {
        when(data.elderDetail("elder-1", false)).thenReturn(Map.of(
                "name", "李奶奶",
                "age", 78,
                "emergencyContactPhone", "",
                "archiveNo", "A-001"
        ));
        QrCodeEntity current = new QrCodeEntity();
        current.setQrToken("token-1");
        when(qrCodeService.findCurrentByElder("elder-1")).thenReturn(current);
        when(qrCodeService.buildPublicUrl("token-1")).thenReturn("https://public/scan?token=token-1");

        NameplatePreviewResponse response = service.preview("elder-1", false);

        assertEquals("李奶奶", response.getFrontName());
        assertEquals("78", response.getFrontAge());
        assertEquals("未填写", response.getFrontPhone());
        assertEquals("https://public/scan?token=token-1", response.getBackQrToken());
        assertEquals("A-001", response.getBackArchiveNo());
        assertEquals("扫码查看基础信息", response.getBackHint());
    }

    @Test
    void previewGeneratesQrWhenCurrentMissingAndWrapsFailure() throws Exception {
        when(data.elderDetail("elder-2", false)).thenReturn(Map.of(
                "name", "赵爷爷",
                "age", "82",
                "emergencyContactPhone", "13900000000",
                "archiveNo", "A-002"
        ));
        when(qrCodeService.findCurrentByElder("elder-2")).thenReturn(null);
        QrCodeEntity entity = new QrCodeEntity();
        entity.setId("qr-1");
        when(qrCodeService.generateWithToken("elder-2", "A-002"))
                .thenReturn(new QrCodeIssueResult(entity, "token-2", "https://public/scan?token=token-2"));

        NameplatePreviewResponse generated = service.preview("elder-2", false);
        assertEquals("https://public/scan?token=token-2", generated.getBackQrToken());

        when(data.elderDetail("elder-3", false)).thenReturn(Map.of("archiveNo", "A-003"));
        when(qrCodeService.findCurrentByElder("elder-3")).thenReturn(null);
        when(qrCodeService.generateWithToken("elder-3", "A-003")).thenThrow(new RuntimeException("qr failed"));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> service.preview("elder-3", false));
        assertTrue(ex.getMessage().contains("获取二维码失败"));
    }

    @Test
    void previewFallsBackWhenArchiveFieldsAreMissing() throws Exception {
        when(data.elderDetail("elder-4", false)).thenReturn(Map.of());
        when(qrCodeService.findCurrentByElder("elder-4")).thenReturn(null);
        QrCodeEntity entity = new QrCodeEntity();
        entity.setId("qr-4");
        when(qrCodeService.generateWithToken("elder-4", "未生成"))
                .thenReturn(new QrCodeIssueResult(entity, "token-4", "https://public/scan?token=token-4"));

        NameplatePreviewResponse response = service.preview("elder-4", false);

        assertEquals("未填写", response.getFrontName());
        assertEquals("未填写", response.getFrontAge());
        assertEquals("未填写", response.getFrontPhone());
        assertEquals("未生成", response.getBackArchiveNo());
        assertEquals("https://public/scan?token=token-4", response.getBackQrToken());
    }

    @Test
    void previewCachesResolvedResultWithinTtl() throws Exception {
        ReflectionTestUtils.setField(service, "previewCacheTtlMs", 10_000L);
        when(data.elderDetail("elder-cache", false)).thenReturn(Map.of(
                "name", "缓存测试",
                "age", 80,
                "emergencyContactPhone", "13800009999",
                "archiveNo", "A-CACHE"
        ));
        QrCodeEntity current = new QrCodeEntity();
        current.setQrToken("token-cache");
        when(qrCodeService.findCurrentByElder("elder-cache")).thenReturn(current);
        when(qrCodeService.buildPublicUrl("token-cache")).thenReturn("https://public/scan?token=token-cache");

        NameplatePreviewResponse first = service.preview("elder-cache", false);
        NameplatePreviewResponse second = service.preview("elder-cache", false);

        assertEquals("缓存测试", first.getFrontName());
        assertEquals("https://public/scan?token=token-cache", second.getBackQrToken());
        verify(data, times(1)).elderDetail("elder-cache", false);
        verify(qrCodeService, times(1)).findCurrentByElder("elder-cache");
    }

    @Test
    void generateDemoPdfCachesBytesAndReturnsDefensiveCopies() throws IOException {
        ReflectionTestUtils.setField(service, "previewCacheTtlMs", 10_000L);
        ReflectionTestUtils.setField(service, "pdfCacheTtlMs", 10_000L);
        ReflectionTestUtils.setField(service, "qrImageCacheTtlMs", 10_000L);
        when(data.elderDetail("elder-pdf", false)).thenReturn(Map.of(
                "name", "李奶奶",
                "age", 78,
                "emergencyContactPhone", "13800000000",
                "archiveNo", "A-PDF"
        ));
        QrCodeEntity current = new QrCodeEntity();
        current.setQrToken("token-pdf");
        when(qrCodeService.findCurrentByElder("elder-pdf")).thenReturn(current);
        when(qrCodeService.buildPublicUrl("token-pdf")).thenReturn("https://public/scan?token=token-pdf");

        byte[] first = service.generateDemoPdf("elder-pdf");
        byte[] second = service.generateDemoPdf("elder-pdf");

        assertTrue(first.length > 0);
        try (PDDocument document = PDDocument.load(new ByteArrayInputStream(first))) {
            String pdfText = new PDFTextStripper().getText(document);
            String attribution = "重庆医科大学护理学院 空巢养老团";
            assertEquals(2, countOccurrences(pdfText, attribution));
            assertFalse(pdfText.contains("重庆医科大学护理学院 \u94f6\u9f84\u5b88\u62a4\u56e2\u961f"));

            PDFTextStripperByArea areaStripper = new PDFTextStripperByArea();
            areaStripper.addRegion("front", new Rectangle2D.Float(0, 0, 512, 576));
            areaStripper.addRegion("back", new Rectangle2D.Float(512, 0, 512, 576));
            areaStripper.extractRegions(document.getPage(0));
            assertEquals(1, countOccurrences(areaStripper.getTextForRegion("front"), attribution));
            assertEquals(1, countOccurrences(areaStripper.getTextForRegion("back"), attribution));
        }
        assertArrayEquals(first, second);
        assertNotSame(first, second);
        verify(data, times(1)).elderDetail("elder-pdf", false);
        verify(qrCodeService, times(1)).findCurrentByElder("elder-pdf");
    }

    @Test
    void generateDemoPdfWorksWithoutFontResourceCacheAndPreservesAgeSuffix() {
        ReflectionTestUtils.setField(service, "fontResourceCacheEnabled", false);
        ReflectionTestUtils.setField(service, "previewCacheTtlMs", 0L);
        ReflectionTestUtils.setField(service, "pdfCacheTtlMs", 0L);
        when(data.elderDetail("elder-age", false)).thenReturn(Map.of(
                "name", "王爷爷",
                "age", "80岁",
                "emergencyContactPhone", "13900000000",
                "archiveNo", "A-AGE"
        ));
        QrCodeEntity current = new QrCodeEntity();
        current.setQrToken("token-age");
        when(qrCodeService.findCurrentByElder("elder-age")).thenReturn(current);
        when(qrCodeService.buildPublicUrl("token-age")).thenReturn("https://public/scan?token=token-age");

        byte[] pdf = service.generateDemoPdf("elder-age");

        assertTrue(pdf.length > 0);
    }

    private static int countOccurrences(String text, String value) {
        int count = 0;
        int index = 0;
        while ((index = text.indexOf(value, index)) >= 0) {
            count++;
            index += value.length();
        }
        return count;
    }
}
