package com.silverlink.care.module.nameplate;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.silverlink.care.infrastructure.cache.SimpleTtlCache;
import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import com.silverlink.care.module.nameplate.dto.NameplatePreviewResponse;
import com.silverlink.care.module.qrcode.QrCodeEntity;
import com.silverlink.care.module.qrcode.QrCodeIssueResult;
import com.silverlink.care.module.qrcode.QrCodeService;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Base64;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import javax.imageio.ImageIO;

@Service
public class NameplateService {

    private static final String FOOTER_ATTRIBUTION = "重庆医科大学护理学院 银龄守护团队";
    private static final Color INK = new Color(5, 74, 95);
    private static final Color MUTED_INK = new Color(82, 114, 124);
    private static final Color MINT = new Color(222, 241, 238);
    private static final Color MINT_DEEP = new Color(172, 213, 207);
    private static final Color LINE = new Color(129, 185, 178);
    private static final Color GOLD = new Color(236, 174, 68);
    private static final Color BORDER = new Color(211, 225, 226);
    private static volatile byte[] cachedFontBytes;

    private final SilverLinkDataService data;
    private final QrCodeService qrCodeService;
    private final SimpleTtlCache<String, NameplatePreviewResponse> previewCache = new SimpleTtlCache<>();
    private final SimpleTtlCache<String, byte[]> pdfCache = new SimpleTtlCache<>();
    private final SimpleTtlCache<String, BufferedImage> qrImageCache = new SimpleTtlCache<>();

    @Value("${silverlink.nameplate.preview-cache-ttl-ms:15000}")
    private long previewCacheTtlMs;

    @Value("${silverlink.nameplate.pdf-cache-ttl-ms:30000}")
    private long pdfCacheTtlMs;

    @Value("${silverlink.nameplate.qr-image-cache-ttl-ms:60000}")
    private long qrImageCacheTtlMs;

    @Value("${silverlink.nameplate.font-resource-cache-enabled:true}")
    private boolean fontResourceCacheEnabled;

    public NameplateService(SilverLinkDataService data, QrCodeService qrCodeService) {
        this.data = data;
        this.qrCodeService = qrCodeService;
    }

    public NameplatePreviewResponse preview(String elderId, boolean blankTemplate) {
        if (blankTemplate) {
            NameplatePreviewResponse resp = new NameplatePreviewResponse();
            resp.setElderId(elderId);
            resp.setBlankTemplate(true);
            resp.setFrontName("________");
            resp.setFrontAge("________");
            resp.setFrontPhone("________");
            resp.setBackQrToken("placeholder-qr-token");
            resp.setBackQrUrl("");
            resp.setBackQrPayload("placeholder-qr-token");
            resp.setBackQrImageBase64("");
            resp.setBackArchiveNo("________");
            resp.setBackHint("扫码查看基础信息");
            resp.setPdfPreviewImageBase64(renderPdfPreviewImageBase64(resp));
            return resp;
        }
        if (previewCacheTtlMs > 0) {
            NameplatePreviewResponse cached = previewCache.getOrLoad(elderId, previewCacheTtlMs, () -> loadPreview(elderId));
            return copyPreview(cached);
        }
        return copyPreview(loadPreview(elderId));
    }

    private NameplatePreviewResponse loadPreview(String elderId) {
        NameplatePreviewResponse resp = new NameplatePreviewResponse();
        resp.setElderId(elderId);
        resp.setBlankTemplate(false);
        Map<String, Object> elder = data.elderDetail(elderId, false);
        resp.setFrontName(stringValue(elder.get("name"), "未填写"));
        resp.setFrontAge(stringValue(elder.get("age"), "未填写"));
        resp.setFrontPhone(stringValue(elder.get("emergencyContactPhone"), "未填写"));
        String qrUrl = resolvePublicQrUrl(elderId, stringValue(elder.get("archiveNo"), "未生成"));
        resp.setBackQrToken(qrUrl);
        resp.setBackQrUrl(qrUrl);
        resp.setBackQrPayload(qrUrl);
        resp.setBackQrImageBase64(qrCodeService.renderQrImageBase64(qrUrl, 300));
        resp.setBackArchiveNo(stringValue(elder.get("archiveNo"), "未生成"));
        resp.setBackHint("扫码查看基础信息");
        resp.setPdfPreviewImageBase64(renderPdfPreviewImageBase64(resp));
        if (previewCacheTtlMs > 0) {
            previewCache.put(elderId, copyPreview(resp), previewCacheTtlMs);
        }
        return resp;
    }

    public byte[] generateDemoPdf(String elderId) {
        NameplatePreviewResponse preview = preview(elderId, false);
        String pdfCacheKey = buildPdfCacheKey(elderId, preview);
        if (pdfCacheTtlMs > 0) {
            byte[] cachedPdf = pdfCache.getOrLoad(pdfCacheKey, pdfCacheTtlMs, () -> renderPdfBytes(preview));
            return Arrays.copyOf(cachedPdf, cachedPdf.length);
        }
        return renderPdfBytes(preview);
    }

    private byte[] renderPdfBytes(NameplatePreviewResponse preview) {
        try (PDDocument document = new PDDocument();
             InputStream fontStream = new ByteArrayInputStream(loadFontBytes())) {
            PDFont font = PDType0Font.load(document, fontStream, true);
            BufferedImage qrImage = renderQrImageCached(preview.getBackQrToken(), 300);

            PDPage page = new PDPage(new PDRectangle(1024, 576));
            document.addPage(page);

            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                drawPage(document, content, page, font, preview, qrImage);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("生成名牌 PDF 失败", e);
        }
    }

    private void drawPage(
            PDDocument document,
            PDPageContentStream content,
            PDPage page,
            PDFont font,
            NameplatePreviewResponse preview,
            BufferedImage qrImage
    ) throws IOException {
        float pageWidth = page.getMediaBox().getWidth();
        float cardWidth = 410f;
        float cardHeight = 258f;
        float gap = 34f;
        float leftX = (pageWidth - (cardWidth * 2f) - gap) / 2f;
        float rightX = leftX + cardWidth + gap;
        float cardY = 160f;

        drawCardBase(content, leftX, cardY, cardWidth, cardHeight, false);
        drawCardBase(content, rightX, cardY, cardWidth, cardHeight, true);
        drawFrontCard(content, font, leftX, cardY, cardWidth, cardHeight, preview);
        drawBackCard(document, content, font, rightX, cardY, cardWidth, cardHeight, preview, qrImage);
    }

    private void drawCardBase(PDPageContentStream content, float x, float y, float width, float height, boolean mirrored)
            throws IOException {
        content.setNonStrokingColor(new Color(228, 235, 235));
        addRoundRect(content, x + 3f, y - 4f, width, height, 18f);
        content.fill();

        content.setNonStrokingColor(Color.WHITE);
        addRoundRect(content, x, y, width, height, 18f);
        content.fill();

        content.saveGraphicsState();
        addRoundRect(content, x, y, width, height, 18f);
        content.clip();

        content.setNonStrokingColor(MINT);
        if (mirrored) {
            drawTopRightWave(content, x, y, width, height);
        } else {
            drawTopLeftWave(content, x, y, width, height);
        }
        drawBottomWave(content, x, y, width, height);
        content.restoreGraphicsState();

        content.setStrokingColor(BORDER);
        content.setLineWidth(1.1f);
        addRoundRect(content, x, y, width, height, 18f);
        content.stroke();

        content.setNonStrokingColor(new Color(216, 211, 202));
        addRoundRect(content, x + width * 0.445f, y + height - 27f, width * 0.12f, 14f, 7f);
        content.fill();
        content.setStrokingColor(new Color(177, 168, 154));
        content.setLineWidth(0.8f);
        addRoundRect(content, x + width * 0.445f, y + height - 27f, width * 0.12f, 14f, 7f);
        content.stroke();
    }

    private void drawFrontCard(
            PDPageContentStream content,
            PDFont font,
            float x,
            float y,
            float width,
            float height,
            NameplatePreviewResponse preview
    ) throws IOException {
        drawCenteredText(content, font, 38f, "智联名牌", x + width / 2f, y + height * 0.69f, INK);
        drawDividerWithHealthIcon(content, x + width / 2f, y + height * 0.59f, 56f, MINT_DEEP);

        float labelX = x + width * 0.14f;
        float valueX = x + width * 0.33f;
        drawLabeledValue(content, font, "姓名：", safe(preview.getFrontName()), labelX, valueX, y + height * 0.43f, 17f, 86f);
        drawLabeledValue(content, font, "年龄：", formatAge(preview.getFrontAge()), labelX, valueX, y + height * 0.30f, 17f, 86f);
        drawLabeledValue(content, font, "联系电话（亲属）：", safe(preview.getFrontPhone()), x + width * 0.09f, x + width * 0.47f, y + height * 0.17f, 15.5f, 128f);

        drawCareMark(content, x + width * 0.76f, y + height * 0.075f);
        drawCenteredText(content, font, 8.5f, FOOTER_ATTRIBUTION, x + width * 0.48f, y + height * 0.032f, MUTED_INK);
    }

    private void drawBackCard(
            PDDocument document,
            PDPageContentStream content,
            PDFont font,
            float x,
            float y,
            float width,
            float height,
            NameplatePreviewResponse preview,
            BufferedImage qrImage
    ) throws IOException {
        drawCenteredText(content, font, 25f, "智联名牌", x + width / 2f, y + height * 0.82f, INK);
        drawDividerWithHealthIcon(content, x + width / 2f, y + height * 0.75f, 42f, MINT_DEEP);

        float qrX = x + width * 0.11f;
        float qrY = y + height * 0.32f;
        float qrSize = width * 0.27f;
        content.setNonStrokingColor(Color.WHITE);
        addRoundRect(content, qrX - 12f, qrY - 12f, qrSize + 24f, qrSize + 24f, 12f);
        content.fill();
        content.setStrokingColor(new Color(174, 178, 178));
        content.setLineWidth(1.6f);
        addRoundRect(content, qrX - 12f, qrY - 12f, qrSize + 24f, qrSize + 24f, 12f);
        content.stroke();
        drawBackgroundImage(document, content, qrImage, qrX, qrY, qrSize, qrSize);

        drawText(content, font, 22f, "扫码查看基础信息", x + width * 0.50f, y + height * 0.46f, INK);
        drawDividerWithHealthIcon(content, x + width * 0.68f, y + height * 0.35f, 44f, GOLD);

        drawText(content, font, 17f, "健康档案编号：", x + width * 0.15f, y + height * 0.13f, INK);
        drawText(content, font, 15f, safe(preview.getBackArchiveNo()), x + width * 0.43f, y + height * 0.13f, INK);
        drawLine(content, x + width * 0.43f, y + height * 0.105f, x + width * 0.70f, y + height * 0.105f, INK, 0.9f);
        drawCenteredText(content, font, 8.5f, FOOTER_ATTRIBUTION, x + width * 0.5f, y + height * 0.032f, MUTED_INK);
    }

    private void drawBackgroundImage(
            PDDocument document,
            PDPageContentStream content,
            BufferedImage image,
            float x,
            float y,
            float width,
            float height
    ) throws IOException {
        PDImageXObject object = LosslessFactory.createFromImage(document, image);
        content.drawImage(object, x, y, width, height);
    }

    private void drawLabeledValue(
            PDPageContentStream content,
            PDFont font,
            String label,
            String value,
            float labelX,
            float valueX,
            float baseline,
            float size,
            float lineWidth
    ) throws IOException {
        drawText(content, font, size, label, labelX, baseline, INK);
        drawText(content, font, size - 1f, value, valueX, baseline, INK);
        drawLine(content, valueX - 2f, baseline - 6f, valueX + lineWidth, baseline - 6f, INK, 0.9f);
    }

    private void drawDividerWithHealthIcon(PDPageContentStream content, float centerX, float y, float lineLength, Color iconColor)
            throws IOException {
        drawLine(content, centerX - lineLength - 22f, y, centerX - 20f, y, LINE, 1f);
        drawLine(content, centerX + 20f, y, centerX + lineLength + 22f, y, LINE, 1f);
        content.setNonStrokingColor(iconColor);
        addCircle(content, centerX, y + 1f, 10f);
        content.fill();
        content.setStrokingColor(Color.WHITE);
        content.setLineWidth(2.6f);
        drawLine(content, centerX - 5f, y + 1f, centerX + 5f, y + 1f, Color.WHITE, 2.6f);
        drawLine(content, centerX, y - 4f, centerX, y + 6f, Color.WHITE, 2.6f);
    }

    private void drawCareMark(PDPageContentStream content, float x, float y) throws IOException {
        content.setStrokingColor(new Color(55, 139, 130));
        content.setLineWidth(2.2f);
        content.moveTo(x - 18f, y + 5f);
        content.curveTo(x - 15f, y + 22f, x - 3f, y + 18f, x, y + 8f);
        content.curveTo(x + 3f, y + 18f, x + 15f, y + 22f, x + 18f, y + 5f);
        content.stroke();
        content.setNonStrokingColor(new Color(55, 139, 130));
        addCircle(content, x, y + 21f, 6f);
        content.fill();
        content.setStrokingColor(new Color(55, 139, 130));
        content.setLineWidth(2f);
        drawLine(content, x - 14f, y, x - 7f, y + 8f, new Color(55, 139, 130), 2f);
        drawLine(content, x + 14f, y, x + 7f, y + 8f, new Color(55, 139, 130), 2f);
        drawLine(content, x - 7f, y + 8f, x, y + 2f, new Color(55, 139, 130), 2f);
        drawLine(content, x + 7f, y + 8f, x, y + 2f, new Color(55, 139, 130), 2f);
    }

    private void drawTopLeftWave(PDPageContentStream content, float x, float y, float width, float height) throws IOException {
        content.moveTo(x, y + height);
        content.lineTo(x + width * 0.45f, y + height);
        content.curveTo(x + width * 0.28f, y + height * 0.94f, x + width * 0.18f, y + height * 0.78f, x, y + height * 0.70f);
        content.closePath();
        content.fill();
    }

    private void drawTopRightWave(PDPageContentStream content, float x, float y, float width, float height) throws IOException {
        content.moveTo(x + width * 0.66f, y + height);
        content.lineTo(x + width, y + height);
        content.lineTo(x + width, y + height * 0.70f);
        content.curveTo(x + width * 0.88f, y + height * 0.78f, x + width * 0.80f, y + height * 0.94f, x + width * 0.66f, y + height);
        content.closePath();
        content.fill();
    }

    private void drawBottomWave(PDPageContentStream content, float x, float y, float width, float height) throws IOException {
        content.moveTo(x, y);
        content.lineTo(x + width, y);
        content.lineTo(x + width, y + height * 0.26f);
        content.curveTo(x + width * 0.72f, y + height * 0.11f, x + width * 0.50f, y + height * 0.36f, x + width * 0.26f, y + height * 0.12f);
        content.curveTo(x + width * 0.15f, y + height * 0.03f, x + width * 0.08f, y + height * 0.10f, x, y + height * 0.14f);
        content.closePath();
        content.fill();
    }

    private void addRoundRect(PDPageContentStream content, float x, float y, float width, float height, float radius) throws IOException {
        float k = 0.55228475f;
        float c = radius * k;
        content.moveTo(x + radius, y);
        content.lineTo(x + width - radius, y);
        content.curveTo(x + width - radius + c, y, x + width, y + radius - c, x + width, y + radius);
        content.lineTo(x + width, y + height - radius);
        content.curveTo(x + width, y + height - radius + c, x + width - radius + c, y + height, x + width - radius, y + height);
        content.lineTo(x + radius, y + height);
        content.curveTo(x + radius - c, y + height, x, y + height - radius + c, x, y + height - radius);
        content.lineTo(x, y + radius);
        content.curveTo(x, y + radius - c, x + radius - c, y, x + radius, y);
        content.closePath();
    }

    private void addCircle(PDPageContentStream content, float cx, float cy, float radius) throws IOException {
        float k = 0.55228475f;
        float c = radius * k;
        content.moveTo(cx + radius, cy);
        content.curveTo(cx + radius, cy + c, cx + c, cy + radius, cx, cy + radius);
        content.curveTo(cx - c, cy + radius, cx - radius, cy + c, cx - radius, cy);
        content.curveTo(cx - radius, cy - c, cx - c, cy - radius, cx, cy - radius);
        content.curveTo(cx + c, cy - radius, cx + radius, cy - c, cx + radius, cy);
        content.closePath();
    }

    private void drawLine(PDPageContentStream content, float x1, float y1, float x2, float y2, Color color, float width)
            throws IOException {
        content.setStrokingColor(color);
        content.setLineWidth(width);
        content.moveTo(x1, y1);
        content.lineTo(x2, y2);
        content.stroke();
    }

    private BufferedImage renderQrImage(String value, int size) {
        try {
            Map<EncodeHintType, Object> hints = new HashMap<>();
            hints.put(EncodeHintType.MARGIN, 1);
            BitMatrix matrix = new MultiFormatWriter().encode(value, BarcodeFormat.QR_CODE, size, size, hints);
            BufferedImage image = MatrixToImageWriter.toBufferedImage(matrix);
            BufferedImage target = new BufferedImage(size, size, BufferedImage.TYPE_INT_RGB);
            var graphics = target.createGraphics();
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            graphics.setColor(Color.WHITE);
            graphics.fillRect(0, 0, size, size);
            graphics.drawImage(image, 0, 0, size, size, null);
            graphics.dispose();
            return target;
        } catch (WriterException e) {
            throw new IllegalStateException("生成二维码失败", e);
        }
    }

    private BufferedImage renderQrImageCached(String value, int size) {
        String cacheKey = value + "|" + size;
        if (qrImageCacheTtlMs > 0) {
            return qrImageCache.getOrLoad(cacheKey, qrImageCacheTtlMs, () -> renderQrImage(value, size));
        }
        return renderQrImage(value, size);
    }

    private byte[] loadFontBytes() throws IOException {
        if (!fontResourceCacheEnabled) {
            try (InputStream fontStream = NameplateService.class.getResourceAsStream("/fonts/ArialUnicode.ttf")) {
                if (fontStream == null) {
                    throw new IllegalStateException("缺少中文字体资源 ArialUnicode.ttf");
                }
                return fontStream.readAllBytes();
            }
        }
        byte[] bytes = cachedFontBytes;
        if (bytes != null) {
            return bytes;
        }
        synchronized (NameplateService.class) {
            if (cachedFontBytes == null) {
                try (InputStream fontStream = NameplateService.class.getResourceAsStream("/fonts/ArialUnicode.ttf")) {
                    if (fontStream == null) {
                        throw new IllegalStateException("缺少中文字体资源 ArialUnicode.ttf");
                    }
                    cachedFontBytes = fontStream.readAllBytes();
                }
            }
            return cachedFontBytes;
        }
    }

    private String buildPdfCacheKey(String elderId, NameplatePreviewResponse preview) {
        return elderId + "|" + safe(preview.getFrontName()) + "|" + safe(preview.getFrontAge()) + "|"
                + safe(preview.getFrontPhone()) + "|" + safe(preview.getBackArchiveNo()) + "|"
                + safe(preview.getBackQrToken()) + "|" + safe(preview.getBackHint());
    }

    private String renderPdfPreviewImageBase64(NameplatePreviewResponse preview) {
        byte[] pdfBytes = renderPdfBytes(preview);
        try (PDDocument document = PDDocument.load(pdfBytes);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            BufferedImage pageImage = new PDFRenderer(document).renderImageWithDPI(0, 144);
            ImageIO.write(pageImage, "png", output);
            return Base64.getEncoder().encodeToString(output.toByteArray());
        } catch (IOException e) {
            throw new IllegalStateException("生成名牌预览图失败", e);
        }
    }

    private NameplatePreviewResponse copyPreview(NameplatePreviewResponse source) {
        NameplatePreviewResponse copy = new NameplatePreviewResponse();
        copy.setElderId(source.getElderId());
        copy.setArchiveNo(source.getArchiveNo());
        copy.setFrontName(source.getFrontName());
        copy.setFrontAge(source.getFrontAge());
        copy.setFrontPhone(source.getFrontPhone());
        copy.setBackQrToken(source.getBackQrToken());
        copy.setBackQrUrl(source.getBackQrUrl());
        copy.setBackQrPayload(source.getBackQrPayload());
        copy.setBackQrImageBase64(source.getBackQrImageBase64());
        copy.setBackArchiveNo(source.getBackArchiveNo());
        copy.setBackHint(source.getBackHint());
        copy.setPdfPreviewImageBase64(source.getPdfPreviewImageBase64());
        copy.setBlankTemplate(source.isBlankTemplate());
        return copy;
    }

    private String resolvePublicQrUrl(String elderId, String archiveNo) {
        try {
            QrCodeEntity current = qrCodeService.findCurrentByElder(elderId);
            if (current != null && current.getQrToken() != null && !current.getQrToken().isBlank()) {
                return qrCodeService.buildPublicUrl(current.getQrToken());
            }
            QrCodeIssueResult issued = qrCodeService.generateWithToken(elderId, archiveNo);
            return issued.getUrl();
        } catch (Exception e) {
            throw new IllegalStateException("获取二维码失败", e);
        }
    }

    private void drawCenteredText(PDPageContentStream content, PDFont font, float size, String text, float centerX, float y, Color color)
            throws IOException {
        float textWidth = font.getStringWidth(text) / 1000f * size;
        drawText(content, font, size, text, centerX - (textWidth / 2f), y, color);
    }

    private void drawText(PDPageContentStream content, PDFont font, float size, String text, float x, float y, Color color)
            throws IOException {
        content.beginText();
        content.setFont(font, size);
        content.setNonStrokingColor(color);
        content.newLineAtOffset(x, y);
        content.showText(text);
        content.endText();
    }

    private String formatAge(String age) {
        if (age == null || age.isBlank() || "未填写".equals(age)) {
            return "未填写";
        }
        return age.endsWith("岁") ? age : age + "岁";
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "未填写" : value;
    }

    private String stringValue(Object value, String fallback) {
        if (value == null) {
            return fallback;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() || "null".equalsIgnoreCase(text) ? fallback : text;
    }
}
