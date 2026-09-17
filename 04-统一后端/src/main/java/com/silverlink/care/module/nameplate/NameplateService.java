package com.silverlink.care.module.nameplate;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.apache.pdfbox.pdmodel.graphics.state.RenderingMode;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.awt.Font;
import java.awt.FontFormatException;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.font.FontRenderContext;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import javax.imageio.ImageIO;

@Service
public class NameplateService {

    private static final Logger log = LoggerFactory.getLogger(NameplateService.class);
    private static final String FOOTER_ATTRIBUTION = "重庆医科大学空巢养老团";
    private static volatile byte[] cachedFontBytes;
    private static volatile String cachedFontKey;
    private static volatile Font cachedTitleFont;
    private static final Map<String, BufferedImage> titleImageCache = new ConcurrentHashMap<>();
    private static final Map<String, Float> rasterizedTextCenterOffsetCache = new ConcurrentHashMap<>();

    private final SilverLinkDataService data;
    private final QrCodeService qrCodeService;
    private final ObjectMapper templateObjectMapper = new ObjectMapper();
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

    @Value("${silverlink.nameplate.template-config-file:}")
    private String templateConfigFile;

    private volatile TemplateSnapshot templateSnapshot = TemplateSnapshot.builtIn();

    public NameplateService(SilverLinkDataService data, QrCodeService qrCodeService) {
        this.data = data;
        this.qrCodeService = qrCodeService;
    }

    public NameplatePreviewResponse preview(String elderId, boolean blankTemplate) {
        return preview(elderId, blankTemplate, templateSnapshot());
    }

    private NameplatePreviewResponse preview(String elderId, boolean blankTemplate, TemplateSnapshot template) {
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
            resp.setPdfPreviewImageBase64(renderPdfPreviewImageBase64(resp, template.config()));
            return resp;
        }
        if (previewCacheTtlMs > 0) {
            String cacheKey = elderId + "|" + template.version();
            NameplatePreviewResponse cached = previewCache.getOrLoad(cacheKey, previewCacheTtlMs, () -> loadPreview(elderId, template.config()));
            return copyPreview(cached);
        }
        return copyPreview(loadPreview(elderId, template.config()));
    }

    private NameplatePreviewResponse loadPreview(String elderId, NameplateTemplateConfig template) {
        NameplatePreviewResponse resp = new NameplatePreviewResponse();
        resp.setElderId(elderId);
        resp.setBlankTemplate(false);
        Map<String, Object> elder = data.elderDetail(elderId, false);
        resp.setFrontName(stringValue(elder.get("name"), "未填写"));
        resp.setFrontAge(formatAgeValue(stringValue(elder.get("age"), "未填写")));
        resp.setFrontPhone(stringValue(elder.get("emergencyContactPhone"), "未填写"));
        String qrUrl = resolvePublicQrUrl(elderId, stringValue(elder.get("archiveNo"), "未生成"));
        resp.setBackQrToken(qrUrl);
        resp.setBackQrUrl(qrUrl);
        resp.setBackQrPayload(qrUrl);
        resp.setBackQrImageBase64(qrCodeService.renderQrImageBase64(qrUrl, 300));
        resp.setBackArchiveNo(stringValue(elder.get("archiveNo"), "未生成"));
        resp.setBackHint("扫码查看基础信息");
        resp.setPdfPreviewImageBase64(renderPdfPreviewImageBase64(resp, template));
        return resp;
    }

    public byte[] generateDemoPdf(String elderId) {
        TemplateSnapshot template = templateSnapshot();
        NameplatePreviewResponse preview = preview(elderId, false, template);
        String pdfCacheKey = buildPdfCacheKey(elderId, preview, template.version());
        if (pdfCacheTtlMs > 0) {
            byte[] cachedPdf = pdfCache.getOrLoad(pdfCacheKey, pdfCacheTtlMs, () -> renderPdfBytes(preview, template.config()));
            return Arrays.copyOf(cachedPdf, cachedPdf.length);
        }
        return renderPdfBytes(preview, template.config());
    }

    private byte[] renderPdfBytes(NameplatePreviewResponse preview, NameplateTemplateConfig template) {
        try (PDDocument document = new PDDocument();
             InputStream fontStream = new ByteArrayInputStream(loadFontBytes(template.fontResource))) {
            PDFont font = PDType0Font.load(document, fontStream, true);
            BufferedImage qrImage = renderQrImageCached(preview.getBackQrToken(), 300);

            PDPage page = new PDPage(new PDRectangle(1024, 576));
            document.addPage(page);

            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                drawPage(document, content, page, font, preview, qrImage, template);
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
            BufferedImage qrImage,
            NameplateTemplateConfig template
    ) throws IOException {
        float pageWidth = page.getMediaBox().getWidth();
        float cardWidth = 410f;
        float cardHeight = 258f;
        float gap = 34f;
        float leftX = (pageWidth - (cardWidth * 2f) - gap) / 2f;
        float rightX = leftX + cardWidth + gap;
        float cardY = 160f;

        drawCardBase(content, leftX, cardY, cardWidth, cardHeight, false, template);
        drawCardBase(content, rightX, cardY, cardWidth, cardHeight, true, template);
        drawFrontCard(document, content, font, leftX, cardY, cardWidth, cardHeight, preview, template);
        drawBackCard(document, content, font, rightX, cardY, cardWidth, cardHeight, preview, qrImage, template);
    }

    private void drawCardBase(
            PDPageContentStream content,
            float x,
            float y,
            float width,
            float height,
            boolean mirrored,
            NameplateTemplateConfig template
    )
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

        content.setNonStrokingColor(color(template.mint));
        if (mirrored) {
            drawTopRightWave(content, x, y, width, height);
        } else {
            drawTopLeftWave(content, x, y, width, height);
        }
        drawBottomWave(content, x, y, width, height);
        content.restoreGraphicsState();

        content.setStrokingColor(color(template.border));
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
            PDDocument document,
            PDPageContentStream content,
            PDFont font,
            float x,
            float y,
            float width,
            float height,
            NameplatePreviewResponse preview,
            NameplateTemplateConfig template
    ) throws IOException {
        Color ink = color(template.ink);
        Color mutedInk = color(template.mutedInk);
        Color line = color(template.line);
        Color mintDeep = color(template.mintDeep);
        drawHorizontalBrand(document, content, font, 38f, 16f, template.title, template.subtitle,
                x + width / 2f, y + height * 0.69f, template.frontBrandGap, ink, mutedInk);
        drawDividerWithHealthIcon(content, x + width / 2f, y + height * 0.55f, 56f, mintDeep, line);

        float labelX = x + width * 0.14f;
        float lineX = x + width * template.frontNameLineXRatio;
        float lineWidth = template.frontLineWidth;
        drawCenteredLabeledValue(content, font, "姓名：", safe(preview.getFrontName()), labelX, lineX, y + height * template.frontNameBaselineRatio, 17f, lineWidth, ink);
        float ageBaseline = y + height * template.frontAgeBaselineRatio;
        drawCenteredLabeledValue(content, font, "年龄：", formatAgeValue(preview.getFrontAge()), labelX, lineX, ageBaseline, 17f, lineWidth, ink);
        drawText(content, font, 17f, "岁", lineX + lineWidth + template.frontAgeUnitGap, ageBaseline, ink);
        drawLabeledValue(content, font, "联系电话（亲属）：", safe(preview.getFrontPhone()), x + width * 0.09f, x + width * 0.47f, y + height * 0.17f, 15.5f, 128f, ink);

        drawCareMark(content, x + width * template.frontCareMarkXRatio, y + height * template.frontCareMarkYRatio, color(template.careMark));
        drawCenteredText(content, font, 8.5f, FOOTER_ATTRIBUTION, x + width * 0.48f, y + height * 0.032f, mutedInk);
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
            BufferedImage qrImage,
            NameplateTemplateConfig template
    ) throws IOException {
        Color ink = color(template.ink);
        Color mutedInk = color(template.mutedInk);
        Color line = color(template.line);
        Color mintDeep = color(template.mintDeep);

        float qrX = x + width * 0.11f;
        float qrY = y + height * 0.32f;
        float qrSize = width * 0.27f;
        float qrFrameRight = qrX + qrSize + 12f;
        float backInfoLeft = qrFrameRight + 18f;
        float backInfoRight = x + width - 18f;
        float backInfoCenterX = (backInfoLeft + backInfoRight) / 2f;

        float brandDividerY = y + height * template.backDividerBaselineRatio;
        float promptDividerY = y + height * 0.35f;
        float promptCenterY = (brandDividerY + promptDividerY) / 2f;
        float promptBaselineY = rasterizedTextBaselineForCenter("扫码查看基础信息", 22f, promptCenterY, ink);

        drawHorizontalBrand(document, content, font, template.backTitleSize, template.backSubtitleSize,
                template.title, template.subtitle, backInfoCenterX,
                y + height * template.backTitleBaselineRatio, template.backBrandGap, ink, mutedInk);
        drawDividerWithHealthIcon(content, backInfoCenterX, brandDividerY,
                template.backDividerLength, mintDeep, line);

        content.setNonStrokingColor(Color.WHITE);
        addRoundRect(content, qrX - 12f, qrY - 12f, qrSize + 24f, qrSize + 24f, 12f);
        content.fill();
        content.setStrokingColor(new Color(174, 178, 178));
        content.setLineWidth(1.6f);
        addRoundRect(content, qrX - 12f, qrY - 12f, qrSize + 24f, qrSize + 24f, 12f);
        content.stroke();
        drawBackgroundImage(document, content, qrImage, qrX, qrY, qrSize, qrSize);

        drawRasterizedCenteredText(document, content, font, 22f, "扫码查看基础信息", backInfoCenterX, promptBaselineY, ink);
        drawDividerWithHealthIcon(content, backInfoCenterX, promptDividerY, 44f, color(template.gold), line);

        drawText(content, font, 17f, "健康档案编号：", x + width * 0.15f, y + height * 0.13f, ink);
        String archiveNo = safe(preview.getBackArchiveNo());
        float archiveNoX = x + width * 0.43f;
        float archiveNoBaseline = y + height * 0.13f;
        drawText(content, font, 15f, archiveNo, archiveNoX, archiveNoBaseline, ink);
        float archiveNoWidth = font.getStringWidth(archiveNo) / 1000f * 15f;
        float archiveLineEnd = Math.min(x + width * 0.88f, archiveNoX + archiveNoWidth + 4f);
        drawLine(content, archiveNoX - 2f, y + height * 0.105f, archiveLineEnd, y + height * 0.105f, ink, 0.9f);
        drawCenteredText(content, font, 8.5f, FOOTER_ATTRIBUTION, x + width * 0.5f, y + height * 0.032f, mutedInk);
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

    private void drawHorizontalBrand(
            PDDocument document,
            PDPageContentStream content,
            PDFont font,
            float titleSize,
            float subtitleSize,
            String title,
            String subtitle,
            float centerX,
            float baseline,
            float gap,
            Color titleColor,
            Color subtitleColor
    ) throws IOException {
        float titleWidth = font.getStringWidth(title) / 1000f * titleSize;
        float subtitleWidth = font.getStringWidth(subtitle) / 1000f * subtitleSize;
        float startX = centerX - (titleWidth + gap + subtitleWidth) / 2f;
        drawCenteredTitle(document, content, font, titleSize, title,
                startX + titleWidth / 2f, baseline, titleColor);
        drawRasterizedCenteredText(document, content, font, subtitleSize, subtitle,
                startX + titleWidth + gap + subtitleWidth / 2f, baseline, subtitleColor);
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
            float lineWidth,
            Color ink
    ) throws IOException {
        drawText(content, font, size, label, labelX, baseline, ink);
        drawText(content, font, size - 1f, value, valueX, baseline, ink);
        drawLine(content, valueX - 2f, baseline - 6f, valueX + lineWidth, baseline - 6f, ink, 0.9f);
    }

    private void drawCenteredLabeledValue(
            PDPageContentStream content,
            PDFont font,
            String label,
            String value,
            float labelX,
            float lineX,
            float baseline,
            float size,
            float lineWidth,
            Color ink
    ) throws IOException {
        drawText(content, font, size, label, labelX, baseline, ink);
        drawCenteredText(content, font, size - 1f, value, lineX + lineWidth / 2f, baseline, ink);
        drawLine(content, lineX - 2f, baseline - 6f, lineX + lineWidth, baseline - 6f, ink, 0.9f);
    }

    private void drawDividerWithHealthIcon(
            PDPageContentStream content,
            float centerX,
            float y,
            float lineLength,
            Color iconColor,
            Color lineColor
    )
            throws IOException {
        drawLine(content, centerX - lineLength - 22f, y, centerX - 24f, y, lineColor, 1f);
        drawLine(content, centerX + 22f, y, centerX + lineLength + 32f, y, lineColor, 1f);
        content.setNonStrokingColor(iconColor);
        addCircle(content, centerX, y + 1f, 10f);
        content.fill();
        content.setStrokingColor(Color.WHITE);
        content.setLineWidth(2.6f);
        drawLine(content, centerX - 5f, y + 1f, centerX + 5f, y + 1f, Color.WHITE, 2.6f);
        drawLine(content, centerX, y - 4f, centerX, y + 6f, Color.WHITE, 2.6f);
    }

    private void drawCareMark(PDPageContentStream content, float x, float y, Color markColor) throws IOException {
        content.setStrokingColor(markColor);
        content.setLineWidth(2.2f);
        content.moveTo(x - 18f, y + 5f);
        content.curveTo(x - 15f, y + 22f, x - 3f, y + 18f, x, y + 8f);
        content.curveTo(x + 3f, y + 18f, x + 15f, y + 22f, x + 18f, y + 5f);
        content.stroke();
        content.setNonStrokingColor(markColor);
        addCircle(content, x, y + 21f, 6f);
        content.fill();
        content.setStrokingColor(markColor);
        content.setLineWidth(2f);
        drawLine(content, x - 14f, y, x - 7f, y + 8f, markColor, 2f);
        drawLine(content, x + 14f, y, x + 7f, y + 8f, markColor, 2f);
        drawLine(content, x - 7f, y + 8f, x, y + 2f, markColor, 2f);
        drawLine(content, x + 7f, y + 8f, x, y + 2f, markColor, 2f);
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

    private byte[] loadFontBytes(String fontResource) throws IOException {
        String resource = fontResource == null || fontResource.isBlank() ? "/fonts/ArialUnicode.ttf" : fontResource.trim();
        String fontKey = fontResourceVersion(resource);
        if (!fontResourceCacheEnabled) {
            return readFontBytes(resource);
        }
        byte[] bytes = cachedFontBytes;
        if (bytes != null && Objects.equals(cachedFontKey, fontKey)) {
            return bytes;
        }
        synchronized (NameplateService.class) {
            if (cachedFontBytes == null || !Objects.equals(cachedFontKey, fontKey)) {
                cachedFontBytes = readFontBytes(resource);
                cachedFontKey = fontKey;
            }
            return cachedFontBytes;
        }
    }

    private byte[] readFontBytes(String fontResource) throws IOException {
        Path externalPath = resolveExternalFontPath(fontResource);
        if (externalPath != null) {
            return Files.readAllBytes(externalPath);
        }
        String classpathResource = fontResource.startsWith("/") ? fontResource : "/" + fontResource;
        try (InputStream fontStream = NameplateService.class.getResourceAsStream(classpathResource)) {
            if (fontStream == null) {
                throw new IllegalStateException("缺少中文字体资源 " + fontResource);
            }
            return fontStream.readAllBytes();
        }
    }

    private String fontResourceVersion(String fontResource) {
        try {
            Path externalPath = resolveExternalFontPath(fontResource);
            if (externalPath != null) {
                return fontResource + ":" + Files.getLastModifiedTime(externalPath).toMillis() + ":" + Files.size(externalPath);
            }
        } catch (IOException ignored) {
            // The render path will report the readable font error with the configured resource name.
        }
        return fontResource;
    }

    private Path resolveExternalFontPath(String fontResource) {
        if (fontResource.startsWith("file:")) {
            return Path.of(URI.create(fontResource));
        }
        Path candidate = Path.of(fontResource);
        return candidate.isAbsolute() && Files.isRegularFile(candidate) ? candidate : null;
    }

    private String buildPdfCacheKey(String elderId, NameplatePreviewResponse preview, String templateVersion) {
        return elderId + "|" + safe(preview.getFrontName()) + "|" + safe(preview.getFrontAge()) + "|"
                + safe(preview.getFrontPhone()) + "|" + safe(preview.getBackArchiveNo()) + "|"
                + safe(preview.getBackQrToken()) + "|" + safe(preview.getBackHint()) + "|" + templateVersion;
    }

    private String renderPdfPreviewImageBase64(NameplatePreviewResponse preview, NameplateTemplateConfig template) {
        byte[] pdfBytes = renderPdfBytes(preview, template);
        try (PDDocument document = PDDocument.load(pdfBytes);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            BufferedImage pageImage = new PDFRenderer(document).renderImageWithDPI(0, 110);
            ImageIO.write(pageImage, "png", output);
            return Base64.getEncoder().encodeToString(output.toByteArray());
        } catch (IOException e) {
            throw new IllegalStateException("生成名牌预览图失败", e);
        }
    }

    private TemplateSnapshot templateSnapshot() {
        String configuredPath = templateConfigFile == null ? "" : templateConfigFile.trim();
        if (configuredPath.isEmpty()) {
            return TemplateSnapshot.builtIn();
        }

        Path path = Path.of(configuredPath).toAbsolutePath().normalize();
        if (!Files.isRegularFile(path)) {
            return TemplateSnapshot.builtIn();
        }

        try {
            long modifiedAt = Files.getLastModifiedTime(path).toMillis();
            long size = Files.size(path);
            TemplateSnapshot current = templateSnapshot;
            if (current.matches(path.toString(), modifiedAt, size, fontResourceVersion(current.config().fontResource))) {
                return current;
            }
            synchronized (this) {
                current = templateSnapshot;
                if (current.matches(path.toString(), modifiedAt, size, fontResourceVersion(current.config().fontResource))) {
                    return current;
                }
                NameplateTemplateConfig loaded = templateObjectMapper.readValue(Files.readString(path), NameplateTemplateConfig.class);
                loaded.validate();
                TemplateSnapshot next = new TemplateSnapshot(path.toString(), modifiedAt, size, loaded, fontResourceVersion(loaded.fontResource));
                templateSnapshot = next;
                return next;
            }
        } catch (Exception e) {
            log.warn("无法加载名牌模板文件 {}，继续使用内置模板", path, e);
            return templateSnapshot.sourceKey().equals(path.toString()) ? templateSnapshot : TemplateSnapshot.builtIn();
        }
    }

    private Color color(String hex) {
        return new Color(Integer.parseInt(hex.substring(1), 16));
    }

    private record TemplateSnapshot(
            String sourceKey,
            long modifiedAt,
            long size,
            NameplateTemplateConfig config,
            String fontVersion
    ) {
        private static TemplateSnapshot builtIn() {
            NameplateTemplateConfig config = new NameplateTemplateConfig();
            config.validate();
            return new TemplateSnapshot("builtin", -1L, -1L, config, "builtin-font");
        }

        private boolean matches(String source, long modified, long fileSize, String currentFontVersion) {
            return sourceKey.equals(source)
                    && modifiedAt == modified
                    && size == fileSize
                    && fontVersion.equals(currentFontVersion);
        }

        private String version() {
            return sourceKey + ":" + modifiedAt + ":" + size + ":" + fontVersion;
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

    private void drawCenteredTitle(PDDocument document, PDPageContentStream content, PDFont font, float size, String title, float centerX, float y, Color color)
            throws IOException {
        drawRasterizedCenteredText(document, content, font, size, title, centerX, y, color);
    }

    private void drawRasterizedCenteredText(PDDocument document, PDPageContentStream content, PDFont font, float size, String text, float centerX, float y, Color color)
            throws IOException {
        float textWidth = font.getStringWidth(text) / 1000f * size;
        float left = centerX - (textWidth / 2f);
        BufferedImage titleImage = renderTitleImage(text, size, color);
        PDImageXObject titleObject = LosslessFactory.createFromImage(document, titleImage);
        Font titleFont = titleFont(size);
        FontRenderContext frc = new FontRenderContext(null, true, true);
        int baseline = 4 + (int) Math.ceil(titleFont.getLineMetrics(text, frc).getAscent());
        float imageLeft = centerX - titleImage.getWidth() / 8f;
        float imageBottom = y - (titleImage.getHeight() - baseline) / 4f;
        content.drawImage(titleObject, imageLeft, imageBottom, titleImage.getWidth() / 4f, titleImage.getHeight() / 4f);

        // Keep an invisible text layer so PDF search and extraction retain the title.
        content.beginText();
        content.setRenderingMode(RenderingMode.NEITHER);
        content.setFont(font, size);
        content.newLineAtOffset(left, y);
        content.showText(text);
        content.setRenderingMode(RenderingMode.FILL);
        content.endText();
    }

    private BufferedImage renderTitleImage(String title, float size, Color color) throws IOException {
        String cacheKey = title + "|" + size + "|" + color.getRGB();
        BufferedImage cached = titleImageCache.get(cacheKey);
        if (cached != null) {
            return cached;
        }
        Font titleFont = titleFont(size);
        FontRenderContext frc = new FontRenderContext(null, true, true);
        int width = (int) Math.ceil(titleFont.getStringBounds(title, frc).getWidth()) + 8;
        int height = (int) Math.ceil(titleFont.getLineMetrics(title, frc).getHeight()) + 8;
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = image.createGraphics();
        graphics.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        graphics.setColor(color);
        graphics.setFont(titleFont);
        graphics.drawString(title, 4, 4 + titleFont.getLineMetrics(title, frc).getAscent());
        graphics.dispose();
        BufferedImage previous = titleImageCache.putIfAbsent(cacheKey, image);
        return previous == null ? image : previous;
    }

    private float rasterizedTextBaselineForCenter(String text, float size, float centerY, Color color) throws IOException {
        String cacheKey = text + "|" + size;
        Float cachedOffset = rasterizedTextCenterOffsetCache.get(cacheKey);
        if (cachedOffset != null) {
            return centerY - cachedOffset;
        }

        BufferedImage image = renderTitleImage(text, size, color);
        Font font = titleFont(size);
        FontRenderContext frc = new FontRenderContext(null, true, true);
        int baseline = 4 + (int) Math.ceil(font.getLineMetrics(text, frc).getAscent());
        int firstVisibleY = image.getHeight();
        int lastVisibleY = -1;
        for (int imageY = 0; imageY < image.getHeight(); imageY++) {
            for (int imageX = 0; imageX < image.getWidth(); imageX++) {
                if (((image.getRGB(imageX, imageY) >>> 24) & 0xff) > 0) {
                    firstVisibleY = Math.min(firstVisibleY, imageY);
                    lastVisibleY = Math.max(lastVisibleY, imageY);
                }
            }
        }
        if (lastVisibleY < firstVisibleY) {
            return centerY;
        }

        float visibleCenterY = (firstVisibleY + lastVisibleY + 1f) / 2f;
        float centerOffset = (baseline - visibleCenterY) / 4f;
        Float previous = rasterizedTextCenterOffsetCache.putIfAbsent(cacheKey, centerOffset);
        return centerY - (previous == null ? centerOffset : previous);
    }

    private Font titleFont(float size) throws IOException {
        Font current = cachedTitleFont;
        if (current == null) {
            synchronized (NameplateService.class) {
                current = cachedTitleFont;
                if (current == null) {
                    try (InputStream stream = NameplateService.class.getResourceAsStream("/fonts/NotoSansSC-Regular.ttf")) {
                        if (stream == null) {
                            throw new IllegalStateException("缺少标题中文字体资源");
                        }
                        current = Font.createFont(Font.TRUETYPE_FONT, stream);
                        cachedTitleFont = current;
                    } catch (FontFormatException e) {
                        throw new IOException("标题中文字体资源格式无效", e);
                    }
                }
            }
        }
        return current.deriveFont(Font.PLAIN, size * 4f);
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

    private String formatAgeValue(String age) {
        if (age == null || age.isBlank() || "未填写".equals(age)) {
            return "未填写";
        }
        String normalized = age.endsWith("岁") ? age.substring(0, age.length() - 1).trim() : age;
        return normalized.isBlank() ? "未填写" : normalized;
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
