package com.silverlink.care.module.nameplate;

import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import com.silverlink.care.module.nameplate.dto.NameplatePreviewResponse;
import com.silverlink.care.module.qrcode.QrCodeEntity;
import com.silverlink.care.module.qrcode.QrCodeIssueResult;
import com.silverlink.care.module.qrcode.QrCodeService;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.PDFTextStripperByArea;
import org.apache.pdfbox.text.TextPosition;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

import java.awt.geom.Rectangle2D;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.awt.image.BufferedImage;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
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

    @TempDir
    private Path tempDir;

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

        when(data.elderDetail("elder-1-with-suffix", false)).thenReturn(Map.of(
                "name", "李爷爷",
                "age", "80岁",
                "archiveNo", "A-001-SUFFIX"
        ));
        when(qrCodeService.findCurrentByElder("elder-1-with-suffix")).thenReturn(current);

        NameplatePreviewResponse normalized = service.preview("elder-1-with-suffix", false);

        assertEquals("80", normalized.getFrontAge());
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
                "archiveNo", "A178435885041"
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
            String attribution = "重庆医科大学空巢养老团";
            assertEquals(2, countOccurrences(pdfText, attribution));
            assertFalse(pdfText.contains("重庆医科大学护理学院 空巢养老团"));
            assertFalse(pdfText.contains("重庆医科大学护理学院 \u94f6\u9f84\u5b88\u62a4\u56e2\u961f"));
            assertEquals(2, countOccurrences(pdfText, "智联卡片"));
            assertEquals(2, countOccurrences(pdfText, "智护空巢"));
            assertTrue(pdfText.contains("A178435885041"));

            PDFTextStripperByArea areaStripper = new PDFTextStripperByArea();
            areaStripper.addRegion("front", new Rectangle2D.Double(83, 158, 414, 262));
            areaStripper.addRegion("back", new Rectangle2D.Double(527, 158, 414, 262));
            areaStripper.extractRegions(document.getPage(0));
            assertEquals(1, countOccurrences(areaStripper.getTextForRegion("front"), attribution));
            assertEquals(1, countOccurrences(areaStripper.getTextForRegion("back"), attribution));
            assertEquals(1, countOccurrences(areaStripper.getTextForRegion("front"), "智联卡片"));
            assertEquals(1, countOccurrences(areaStripper.getTextForRegion("back"), "智联卡片"));
            assertEquals(1, countOccurrences(areaStripper.getTextForRegion("front"), "智护空巢"));
            assertEquals(1, countOccurrences(areaStripper.getTextForRegion("back"), "智护空巢"));

            CapturingTextStripper textStripper = new CapturingTextStripper();
            textStripper.getText(document);
            TextBounds nameBounds = findBounds(textStripper.positions, "李奶奶");
            TextBounds ageBounds = findBounds(textStripper.positions, "78");
            TextBounds ageUnitBounds = findBounds(textStripper.positions, "岁");
            assertEquals(263.3f, nameBounds.center(), 2f);
            assertEquals(263.3f, ageBounds.center(), 2f);
            assertTrue(ageUnitBounds.start() > 304f);
            assertEquals(1, countOccurrences(areaStripper.getTextForRegion("front"), "岁"));
        }
        assertArrayEquals(first, second);
        assertNotSame(first, second);
        verify(data, times(1)).elderDetail("elder-pdf", false);
        verify(qrCodeService, times(1)).findCurrentByElder("elder-pdf");
    }

    @Test
    void generateDemoPdfWorksWithoutFontResourceCacheAndPreservesAgeSuffix() throws IOException {
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
        try (PDDocument document = PDDocument.load(new ByteArrayInputStream(pdf))) {
            String pdfText = new PDFTextStripper().getText(document);
            assertTrue(pdfText.contains("80"));
            assertEquals(1, countOccurrences(pdfText, "岁"));
        }
    }

    @Test
    void centersBackPromptWithinTheRightInfoArea() throws IOException {
        ReflectionTestUtils.setField(service, "previewCacheTtlMs", 0L);
        ReflectionTestUtils.setField(service, "pdfCacheTtlMs", 0L);
        ReflectionTestUtils.setField(service, "qrImageCacheTtlMs", 0L);
        when(data.elderDetail("elder-back-prompt", false)).thenReturn(Map.of(
                "name", "李奶奶",
                "age", 78,
                "emergencyContactPhone", "13800000000",
                "archiveNo", "A-BACK-PROMPT"
        ));
        QrCodeEntity current = new QrCodeEntity();
        current.setQrToken("token-back-prompt");
        when(qrCodeService.findCurrentByElder("elder-back-prompt")).thenReturn(current);
        when(qrCodeService.buildPublicUrl("token-back-prompt")).thenReturn("https://public/scan?token=token-back-prompt");

        float pageWidth = 1024f;
        float cardWidth = 410f;
        float gap = 34f;
        float rightX = (pageWidth - (cardWidth * 2f) - gap) / 2f + cardWidth + gap;
        float qrX = rightX + cardWidth * 0.11f;
        float qrSize = cardWidth * 0.27f;
        float expectedCenter = (qrX + qrSize + 12f + 18f + rightX + cardWidth - 18f) / 2f;

        float actualCenter = textCenter(service.generateDemoPdf("elder-back-prompt"), "扫码查看基础信息");

        assertEquals(expectedCenter, actualCenter, 2f);
    }

    @Test
    void reloadsExternalTemplateAndUsesTheNewPositionForPdf() throws Exception {
        ReflectionTestUtils.setField(service, "previewCacheTtlMs", 0L);
        ReflectionTestUtils.setField(service, "pdfCacheTtlMs", 0L);
        ReflectionTestUtils.setField(service, "qrImageCacheTtlMs", 0L);
        when(data.elderDetail("elder-template", false)).thenReturn(Map.of(
                "name", "李奶奶",
                "age", 78,
                "emergencyContactPhone", "13800000000",
                "archiveNo", "A-TEMPLATE"
        ));
        QrCodeEntity current = new QrCodeEntity();
        current.setQrToken("token-template");
        when(qrCodeService.findCurrentByElder("elder-template")).thenReturn(current);
        when(qrCodeService.buildPublicUrl("token-template")).thenReturn("https://public/scan?token=token-template");

        Path config = tempDir.resolve("nameplate-template.json");
        ReflectionTestUtils.setField(service, "templateConfigFile", config.toString());
        Files.writeString(config, "{\"title\":\"智联卡片\",\"frontNameLineXRatio\":0.33}");
        float initialCenter = textCenter(service.generateDemoPdf("elder-template"), "李奶奶");

        Files.writeString(config, "{\"frontNameLineXRatio\":0.4}");
        float updatedCenter = textCenter(service.generateDemoPdf("elder-template"), "李奶奶");

        assertEquals(263.3f, initialCenter, 2f);
        assertEquals(292f, updatedCenter, 2f);
    }

    @Test
    void positionsFrontCareMarkNearTheRightBottomReferencePoint() throws Exception {
        ReflectionTestUtils.setField(service, "previewCacheTtlMs", 0L);
        ReflectionTestUtils.setField(service, "pdfCacheTtlMs", 0L);
        ReflectionTestUtils.setField(service, "qrImageCacheTtlMs", 0L);
        when(data.elderDetail("elder-care-mark", false)).thenReturn(Map.of(
                "name", "李奶奶",
                "age", 78,
                "emergencyContactPhone", "13800000000",
                "archiveNo", "A-CARE-MARK"
        ));
        QrCodeEntity current = new QrCodeEntity();
        current.setQrToken("token-care-mark");
        when(qrCodeService.findCurrentByElder("elder-care-mark")).thenReturn(current);
        when(qrCodeService.buildPublicUrl("token-care-mark")).thenReturn("https://public/scan?token=token-care-mark");

        Path config = tempDir.resolve("nameplate-care-mark.json");
        ReflectionTestUtils.setField(service, "templateConfigFile", config.toString());
        Files.writeString(config, "{}");
        float referenceCenter = careMarkCenter(service.generateDemoPdf("elder-care-mark"), 438);

        Files.writeString(config, "{\"frontCareMarkXRatio\":0.70}");
        float shiftedCenter = careMarkCenter(service.generateDemoPdf("elder-care-mark"), 372);

        assertEquals(436f, referenceCenter, 5f);
        assertEquals(370f, shiftedCenter, 5f);
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

    private static TextBounds findBounds(List<TextPosition> positions, String value) {
        for (int start = 0; start <= positions.size() - value.length(); start++) {
            boolean matches = true;
            for (int offset = 0; offset < value.length(); offset++) {
                if (!value.substring(offset, offset + 1).equals(positions.get(start + offset).getUnicode())) {
                    matches = false;
                    break;
                }
            }
            if (matches) {
                TextPosition first = positions.get(start);
                TextPosition last = positions.get(start + value.length() - 1);
                return new TextBounds(first.getXDirAdj(), last.getXDirAdj() + last.getWidthDirAdj());
            }
        }
        throw new AssertionError("PDF text not found: " + value);
    }

    private static float textCenter(byte[] pdf, String value) throws IOException {
        try (PDDocument document = PDDocument.load(new ByteArrayInputStream(pdf))) {
            CapturingTextStripper textStripper = new CapturingTextStripper();
            textStripper.getText(document);
            return findBounds(textStripper.positions, value).center();
        }
    }

    private static float careMarkCenter(byte[] pdf, int expectedCenter) throws IOException {
        try (PDDocument document = PDDocument.load(new ByteArrayInputStream(pdf))) {
            BufferedImage image = new org.apache.pdfbox.rendering.PDFRenderer(document).renderImageWithDPI(0, 72);
            long xTotal = 0;
            int pixels = 0;
            for (int y = 350; y <= 400; y++) {
                for (int x = expectedCenter - 35; x <= expectedCenter + 35; x++) {
                    int rgb = image.getRGB(x, y);
                    int red = (rgb >>> 16) & 0xff;
                    int green = (rgb >>> 8) & 0xff;
                    int blue = rgb & 0xff;
                    if (red < 110 && green > red + 30 && blue > red + 20 && green < 190) {
                        xTotal += x;
                        pixels++;
                    }
                }
            }
            if (pixels == 0) {
                throw new AssertionError("front care mark pixels not found");
            }
            return (float) xTotal / pixels;
        }
    }

    private record TextBounds(float start, float end) {
        private float center() {
            return (start + end) / 2f;
        }
    }

    private static final class CapturingTextStripper extends PDFTextStripper {
        private final List<TextPosition> positions = new ArrayList<>();

        private CapturingTextStripper() throws IOException {
            setSortByPosition(true);
        }

        @Override
        protected void writeString(String text, List<TextPosition> textPositions) throws IOException {
            positions.addAll(textPositions);
            super.writeString(text, textPositions);
        }
    }
}
