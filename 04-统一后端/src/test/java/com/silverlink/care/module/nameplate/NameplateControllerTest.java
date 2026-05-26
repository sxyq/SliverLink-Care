package com.silverlink.care.module.nameplate;

import com.silverlink.care.module.nameplate.dto.NameplatePdfRequest;
import com.silverlink.care.module.nameplate.dto.NameplatePreviewResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class NameplateControllerTest {

    private NameplateService nameplateService;
    private NameplateController controller;

    @BeforeEach
    void setUp() {
        nameplateService = mock(NameplateService.class);
        controller = new NameplateController(nameplateService);
    }

    @Test
    void previewDelegatesToService() {
        NameplatePreviewResponse response = new NameplatePreviewResponse();
        response.setElderId("elder-1");
        response.setBlankTemplate(true);
        when(nameplateService.preview("elder-1", true)).thenReturn(response);

        var result = controller.preview("elder-1", true);

        assertEquals("elder-1", result.getData().getElderId());
        assertEquals(true, result.getData().isBlankTemplate());
    }

    @Test
    void pdfReturnsAttachmentHeadersAndBody() {
        byte[] pdf = "%PDF-demo".getBytes();
        when(nameplateService.generateDemoPdf("elder-1")).thenReturn(pdf);

        var response = controller.pdf("elder-1");

        assertEquals(MediaType.APPLICATION_PDF, response.getHeaders().getContentType());
        assertEquals("attachment; filename=nameplate-elder-1.pdf", response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION));
        assertArrayEquals(pdf, response.getBody());
    }

    @Test
    void batchPdfReturnsCountForNullAndNonNullIds() {
        NameplatePdfRequest empty = new NameplatePdfRequest();
        assertEquals("0", controller.batchPdf(empty).getData().get("count"));

        NameplatePdfRequest request = new NameplatePdfRequest();
        request.setElderIds(List.of("elder-1", "elder-2"));
        request.setBlankTemplate(true);

        var result = controller.batchPdf(request);

        assertEquals("2", result.getData().get("count"));
        assertEquals("批量 PDF 生成 demo", result.getData().get("note"));
    }
}
