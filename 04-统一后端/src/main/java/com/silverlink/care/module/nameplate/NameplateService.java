package com.silverlink.care.module.nameplate;

import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import com.silverlink.care.module.nameplate.dto.NameplatePreviewResponse;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Service
public class NameplateService {

    private final SilverLinkDataService data;

    public NameplateService(SilverLinkDataService data) {
        this.data = data;
    }

    public NameplatePreviewResponse preview(String elderId, boolean blankTemplate) {
        NameplatePreviewResponse resp = new NameplatePreviewResponse();
        resp.setElderId(elderId);
        resp.setBlankTemplate(blankTemplate);
        if (blankTemplate) {
            resp.setFrontName("________");
            resp.setFrontAge("________");
            resp.setFrontPhone("________");
            resp.setBackQrToken("placeholder-qr-token");
            resp.setBackArchiveNo("________");
            resp.setBackHint("扫码查看健康档案");
            return resp;
        }
        var elder = data.elderDetail(elderId, true);
        resp.setFrontName(String.valueOf(elder.get("name")));
        resp.setFrontAge(String.valueOf(elder.get("age")));
        resp.setFrontPhone(String.valueOf(elder.get("emergencyPhoneMasked")));
        resp.setBackQrToken("encrypted-qr-token");
        resp.setBackArchiveNo(String.valueOf(elder.get("archiveNo")));
        resp.setBackHint("扫码查看健康档案");
        return resp;
    }

    public byte[] generateDemoPdf(String elderId) {
        NameplatePreviewResponse preview = preview(elderId, false);
        String content = """
                q
                1 1 1 rg 56 540 220 120 re f
                0 0 0 RG 56 540 220 120 re S
                BT /F1 18 Tf 72 630 Td (SilverLink Nameplate - Front) Tj ET
                BT /F1 14 Tf 72 604 Td (Name: %s) Tj ET
                BT /F1 14 Tf 72 582 Td (Age: %s) Tj ET
                BT /F1 14 Tf 72 560 Td (Phone: %s) Tj ET
                1 1 1 rg 320 540 220 120 re f
                0 0 0 RG 320 540 220 120 re S
                BT /F1 18 Tf 336 630 Td (SilverLink Nameplate - Back) Tj ET
                BT /F1 14 Tf 336 604 Td (QR: encrypted token) Tj ET
                BT /F1 14 Tf 336 582 Td (Archive: %s) Tj ET
                BT /F1 12 Tf 336 560 Td (Generated from persisted elder record.) Tj ET
                Q
                """.formatted(
                escapePdfText(preview.getFrontName()),
                escapePdfText(preview.getFrontAge()),
                escapePdfText(preview.getFrontPhone()),
                escapePdfText(preview.getBackArchiveNo())
        );

        List<String> objects = new ArrayList<>();
        objects.add("<< /Type /Catalog /Pages 2 0 R >>");
        objects.add("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
        objects.add("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>");
        objects.add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
        objects.add("<< /Length " + content.getBytes(StandardCharsets.ISO_8859_1).length + " >>\nstream\n" + content + "endstream");

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        writeAscii(out, "%PDF-1.4\n");
        List<Integer> offsets = new ArrayList<>();
        offsets.add(0);
        for (int i = 0; i < objects.size(); i++) {
            offsets.add(out.size());
            writeAscii(out, (i + 1) + " 0 obj\n");
            writeAscii(out, objects.get(i));
            writeAscii(out, "\nendobj\n");
        }
        int xrefOffset = out.size();
        writeAscii(out, "xref\n0 " + (objects.size() + 1) + "\n");
        writeAscii(out, "0000000000 65535 f \n");
        for (int i = 1; i < offsets.size(); i++) {
            writeAscii(out, String.format("%010d 00000 n \n", offsets.get(i)));
        }
        writeAscii(out, "trailer\n<< /Size " + (objects.size() + 1) + " /Root 1 0 R >>\n");
        writeAscii(out, "startxref\n" + xrefOffset + "\n%%EOF\n");
        return out.toByteArray();
    }

    private String escapePdfText(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)");
    }

    private void writeAscii(ByteArrayOutputStream out, String value) {
        out.writeBytes(value.getBytes(StandardCharsets.ISO_8859_1));
    }
}
