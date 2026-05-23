package com.silverlink.care.module.nameplate;

import com.silverlink.care.common.ApiResponse;
import com.silverlink.care.module.nameplate.dto.NameplatePdfRequest;
import com.silverlink.care.module.nameplate.dto.NameplatePreviewResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/nameplates")
public class NameplateController {

    private final NameplateService nameplateService;

    public NameplateController(NameplateService nameplateService) {
        this.nameplateService = nameplateService;
    }

    @GetMapping("/{elderId}/preview")
    public ApiResponse<NameplatePreviewResponse> preview(
            @PathVariable String elderId,
            @RequestParam(defaultValue = "false") boolean blank) {
        return ApiResponse.ok(nameplateService.preview(elderId, blank));
    }

    @GetMapping("/{elderId}/pdf")
    public ResponseEntity<byte[]> pdf(@PathVariable String elderId) {
        byte[] pdfBytes = nameplateService.generateDemoPdf(elderId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=nameplate-" + elderId + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    @PostMapping("/batch-pdf")
    public ApiResponse<Map<String, String>> batchPdf(@RequestBody NameplatePdfRequest request) {
        Map<String, String> map = new LinkedHashMap<>();
        map.put("count", String.valueOf(request.getElderIds() == null ? 0 : request.getElderIds().size()));
        map.put("note", "批量 PDF 生成 demo");
        return ApiResponse.ok(map);
    }
}
