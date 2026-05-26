package com.silverlink.care.module.review;

import com.silverlink.care.common.BizException;
import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import com.silverlink.care.module.qrcode.QrCodeEntity;
import com.silverlink.care.module.qrcode.QrCodeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AdminReviewRequestServiceTest {

    private JdbcTemplate jdbc;
    private SilverLinkDataService data;
    private QrCodeService qrCodeService;
    private AdminReviewRequestService service;

    @BeforeEach
    void setUp() {
        jdbc = mock(JdbcTemplate.class);
        data = mock(SilverLinkDataService.class);
        qrCodeService = mock(QrCodeService.class);
        service = new AdminReviewRequestService(jdbc, data, qrCodeService);
        when(data.str(any())).thenAnswer(inv -> {
            Object arg = inv.getArgument(0);
            return arg == null ? "" : arg.toString();
        });
        when(data.dec(any())).thenReturn("王桂兰");
    }

    @Test
    void createQrDisableRequestThrowsWhenQrCodeNull() {
        assertThrows(BizException.class,
                () -> service.createQrDisableRequest("vol1", "VOLUNTEER", "elder-1", null));
    }

    @Test
    void createQrDisableRequestThrowsWhenQrAlreadyDisabled() {
        QrCodeEntity qr = new QrCodeEntity();
        qr.setId("qr-1");
        qr.setQrId("qrId-1");
        qr.setStatus("DISABLED");
        assertThrows(BizException.class,
                () -> service.createQrDisableRequest("vol1", "VOLUNTEER", "elder-1", qr));
    }

    @Test
    void createQrDisableRequestReturnsExistingWhenPending() {
        QrCodeEntity qr = new QrCodeEntity();
        qr.setId("qr-1");
        qr.setQrId("qrId-1");
        qr.setStatus("ACTIVE");

        Map<String, Object> existingRow = new LinkedHashMap<>();
        existingRow.put("id", "existing-id");
        existingRow.put("status", "PENDING");
        when(jdbc.queryForList(contains("where r.qr_code_id=?"), eq("qr-1"), eq("PENDING")))
                .thenReturn(List.of(existingRow));

        var result = service.createQrDisableRequest("vol1", "VOLUNTEER", "elder-1", qr);
        assertNotNull(result);
        verify(jdbc, never()).update(contains("insert into admin_review_request"), any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void createQrDisableRequestInsertsNewWhenNoPending() {
        QrCodeEntity qr = new QrCodeEntity();
        qr.setId("qr-1");
        qr.setQrId("qrId-1");
        qr.setStatus("ACTIVE");

        when(jdbc.queryForList(contains("where r.qr_code_id=?"), eq("qr-1"), eq("PENDING")))
                .thenReturn(Collections.emptyList());
        Map<String, Object> insertedRow = new LinkedHashMap<>();
        insertedRow.put("id", "new-id");
        insertedRow.put("status", "PENDING");
        insertedRow.put("requester_role", "VOLUNTEER");
        insertedRow.put("requester_account", "vol1");
        insertedRow.put("target_label", "王桂兰 / A001");
        insertedRow.put("elder_name_enc", "enc");
        insertedRow.put("archive_no", "A001");
        when(jdbc.queryForList(contains("where r.id=?"), anyString()))
                .thenReturn(List.of(insertedRow));
        Map<String, Object> elderRow = new LinkedHashMap<>();
        elderRow.put("name_enc", "enc");
        elderRow.put("archive_no", "A001");
        when(data.one(anyString(), any())).thenReturn(elderRow);

        var result = service.createQrDisableRequest("vol1", "VOLUNTEER", "elder-1", qr);
        verify(jdbc).update(contains("insert into admin_review_request"), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
        assertNotNull(result);
    }

    @Test
    void listReturnsPendingByDefault() {
        when(jdbc.queryForList(contains("where r.status=?"), eq("PENDING")))
                .thenReturn(Collections.emptyList());
        var result = service.list(null);
        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void listReturnsFilteredByStatus() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", "rev-1");
        row.put("status", "APPROVED");
        row.put("requester_role", "VOLUNTEER");
        when(jdbc.queryForList(contains("where r.status=?"), eq("APPROVED")))
                .thenReturn(List.of(row));
        var result = service.list("approved");
        assertEquals(1, result.size());
    }

    @Test
    void approveDisablesQrCodeAndUpdatesStatus() {
        Map<String, Object> rawRow = new LinkedHashMap<>();
        rawRow.put("id", "rev-1");
        rawRow.put("status", "PENDING");
        rawRow.put("type", "QR_DISABLE");
        rawRow.put("qr_code_id", "qr-1");
        when(jdbc.queryForList(eq("select * from admin_review_request where id=?"), eq("rev-1")))
                .thenReturn(List.of(rawRow));
        when(jdbc.queryForList(contains("where r.id=?"), eq("rev-1")))
                .thenReturn(List.of(rawRow));

        service.approve("rev-1", "admin");
        verify(qrCodeService).disable("qr-1");
        verify(jdbc).update(contains("update admin_review_request"), eq("APPROVED"), anyString(), eq("admin"), anyString(), eq("rev-1"));
    }

    @Test
    void approveThrowsWhenNotPending() {
        Map<String, Object> rawRow = new LinkedHashMap<>();
        rawRow.put("id", "rev-1");
        rawRow.put("status", "APPROVED");
        rawRow.put("type", "QR_DISABLE");
        when(jdbc.queryForList(eq("select * from admin_review_request where id=?"), eq("rev-1")))
                .thenReturn(List.of(rawRow));

        assertThrows(BizException.class, () -> service.approve("rev-1", "admin"));
    }

    @Test
    void approveThrowsWhenNotFound() {
        when(jdbc.queryForList(eq("select * from admin_review_request where id=?"), eq("missing")))
                .thenReturn(Collections.emptyList());
        assertThrows(BizException.class, () -> service.approve("missing", "admin"));
    }

    @Test
    void rejectUpdatesStatusWithNote() {
        Map<String, Object> rawRow = new LinkedHashMap<>();
        rawRow.put("id", "rev-1");
        rawRow.put("status", "PENDING");
        when(jdbc.queryForList(eq("select * from admin_review_request where id=?"), eq("rev-1")))
                .thenReturn(List.of(rawRow));
        when(jdbc.queryForList(contains("where r.id=?"), eq("rev-1")))
                .thenReturn(List.of(rawRow));

        service.reject("rev-1", "admin", "不符合要求");
        verify(jdbc).update(contains("update admin_review_request"), eq("REJECTED"), anyString(), eq("admin"), eq("不符合要求"), eq("rev-1"));
    }

    @Test
    void rejectUsesDefaultNoteWhenBlank() {
        Map<String, Object> rawRow = new LinkedHashMap<>();
        rawRow.put("id", "rev-1");
        rawRow.put("status", "PENDING");
        when(jdbc.queryForList(eq("select * from admin_review_request where id=?"), eq("rev-1")))
                .thenReturn(List.of(rawRow));
        when(jdbc.queryForList(contains("where r.id=?"), eq("rev-1")))
                .thenReturn(List.of(rawRow));

        service.reject("rev-1", "admin", "");
        verify(jdbc).update(contains("update admin_review_request"), eq("REJECTED"), anyString(), eq("admin"), eq("管理员已驳回"), eq("rev-1"));
    }

    @Test
    void rejectThrowsWhenNotPending() {
        Map<String, Object> rawRow = new LinkedHashMap<>();
        rawRow.put("id", "rev-1");
        rawRow.put("status", "REJECTED");
        when(jdbc.queryForList(eq("select * from admin_review_request where id=?"), eq("rev-1")))
                .thenReturn(List.of(rawRow));

        assertThrows(BizException.class, () -> service.reject("rev-1", "admin", "note"));
    }

    @Test
    void toMapTranslatesFamilyRole() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", "rev-2");
        row.put("status", "PENDING");
        row.put("requester_role", "FAMILY");
        row.put("requester_account", "user1");
        row.put("target_label", "王桂兰 / A001");
        row.put("elder_name_enc", "enc");
        row.put("archive_no", "A001");
        when(jdbc.queryForList(contains("where r.status=?"), eq("PENDING")))
                .thenReturn(List.of(row));

        var result = service.list("PENDING");
        assertEquals("家属", result.get(0).get("requesterRoleLabel"));
    }

    @Test
    void toMapTranslatesVolunteerRole() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", "rev-3");
        row.put("status", "PENDING");
        row.put("requester_role", "VOLUNTEER");
        row.put("requester_account", "vol1");
        row.put("target_label", "李奶奶 / A002");
        row.put("elder_name_enc", "enc");
        row.put("archive_no", "A002");
        when(jdbc.queryForList(contains("where r.status=?"), eq("PENDING")))
                .thenReturn(List.of(row));

        var result = service.list("PENDING");
        assertEquals("志愿者", result.get(0).get("requesterRoleLabel"));
    }

    @Test
    void toMapDefaultsUnknownRole() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", "rev-4");
        row.put("status", "PENDING");
        row.put("requester_role", "OTHER");
        row.put("requester_account", "other1");
        row.put("target_label", "张爷爷 / A003");
        row.put("elder_name_enc", "enc");
        row.put("archive_no", "A003");
        when(jdbc.queryForList(contains("where r.status=?"), eq("PENDING")))
                .thenReturn(List.of(row));

        var result = service.list("PENDING");
        assertEquals("OTHER", result.get(0).get("requesterRoleLabel"));
    }
}
