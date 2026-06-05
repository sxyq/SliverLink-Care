package com.silverlink.care.module.family;

import com.silverlink.care.common.BizException;
import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import com.silverlink.care.module.qrcode.QrCodeEntity;
import com.silverlink.care.module.qrcode.QrCodeService;
import com.silverlink.care.module.review.AdminReviewRequestService;
import com.silverlink.care.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class FamilyServiceTest {

    private JdbcTemplate jdbc;
    private SilverLinkDataService data;
    private JwtTokenProvider jwtTokenProvider;
    private QrCodeService qrCodeService;
    private AdminReviewRequestService reviewRequestService;
    private FamilyService service;

    @BeforeEach
    void setUp() {
        jdbc = mock(JdbcTemplate.class);
        data = mock(SilverLinkDataService.class);
        jwtTokenProvider = mock(JwtTokenProvider.class);
        qrCodeService = mock(QrCodeService.class);
        reviewRequestService = mock(AdminReviewRequestService.class);
        service = new FamilyService(jdbc, data, jwtTokenProvider, qrCodeService, reviewRequestService);

        when(data.str(any())).thenAnswer(inv -> {
            Object arg = inv.getArgument(0);
            return arg == null ? "" : arg.toString();
        });
        when(data.intValue(any())).thenReturn(0);
        when(data.enc(anyString())).thenReturn("enc");
        when(data.dec(any())).thenReturn("李奶奶");
        when(data.maskName(anyString())).thenReturn("李**");
        when(data.maskPhone(anyString())).thenReturn("138****0000");
    }

    private void stubAuth(String auth, String phone, String userId) {
        when(jwtTokenProvider.getSubject(auth.substring(7))).thenReturn(phone);
        Map<String, Object> userRow = new LinkedHashMap<>();
        userRow.put("id", userId);
        userRow.put("account", phone);
        userRow.put("role", "FAMILY");
        userRow.put("status", "ACTIVE");
        when(data.one(contains("from app_user"), eq(phone))).thenReturn(userRow);
        when(data.isFamilyBound(eq(userId), anyString())).thenReturn(true);
    }

    @Test
    void loginSuccess() {
        FamilyLoginRequest req = new FamilyLoginRequest();
        req.setPhone("13800000000");
        req.setPassword("secret");
        Map<String, Object> userRow = new LinkedHashMap<>();
        userRow.put("id", "user-1");
        when(data.login("13800000000", "secret", "FAMILY")).thenReturn(Optional.of(userRow));
        when(jwtTokenProvider.generateToken("13800000000", "FAMILY", 86400000L)).thenReturn("jwt-token");

        FamilyLoginResultDto result = service.login(req);

        assertTrue(result.getOk());
        assertEquals("jwt-token", result.getToken());
        assertEquals("登录成功", result.getMessage());
    }

    @Test
    void loginFailureWhenUserNotFound() {
        FamilyLoginRequest req = new FamilyLoginRequest();
        req.setPhone("13800000000");
        req.setPassword("wrong");
        when(data.login("13800000000", "wrong", "FAMILY")).thenReturn(Optional.empty());

        FamilyLoginResultDto result = service.login(req);

        assertFalse(result.getOk());
        assertNull(result.getToken());
        assertEquals("手机号或密码错误", result.getMessage());
    }

    @Test
    void myEldersReturnsElderList() {
        String auth = "Bearer test-token";
        stubAuth(auth, "13800000000", "user-1");

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", "elder-1");
        row.put("name_enc", "enc-name");
        row.put("age", 80);
        row.put("archive_no", "A001");
        row.put("bound_at", "2026-05-26 10:00:00");
        when(jdbc.queryForList(contains("from family_binding"), eq("user-1"))).thenReturn(List.of(row));

        List<FamilyElderDto> result = service.myElders(auth);

        assertEquals(1, result.size());
        assertEquals("elder-1", result.get(0).getId());
        assertEquals("李**", result.get(0).getName());
        assertEquals("A001", result.get(0).getArchiveNo());
    }

    @Test
    void myEldersReturnsEmptyList() {
        String auth = "Bearer test-token";
        stubAuth(auth, "13800000000", "user-1");
        when(jdbc.queryForList(contains("from family_binding"), eq("user-1"))).thenReturn(Collections.emptyList());

        List<FamilyElderDto> result = service.myElders(auth);

        assertTrue(result.isEmpty());
    }

    @Test
    void elderDetailReturnsDetailDto() {
        String auth = "Bearer test-token";
        stubAuth(auth, "13800000000", "user-1");

        Map<String, Object> elderRow = new LinkedHashMap<>();
        elderRow.put("id", "elder-1");
        elderRow.put("name_enc", "enc-name");
        elderRow.put("age", 80);
        elderRow.put("gender", "女");
        elderRow.put("abo_type", "A");
        elderRow.put("allergy_enc", "enc-allergy");
        elderRow.put("emergency_contact_name_enc", "enc-name");
        elderRow.put("emergency_phone_enc", "enc-phone");
        elderRow.put("relationship", "女儿");
        elderRow.put("backup_contact_name_enc", "enc-backup-name");
        elderRow.put("backup_phone_enc", "enc-backup-phone");
        when(data.one(contains("from elder"), eq("elder-1"))).thenReturn(elderRow);

        FamilyElderDetailDto result = service.elderDetail("elder-1", auth);

        assertEquals("elder-1", result.getId());
        assertEquals("李奶奶", result.getName());
        assertEquals("女", result.getGender());
        assertEquals("A", result.getBloodType());
        assertEquals("李奶奶", result.getAllergyHistory());
        assertEquals("李奶奶", result.getEmergencyContactName());
        assertEquals("李奶奶", result.getEmergencyContactPhone());
        assertEquals("女儿", result.getEmergencyContactRelation());
        assertEquals("李奶奶", result.getBackupContactName());
        assertEquals("李奶奶", result.getBackupContactPhone());
        assertEquals("备用联系人", result.getBackupContactRelation());
    }

    @Test
    void updateContactsCallsJdbcUpdate() {
        String auth = "Bearer test-token";
        stubAuth(auth, "13800000000", "user-1");

        UpdateContactsRequest req = new UpdateContactsRequest();
        req.setEmergencyContactName("张三");
        req.setEmergencyContactPhone("13900000000");
        req.setEmergencyContactRelation("儿子");
        req.setBackupContactName("李四");
        req.setBackupContactPhone("13800000001");

        service.updateContacts("elder-1", req, auth);

        verify(jdbc).update(contains("update elder"),
                eq("enc"), eq("enc"), eq("儿子"), eq("enc"), eq("enc"), eq("elder-1"));
    }

    @Test
    void medicationsReturnsMedicationList() {
        String auth = "Bearer test-token";
        stubAuth(auth, "13800000000", "user-1");

        Map<String, String> medRow = new LinkedHashMap<>();
        medRow.put("id", "med-1");
        medRow.put("name", "阿司匹林");
        medRow.put("dosage", "100mg");
        medRow.put("usage", "口服");
        medRow.put("timing", "每日一次");
        medRow.put("updatedAt", "2026-05-26 10:00:00");
        when(data.medications("elder-1")).thenReturn(List.of(medRow));

        List<FamilyMedicationDto> result = service.medications("elder-1", auth);

        assertEquals(1, result.size());
        assertEquals("med-1", result.get(0).getId());
        assertEquals("阿司匹林", result.get(0).getName());
        assertEquals("100mg", result.get(0).getDosage());
        assertEquals("口服", result.get(0).getUsage());
        assertEquals("每日一次", result.get(0).getTiming());
    }

    @Test
    void medicationsReturnsEmptyList() {
        String auth = "Bearer test-token";
        stubAuth(auth, "13800000000", "user-1");
        when(data.medications("elder-1")).thenReturn(Collections.emptyList());

        List<FamilyMedicationDto> result = service.medications("elder-1", auth);

        assertTrue(result.isEmpty());
    }

    @Test
    void addMedicationReturnsNewMedicationDto() {
        String auth = "Bearer test-token";
        stubAuth(auth, "13800000000", "user-1");

        FamilyMedicationRequest req = new FamilyMedicationRequest();
        req.setName("阿司匹林");
        req.setDosage("100mg");
        req.setUsage("口服");
        req.setTiming("每日一次");

        Map<String, String> addedRow = new LinkedHashMap<>();
        addedRow.put("id", "med-new");
        when(data.addMedication(eq("elder-1"), anyMap())).thenReturn(addedRow);

        FamilyMedicationDto result = service.addMedication("elder-1", req, auth);

        assertEquals("med-new", result.getId());
        assertEquals("阿司匹林", result.getName());
        assertEquals("100mg", result.getDosage());
        assertEquals("口服", result.getUsage());
        assertEquals("每日一次", result.getTiming());
        assertNotNull(result.getUpdatedAt());
    }

    @Test
    void updateMedicationCallsDataUpdateMedication() {
        String auth = "Bearer test-token";
        stubAuth(auth, "13800000000", "user-1");

        FamilyMedicationRequest req = new FamilyMedicationRequest();
        req.setName("布洛芬");
        req.setDosage("200mg");
        req.setUsage("口服");
        req.setTiming("每日两次");

        service.updateMedication("elder-1", "med-1", req, auth);

        verify(data).updateMedication(eq("med-1"), anyMap());
    }

    @Test
    void deleteMedicationCallsDataDeleteMedication() {
        String auth = "Bearer test-token";
        stubAuth(auth, "13800000000", "user-1");

        service.deleteMedication("elder-1", "med-1", auth);

        verify(data).deleteMedication("med-1");
    }

    @Test
    void qrcodeReturnsDtoWhenFound() {
        String auth = "Bearer test-token";
        stubAuth(auth, "13800000000", "user-1");
        when(data.elderDetail("elder-1", false)).thenReturn(Map.of("status", "ACTIVE"));

        Map<String, Object> qrRow = new LinkedHashMap<>();
        qrRow.put("id", "qr-1");
        qrRow.put("qr_token", "token-abc");
        qrRow.put("status", "ENABLED");
        qrRow.put("created_at", "2026-05-26 10:00:00");
        when(jdbc.queryForList(contains("from qr_code"), eq("elder-1"))).thenReturn(List.of(qrRow));
        when(reviewRequestService.findPendingByQrCode("qr-1")).thenReturn(null);

        FamilyQrCodeDto result = service.qrcode("elder-1", auth);

        assertEquals("token-abc", result.getToken());
        assertEquals("启用", result.getStatus());
        assertEquals("2026-05-26 10:00:00", result.getCreatedAt());
        assertEquals("/api/nameplates/elder-1/pdf", result.getPdfUrl());
        assertNull(result.getDisableReviewStatus());
        assertNull(result.getReviewMessage());
    }

    @Test
    void qrcodeThrowsWhenNoQrCodeExists() {
        String auth = "Bearer test-token";
        stubAuth(auth, "13800000000", "user-1");
        when(data.elderDetail("elder-1", false)).thenReturn(Map.of("status", "ACTIVE"));
        when(jdbc.queryForList(contains("from qr_code"), eq("elder-1"))).thenReturn(Collections.emptyList());

        BizException ex = assertThrows(BizException.class, () -> service.qrcode("elder-1", auth));
        assertEquals(404, ex.getCode());
        assertEquals("二维码不存在，请联系管理员生成", ex.getMessage());
    }

    @Test
    void qrcodeIncludesPendingReviewInfoWhenPresent() {
        String auth = "Bearer test-token";
        stubAuth(auth, "13800000000", "user-1");
        when(data.elderDetail("elder-1", false)).thenReturn(Map.of("status", "ACTIVE"));

        Map<String, Object> qrRow = new LinkedHashMap<>();
        qrRow.put("id", "qr-1");
        qrRow.put("qr_token", "token-abc");
        qrRow.put("status", "ENABLED");
        qrRow.put("created_at", "2026-05-26 10:00:00");
        when(jdbc.queryForList(contains("from qr_code"), eq("elder-1"))).thenReturn(List.of(qrRow));

        Map<String, Object> pendingReview = new LinkedHashMap<>();
        pendingReview.put("id", "review-1");
        pendingReview.put("status", "PENDING");
        when(reviewRequestService.findPendingByQrCode("qr-1")).thenReturn(pendingReview);

        FamilyQrCodeDto result = service.qrcode("elder-1", auth);

        assertEquals("PENDING", result.getDisableReviewStatus());
        assertEquals("review-1", result.getDisableReviewId());
        assertEquals("停用申请审核中。审核通过前二维码仍保持启用。", result.getReviewMessage());
    }

    @Test
    void qrcodeReturnsDisabledStatus() {
        String auth = "Bearer test-token";
        stubAuth(auth, "13800000000", "user-1");
        when(data.elderDetail("elder-1", false)).thenReturn(Map.of("status", "ACTIVE"));

        Map<String, Object> qrRow = new LinkedHashMap<>();
        qrRow.put("id", "qr-1");
        qrRow.put("qr_token", "token-abc");
        qrRow.put("status", "DISABLED");
        qrRow.put("created_at", "2026-05-26 10:00:00");
        when(jdbc.queryForList(contains("from qr_code"), eq("elder-1"))).thenReturn(List.of(qrRow));
        when(reviewRequestService.findPendingByQrCode("qr-1")).thenReturn(null);

        FamilyQrCodeDto result = service.qrcode("elder-1", auth);

        assertEquals("已停用", result.getStatus());
    }

    @Test
    void qrcodeRejectsDisabledElder() {
        String auth = "Bearer test-token";
        stubAuth(auth, "13800000000", "user-1");
        when(data.elderDetail("elder-1", false)).thenReturn(Map.of("status", "DISABLED"));

        BizException ex = assertThrows(BizException.class, () -> service.qrcode("elder-1", auth));

        assertEquals(404, ex.getCode());
        assertEquals("老人档案已停用，二维码不可用", ex.getMessage());
    }

    @Test
    void requestDisableQrCodeCreatesRequestAndReturnsUpdatedDto() {
        String auth = "Bearer test-token";
        stubAuth(auth, "13800000000", "user-1");

        QrCodeEntity currentQr = new QrCodeEntity();
        currentQr.setId("qr-1");
        currentQr.setQrId("QR-001");
        currentQr.setStatus("ENABLED");
        currentQr.setElderId("elder-1");
        when(qrCodeService.findCurrentByElder("elder-1")).thenReturn(currentQr);

        Map<String, Object> reviewResult = new LinkedHashMap<>();
        reviewResult.put("id", "review-new");
        reviewResult.put("status", "PENDING");
        when(reviewRequestService.createQrDisableRequest("13800000000", "FAMILY", "elder-1", currentQr)).thenReturn(reviewResult);

        Map<String, Object> qrRow = new LinkedHashMap<>();
        qrRow.put("id", "qr-1");
        qrRow.put("qr_token", "token-abc");
        qrRow.put("status", "ENABLED");
        qrRow.put("created_at", "2026-05-26 10:00:00");
        when(jdbc.queryForList(contains("from qr_code"), eq("elder-1"))).thenReturn(List.of(qrRow));
        when(reviewRequestService.findPendingByQrCode("qr-1")).thenReturn(null);

        FamilyQrCodeDto result = service.requestDisableQrCode("elder-1", auth);

        assertNotNull(result);
        assertEquals("PENDING", result.getDisableReviewStatus());
        assertEquals("review-new", result.getDisableReviewId());
        assertEquals("停用申请已提交，等待管理员审核。审核通过前二维码仍保持启用。", result.getReviewMessage());
    }

    @Test
    void requestDisableQrCodeThrowsWhenNoCurrentQrCode() {
        String auth = "Bearer test-token";
        stubAuth(auth, "13800000000", "user-1");
        when(qrCodeService.findCurrentByElder("elder-1")).thenReturn(null);

        BizException ex = assertThrows(BizException.class, () -> service.requestDisableQrCode("elder-1", auth));
        assertEquals(404, ex.getCode());
        assertEquals("当前老人暂无二维码", ex.getMessage());
    }

    @Test
    void listBindingsReturnsBindingList() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", "binding-1");
        row.put("family_name_enc", "enc-name");
        row.put("family_phone_enc", "enc-phone");
        row.put("relationship", "女儿");
        row.put("elder_name_enc", "enc-elder-name");
        row.put("archive_no", "A001");
        row.put("invitation_code", "INV001");
        row.put("bound_at", "2026-05-26 10:00:00");
        row.put("status", "ACTIVE");
        when(jdbc.queryForList(contains("from family_binding"))).thenReturn(List.of(row));

        List<FamilyBindingAdminDto> result = service.listBindings();

        assertEquals(1, result.size());
        assertEquals("binding-1", result.get(0).getId());
        assertEquals("李奶奶", result.get(0).getFamilyName());
        assertEquals("138****0000", result.get(0).getFamilyPhoneMasked());
        assertEquals("女儿", result.get(0).getRelationship());
        assertEquals("李奶奶", result.get(0).getElderName());
        assertEquals("A001", result.get(0).getElderArchiveNo());
        assertEquals("INV001", result.get(0).getInvitationCode());
        assertEquals("2026-05-26 10:00:00", result.get(0).getBoundAt());
        assertEquals("ACTIVE", result.get(0).getStatus());
    }

    @Test
    void listBindingsReturnsEmptyList() {
        when(jdbc.queryForList(contains("from family_binding"))).thenReturn(Collections.emptyList());

        List<FamilyBindingAdminDto> result = service.listBindings();

        assertTrue(result.isEmpty());
    }

    @Test
    void unbindCallsJdbcUpdate() {
        service.unbind("binding-1");

        verify(jdbc).update(contains("update family_binding"), eq("binding-1"));
    }

    @Test
    void resolveFamilyOperatorReturnsPhoneFromBearerToken() {
        when(jwtTokenProvider.getSubject("valid-token")).thenReturn("13800000000");

        String result = service.resolveFamilyOperator("Bearer valid-token");

        assertEquals("13800000000", result);
    }

    @Test
    void resolveFamilyOperatorReturnsDefaultForNullAuth() {
        String result = service.resolveFamilyOperator(null);

        assertEquals("family-user", result);
    }

    @Test
    void resolveFamilyOperatorReturnsDefaultForInvalidAuth() {
        String result = service.resolveFamilyOperator("Token abc");

        assertEquals("family-user", result);
    }

    @Test
    void resolveFamilyOperatorReturnsDefaultForEmptyAuth() {
        String result = service.resolveFamilyOperator("");

        assertEquals("family-user", result);
    }

    @Test
    void resolveFamilyUserIdThrowsForNullAuth() {
        BizException ex = assertThrows(BizException.class, () -> service.myElders(null));
        assertEquals(401, ex.getCode());
        assertEquals("未登录或 Token 无效", ex.getMessage());
    }

    @Test
    void resolveFamilyUserIdThrowsForNonBearerAuth() {
        BizException ex = assertThrows(BizException.class, () -> service.myElders("Token abc"));
        assertEquals(401, ex.getCode());
        assertEquals("未登录或 Token 无效", ex.getMessage());
    }

    @Test
    void checkBindingThrowsWhenNotBound() {
        String auth = "Bearer test-token";
        stubAuth(auth, "13800000000", "user-1");
        when(data.isFamilyBound("user-1", "elder-1")).thenReturn(false);

        BizException ex = assertThrows(BizException.class, () -> service.elderDetail("elder-1", auth));
        assertEquals(403, ex.getCode());
        assertEquals("无权访问该老人信息", ex.getMessage());
    }
}
