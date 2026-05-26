package com.silverlink.care.module.nameplate;

import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import com.silverlink.care.module.nameplate.dto.NameplatePreviewResponse;
import com.silverlink.care.module.qrcode.QrCodeEntity;
import com.silverlink.care.module.qrcode.QrCodeIssueResult;
import com.silverlink.care.module.qrcode.QrCodeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
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
}
