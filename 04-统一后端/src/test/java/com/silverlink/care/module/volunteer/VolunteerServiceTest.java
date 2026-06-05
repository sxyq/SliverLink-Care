package com.silverlink.care.module.volunteer;

import com.silverlink.care.common.BizException;
import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import com.silverlink.care.module.qrcode.QrCodeEntity;
import com.silverlink.care.module.qrcode.QrCodeIssueResult;
import com.silverlink.care.module.qrcode.QrCodeService;
import com.silverlink.care.module.review.AdminReviewRequestService;
import com.silverlink.care.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class VolunteerServiceTest {

    private SilverLinkDataService data;
    private QrCodeService qrCodeService;
    private JwtTokenProvider jwtTokenProvider;
    private AdminReviewRequestService reviewRequestService;
    private VolunteerService service;

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @BeforeEach
    void setUp() {
        data = mock(SilverLinkDataService.class);
        qrCodeService = mock(QrCodeService.class);
        jwtTokenProvider = mock(JwtTokenProvider.class);
        reviewRequestService = mock(AdminReviewRequestService.class);
        service = new VolunteerService(data, qrCodeService, jwtTokenProvider, reviewRequestService);

        lenient().when(data.str(any())).thenAnswer(inv -> {
            Object arg = inv.getArgument(0);
            return arg == null ? "" : String.valueOf(arg);
        });
        lenient().when(data.intValue(any())).thenAnswer(inv -> {
            Object arg = inv.getArgument(0);
            if (arg instanceof Number) return ((Number) arg).intValue();
            return 0;
        });
    }

    @Nested
    @DisplayName("getMyElders")
    class GetMyEldersTests {

        @Test
        void delegatesToDataAssignedElders() {
            List<Map<String, Object>> expected = List.of(Map.of("id", "e1", "name", "张三"));
            when(data.assignedElders("vol1")).thenReturn(expected);

            List<Map<String, Object>> result = service.getMyElders("vol1");

            assertEquals(expected, result);
            verify(data).assignedElders("vol1");
        }

        @Test
        void returnsEmptyList() {
            when(data.assignedElders("vol2")).thenReturn(Collections.emptyList());

            List<Map<String, Object>> result = service.getMyElders("vol2");

            assertTrue(result.isEmpty());
        }
    }

    @Nested
    @DisplayName("createMyElder")
    class CreateMyElderTests {

        @Test
        void delegatesToDataCreateElderForVolunteer() {
            Map<String, Object> body = Map.of("name", "李四");
            when(data.createElderForVolunteer("vol1", body)).thenReturn("elder-1");

            String result = service.createMyElder("vol1", body);

            assertEquals("elder-1", result);
            verify(data).createElderForVolunteer("vol1", body);
        }
    }

    @Nested
    @DisplayName("getMyProfile")
    class GetMyProfileTests {

        @Test
        void delegatesToDataVolunteerProfile() {
            Map<String, Object> expected = Map.of("account", "vol1", "name", "王五");
            when(data.volunteerProfile("vol1")).thenReturn(expected);

            Map<String, Object> result = service.getMyProfile("vol1");

            assertEquals(expected, result);
            verify(data).volunteerProfile("vol1");
        }
    }

    @Nested
    @DisplayName("updateMyProfile")
    class UpdateMyProfileTests {

        @Test
        void delegatesToDataUpdateVolunteerProfile() {
            Map<String, Object> body = Map.of("name", "赵六");
            Map<String, Object> expected = Map.of("account", "vol1", "name", "赵六");
            when(data.updateVolunteerProfile("vol1", body)).thenReturn(expected);

            Map<String, Object> result = service.updateMyProfile("vol1", body);

            assertEquals(expected, result);
            verify(data).updateVolunteerProfile("vol1", body);
        }
    }

    @Nested
    @DisplayName("registerWithInvitation")
    class RegisterWithInvitationTests {

        private VolunteerRegisterRequest validRequest() {
            VolunteerRegisterRequest req = new VolunteerRegisterRequest();
            req.setInvitationCode("ABC123");
            req.setAccount("newVol");
            req.setPassword("pass123");
            req.setName("新志愿者");
            req.setPhone("13800000000");
            return req;
        }

        private Map<String, Object> activeInvitation() {
            Map<String, Object> inv = new LinkedHashMap<>();
            inv.put("status", "ACTIVE");
            inv.put("used_count", 0);
            inv.put("max_uses", 10);
            inv.put("expires_at", LocalDateTime.now().plusDays(30).format(FMT));
            inv.put("elder_id", "elder-1");
            return inv;
        }

        @Test
        void blankInvitationCode() {
            VolunteerRegisterRequest req = validRequest();
            req.setInvitationCode("");

            BizException ex = assertThrows(BizException.class, () -> service.registerWithInvitation(req));
            assertEquals(400, ex.getCode());
            assertEquals("请输入邀请码", ex.getMessage());
        }

        @Test
        void nullInvitationCode() {
            VolunteerRegisterRequest req = validRequest();
            req.setInvitationCode(null);

            BizException ex = assertThrows(BizException.class, () -> service.registerWithInvitation(req));
            assertEquals(400, ex.getCode());
            assertEquals("请输入邀请码", ex.getMessage());
        }

        @Test
        void blankAccount() {
            VolunteerRegisterRequest req = validRequest();
            req.setAccount("");

            BizException ex = assertThrows(BizException.class, () -> service.registerWithInvitation(req));
            assertEquals(400, ex.getCode());
            assertEquals("请输入账号", ex.getMessage());
        }

        @Test
        void nullAccount() {
            VolunteerRegisterRequest req = validRequest();
            req.setAccount(null);

            BizException ex = assertThrows(BizException.class, () -> service.registerWithInvitation(req));
            assertEquals(400, ex.getCode());
            assertEquals("请输入账号", ex.getMessage());
        }

        @Test
        void blankPassword() {
            VolunteerRegisterRequest req = validRequest();
            req.setPassword("");

            BizException ex = assertThrows(BizException.class, () -> service.registerWithInvitation(req));
            assertEquals(400, ex.getCode());
            assertEquals("请输入密码", ex.getMessage());
        }

        @Test
        void nullPassword() {
            VolunteerRegisterRequest req = validRequest();
            req.setPassword(null);

            BizException ex = assertThrows(BizException.class, () -> service.registerWithInvitation(req));
            assertEquals(400, ex.getCode());
            assertEquals("请输入密码", ex.getMessage());
        }

        @Test
        void blankName() {
            VolunteerRegisterRequest req = validRequest();
            req.setName("");

            BizException ex = assertThrows(BizException.class, () -> service.registerWithInvitation(req));
            assertEquals(400, ex.getCode());
            assertEquals("请输入姓名", ex.getMessage());
        }

        @Test
        void nullName() {
            VolunteerRegisterRequest req = validRequest();
            req.setName(null);

            BizException ex = assertThrows(BizException.class, () -> service.registerWithInvitation(req));
            assertEquals(400, ex.getCode());
            assertEquals("请输入姓名", ex.getMessage());
        }

        @Test
        void invitationNotActive() {
            VolunteerRegisterRequest req = validRequest();
            Map<String, Object> inv = activeInvitation();
            inv.put("status", "USED");
            when(data.one(startsWith("select * from invitation"), eq("ABC123"))).thenReturn(inv);

            BizException ex = assertThrows(BizException.class, () -> service.registerWithInvitation(req));
            assertEquals(400, ex.getCode());
            assertEquals("邀请码不可用", ex.getMessage());
        }

        @Test
        void invitationStatusNull() {
            VolunteerRegisterRequest req = validRequest();
            Map<String, Object> inv = activeInvitation();
            inv.put("status", null);
            when(data.one(startsWith("select * from invitation"), eq("ABC123"))).thenReturn(inv);

            BizException ex = assertThrows(BizException.class, () -> service.registerWithInvitation(req));
            assertEquals(400, ex.getCode());
            assertEquals("邀请码不可用", ex.getMessage());
        }

        @Test
        void invitationUsedUp() {
            VolunteerRegisterRequest req = validRequest();
            Map<String, Object> inv = activeInvitation();
            inv.put("used_count", 10);
            inv.put("max_uses", 10);
            when(data.one(startsWith("select * from invitation"), eq("ABC123"))).thenReturn(inv);
            when(data.intValue(eq(10))).thenReturn(10);

            BizException ex = assertThrows(BizException.class, () -> service.registerWithInvitation(req));
            assertEquals(400, ex.getCode());
            assertEquals("邀请码已用完", ex.getMessage());
        }

        @Test
        void invitationExpired() {
            VolunteerRegisterRequest req = validRequest();
            Map<String, Object> inv = activeInvitation();
            inv.put("expires_at", LocalDateTime.now().minusDays(1).format(FMT));
            when(data.one(startsWith("select * from invitation"), eq("ABC123"))).thenReturn(inv);

            BizException ex = assertThrows(BizException.class, () -> service.registerWithInvitation(req));
            assertEquals(400, ex.getCode());
            assertEquals("邀请码已过期", ex.getMessage());
        }

        @Test
        void invitationExpiresAtBlank() {
            VolunteerRegisterRequest req = validRequest();
            Map<String, Object> inv = activeInvitation();
            inv.put("expires_at", "");
            when(data.one(startsWith("select * from invitation"), eq("ABC123"))).thenReturn(inv);
            when(data.findUser("newVol", "VOLUNTEER")).thenReturn(Optional.empty());
            when(data.createVolunteer(anyMap())).thenReturn("vol-1");
            when(jwtTokenProvider.generateToken(eq("newVol"), eq("VOLUNTEER"), eq(86400000L))).thenReturn("jwt-token");

            Map<String, String> result = service.registerWithInvitation(req);

            assertTrue(result.containsKey("token"));
        }

        @Test
        void accountAlreadyExists() {
            VolunteerRegisterRequest req = validRequest();
            Map<String, Object> inv = activeInvitation();
            when(data.one(startsWith("select * from invitation"), eq("ABC123"))).thenReturn(inv);
            when(data.findUser("newVol", "VOLUNTEER")).thenReturn(Optional.of(Map.of("id", "u1")));

            BizException ex = assertThrows(BizException.class, () -> service.registerWithInvitation(req));
            assertEquals(400, ex.getCode());
            assertEquals("该账号已存在，请更换后重试", ex.getMessage());
        }

        @Test
        void successfulRegistration() {
            VolunteerRegisterRequest req = validRequest();
            Map<String, Object> inv = activeInvitation();
            when(data.one(startsWith("select * from invitation"), eq("ABC123"))).thenReturn(inv);
            when(data.findUser("newVol", "VOLUNTEER")).thenReturn(Optional.empty());
            when(data.createVolunteer(anyMap())).thenReturn("vol-1");
            when(jwtTokenProvider.generateToken("newVol", "VOLUNTEER", 86400000L)).thenReturn("jwt-token");

            Map<String, String> result = service.registerWithInvitation(req);

            assertEquals("jwt-token", result.get("token"));
            assertEquals("新志愿者", result.get("name"));
            assertEquals("newVol", result.get("account"));
            assertEquals("vol-1", result.get("volunteerId"));
            assertEquals("ABC123", result.get("invitationCode"));
        }

        @Test
        void invitationCodeUppercased() {
            VolunteerRegisterRequest req = validRequest();
            req.setInvitationCode("abc123");
            Map<String, Object> inv = activeInvitation();
            when(data.one(startsWith("select * from invitation"), eq("ABC123"))).thenReturn(inv);
            when(data.findUser("newVol", "VOLUNTEER")).thenReturn(Optional.empty());
            when(data.createVolunteer(anyMap())).thenReturn("vol-1");
            when(jwtTokenProvider.generateToken("newVol", "VOLUNTEER", 86400000L)).thenReturn("jwt-token");

            Map<String, String> result = service.registerWithInvitation(req);

            assertEquals("ABC123", result.get("invitationCode"));
            verify(data).one(startsWith("select * from invitation"), eq("ABC123"));
        }

        @Test
        void createVolunteerCalledWithCorrectArgs() {
            VolunteerRegisterRequest req = validRequest();
            Map<String, Object> inv = activeInvitation();
            when(data.one(startsWith("select * from invitation"), eq("ABC123"))).thenReturn(inv);
            when(data.findUser("newVol", "VOLUNTEER")).thenReturn(Optional.empty());
            when(data.createVolunteer(anyMap())).thenReturn("vol-1");
            when(jwtTokenProvider.generateToken("newVol", "VOLUNTEER", 86400000L)).thenReturn("jwt-token");

            service.registerWithInvitation(req);

            verify(data).createVolunteer(argThat(map -> {
                Object elderIds = map.get("elderIds");
                return "newVol".equals(map.get("account"))
                        && "pass123".equals(map.get("password"))
                        && "新志愿者".equals(map.get("name"))
                        && "13800000000".equals(map.get("phone"))
                        && elderIds instanceof List<?> list
                        && list.size() == 1
                        && "elder-1".equals(list.get(0));
            }));
        }
    }

    @Nested
    @DisplayName("getMyElderQrCode")
    class GetMyElderQrCodeTests {

        private Map<String, Object> buildElder() {
            Map<String, Object> elder = new LinkedHashMap<>();
            elder.put("id", "elder-1");
            elder.put("archiveNo", "A001");
            elder.put("name", "张三");
            elder.put("age", 75);
            elder.put("emergencyContactPhone", "13800001111");
            return elder;
        }

        private QrCodeEntity buildQrEntity() {
            QrCodeEntity entity = new QrCodeEntity();
            entity.setId("qr-1");
            entity.setQrId("QR001");
            entity.setElderId("elder-1");
            entity.setQrToken("token-abc");
            entity.setStatus("ENABLED");
            entity.setCreatedAt("2026-01-01 00:00:00");
            entity.setDisabledAt(null);
            return entity;
        }

        @Test
        void elderNotAssigned() {
            when(data.assignedElders("vol1")).thenReturn(Collections.emptyList());

            BizException ex = assertThrows(BizException.class, () -> service.getMyElderQrCode("vol1", "elder-1"));
            assertEquals(403, ex.getCode());
            assertEquals("无权访问该老人档案", ex.getMessage());
        }

        @Test
        void existingQrCode() throws Exception {
            Map<String, Object> elder = buildElder();
            when(data.assignedElders("vol1")).thenReturn(List.of(elder));
            QrCodeEntity entity = buildQrEntity();
            when(qrCodeService.findCurrentByElder("elder-1")).thenReturn(entity);
            when(qrCodeService.buildPublicUrl("token-abc")).thenReturn("https://example.com/s/token-abc");
            when(reviewRequestService.findPendingByQrCode("qr-1")).thenReturn(null);

            Map<String, Object> result = service.getMyElderQrCode("vol1", "elder-1");

            assertEquals("qr-1", result.get("id"));
            assertEquals("QR001", result.get("qrId"));
            assertEquals("elder-1", result.get("elderId"));
            assertEquals("A001", result.get("archiveNo"));
            assertEquals("张三", result.get("elderName"));
            assertEquals(75, result.get("elderAge"));
            assertEquals("13800001111", result.get("elderPhone"));
            assertEquals("启用", result.get("status"));
            assertEquals("token-abc", result.get("token"));
            assertEquals("https://example.com/s/token-abc", result.get("url"));
            assertEquals("二维码不包含明文身份与健康信息，仅保存加密访问令牌。", result.get("securityNote"));
            verify(qrCodeService, never()).generateWithToken(anyString(), anyString());
        }

        @Test
        void noQrCodeGeneratesNew() throws Exception {
            Map<String, Object> elder = buildElder();
            when(data.assignedElders("vol1")).thenReturn(List.of(elder));
            when(qrCodeService.findCurrentByElder("elder-1")).thenReturn(null);

            QrCodeEntity newEntity = buildQrEntity();
            QrCodeIssueResult issueResult = new QrCodeIssueResult(newEntity, "token-abc", "https://example.com/s/token-abc");
            when(qrCodeService.generateWithToken("elder-1", "A001")).thenReturn(issueResult);
            when(qrCodeService.buildPublicUrl("token-abc")).thenReturn("https://example.com/s/token-abc");
            when(reviewRequestService.findPendingByQrCode("qr-1")).thenReturn(null);

            Map<String, Object> result = service.getMyElderQrCode("vol1", "elder-1");

            assertEquals("qr-1", result.get("id"));
            verify(qrCodeService).generateWithToken("elder-1", "A001");
        }

        @Test
        void qrCodeTokenBlank() throws Exception {
            Map<String, Object> elder = buildElder();
            when(data.assignedElders("vol1")).thenReturn(List.of(elder));
            QrCodeEntity entity = buildQrEntity();
            entity.setQrToken("");
            when(qrCodeService.findCurrentByElder("elder-1")).thenReturn(entity);

            QrCodeEntity newEntity = buildQrEntity();
            newEntity.setQrToken("new-token");
            QrCodeIssueResult issueResult = new QrCodeIssueResult(newEntity, "new-token", "https://example.com/s/new-token");
            when(qrCodeService.generateWithToken("elder-1", "A001")).thenReturn(issueResult);
            when(qrCodeService.buildPublicUrl("new-token")).thenReturn("https://example.com/s/new-token");
            when(reviewRequestService.findPendingByQrCode("qr-1")).thenReturn(null);

            service.getMyElderQrCode("vol1", "elder-1");

            verify(qrCodeService).generateWithToken("elder-1", "A001");
        }

        @Test
        void qrCodeTokenNull() throws Exception {
            Map<String, Object> elder = buildElder();
            when(data.assignedElders("vol1")).thenReturn(List.of(elder));
            QrCodeEntity entity = buildQrEntity();
            entity.setQrToken(null);
            when(qrCodeService.findCurrentByElder("elder-1")).thenReturn(entity);

            QrCodeEntity newEntity = buildQrEntity();
            newEntity.setQrToken("new-token");
            QrCodeIssueResult issueResult = new QrCodeIssueResult(newEntity, "new-token", "https://example.com/s/new-token");
            when(qrCodeService.generateWithToken("elder-1", "A001")).thenReturn(issueResult);
            when(qrCodeService.buildPublicUrl("new-token")).thenReturn("https://example.com/s/new-token");
            when(reviewRequestService.findPendingByQrCode("qr-1")).thenReturn(null);

            service.getMyElderQrCode("vol1", "elder-1");

            verify(qrCodeService).generateWithToken("elder-1", "A001");
        }

        @Test
        void withPendingReview() throws Exception {
            Map<String, Object> elder = buildElder();
            when(data.assignedElders("vol1")).thenReturn(List.of(elder));
            QrCodeEntity entity = buildQrEntity();
            when(qrCodeService.findCurrentByElder("elder-1")).thenReturn(entity);
            when(qrCodeService.buildPublicUrl("token-abc")).thenReturn("https://example.com/s/token-abc");
            Map<String, Object> pendingReview = Map.of("status", "PENDING", "id", "review-1");
            when(reviewRequestService.findPendingByQrCode("qr-1")).thenReturn(pendingReview);

            Map<String, Object> result = service.getMyElderQrCode("vol1", "elder-1");

            assertEquals("PENDING", result.get("disableReviewStatus"));
            assertEquals("review-1", result.get("disableReviewId"));
            assertEquals("停用申请审核中。审核通过前二维码仍保持启用。", result.get("reviewMessage"));
        }
    }

    @Nested
    @DisplayName("regenerateMyElderQrCode")
    class RegenerateMyElderQrCodeTests {

        private Map<String, Object> buildElder() {
            Map<String, Object> elder = new LinkedHashMap<>();
            elder.put("id", "elder-1");
            elder.put("archiveNo", "A001");
            elder.put("name", "张三");
            elder.put("age", 75);
            elder.put("emergencyContactPhone", "13800001111");
            return elder;
        }

        private QrCodeEntity buildQrEntity() {
            QrCodeEntity entity = new QrCodeEntity();
            entity.setId("qr-1");
            entity.setQrId("QR001");
            entity.setElderId("elder-1");
            entity.setQrToken("old-token");
            entity.setStatus("ENABLED");
            entity.setCreatedAt("2026-01-01 00:00:00");
            entity.setDisabledAt(null);
            return entity;
        }

        @Test
        void existingQrCodeRegenerates() throws Exception {
            Map<String, Object> elder = buildElder();
            when(data.assignedElders("vol1")).thenReturn(List.of(elder));
            QrCodeEntity oldEntity = buildQrEntity();
            when(qrCodeService.findCurrentByElder("elder-1")).thenReturn(oldEntity);

            QrCodeEntity newEntity = buildQrEntity();
            newEntity.setQrToken("new-token");
            newEntity.setQrId("QR002");
            QrCodeIssueResult issueResult = new QrCodeIssueResult(newEntity, "new-token", "https://example.com/s/new-token");
            when(qrCodeService.regenerateWithToken("qr-1")).thenReturn(issueResult);
            when(qrCodeService.buildPublicUrl("new-token")).thenReturn("https://example.com/s/new-token");
            when(reviewRequestService.findPendingByQrCode("qr-1")).thenReturn(null);

            Map<String, Object> result = service.regenerateMyElderQrCode("vol1", "elder-1");

            assertEquals("QR002", result.get("qrId"));
            verify(qrCodeService).regenerateWithToken("qr-1");
            verify(qrCodeService, never()).generateWithToken(anyString(), anyString());
        }

        @Test
        void noQrCodeGeneratesNew() throws Exception {
            Map<String, Object> elder = buildElder();
            when(data.assignedElders("vol1")).thenReturn(List.of(elder));
            when(qrCodeService.findCurrentByElder("elder-1")).thenReturn(null);

            QrCodeEntity newEntity = buildQrEntity();
            newEntity.setQrToken("fresh-token");
            QrCodeIssueResult issueResult = new QrCodeIssueResult(newEntity, "fresh-token", "https://example.com/s/fresh-token");
            when(qrCodeService.generateWithToken("elder-1", "A001")).thenReturn(issueResult);
            when(qrCodeService.buildPublicUrl("fresh-token")).thenReturn("https://example.com/s/fresh-token");
            when(reviewRequestService.findPendingByQrCode("qr-1")).thenReturn(null);

            service.regenerateMyElderQrCode("vol1", "elder-1");

            verify(qrCodeService).generateWithToken("elder-1", "A001");
        }

        @Test
        void elderNotAssigned() {
            when(data.assignedElders("vol1")).thenReturn(Collections.emptyList());

            BizException ex = assertThrows(BizException.class, () -> service.regenerateMyElderQrCode("vol1", "elder-1"));
            assertEquals(403, ex.getCode());
        }
    }

    @Nested
    @DisplayName("requestDisableMyElderQrCode")
    class RequestDisableMyElderQrCodeTests {

        private Map<String, Object> buildElder() {
            Map<String, Object> elder = new LinkedHashMap<>();
            elder.put("id", "elder-1");
            elder.put("archiveNo", "A001");
            elder.put("name", "张三");
            elder.put("age", 75);
            elder.put("emergencyContactPhone", "13800001111");
            return elder;
        }

        private QrCodeEntity buildQrEntity() {
            QrCodeEntity entity = new QrCodeEntity();
            entity.setId("qr-1");
            entity.setQrId("QR001");
            entity.setElderId("elder-1");
            entity.setQrToken("token-abc");
            entity.setStatus("ENABLED");
            entity.setCreatedAt("2026-01-01 00:00:00");
            entity.setDisabledAt(null);
            return entity;
        }

        @Test
        void createsDisableRequest() {
            Map<String, Object> elder = buildElder();
            when(data.assignedElders("vol1")).thenReturn(List.of(elder));
            QrCodeEntity entity = buildQrEntity();
            when(qrCodeService.findCurrentByElder("elder-1")).thenReturn(entity);
            when(qrCodeService.buildPublicUrl("token-abc")).thenReturn("https://example.com/s/token-abc");

            Map<String, Object> reviewResult = new LinkedHashMap<>();
            reviewResult.put("status", "PENDING");
            reviewResult.put("id", "review-1");
            when(reviewRequestService.createQrDisableRequest("vol1", "VOLUNTEER", "elder-1", entity)).thenReturn(reviewResult);
            when(reviewRequestService.findPendingByQrCode("qr-1")).thenReturn(null);

            Map<String, Object> result = service.requestDisableMyElderQrCode("vol1", "elder-1");

            assertEquals("PENDING", result.get("disableReviewStatus"));
            assertEquals("review-1", result.get("disableReviewId"));
            assertEquals("停用申请已提交，等待管理员审核。审核通过前二维码仍保持启用。", result.get("reviewMessage"));
            verify(reviewRequestService).createQrDisableRequest("vol1", "VOLUNTEER", "elder-1", entity);
        }

        @Test
        void noQrCodeThrows404() {
            Map<String, Object> elder = buildElder();
            when(data.assignedElders("vol1")).thenReturn(List.of(elder));
            when(qrCodeService.findCurrentByElder("elder-1")).thenReturn(null);

            BizException ex = assertThrows(BizException.class, () -> service.requestDisableMyElderQrCode("vol1", "elder-1"));
            assertEquals(404, ex.getCode());
            assertEquals("当前老人暂无二维码", ex.getMessage());
        }

        @Test
        void elderNotAssigned() {
            when(data.assignedElders("vol1")).thenReturn(Collections.emptyList());

            BizException ex = assertThrows(BizException.class, () -> service.requestDisableMyElderQrCode("vol1", "elder-1"));
            assertEquals(403, ex.getCode());
        }
    }

    @Nested
    @DisplayName("toQrManageMap status mapping")
    class StatusMappingTests {

        private Map<String, Object> buildElder() {
            Map<String, Object> elder = new LinkedHashMap<>();
            elder.put("id", "elder-1");
            elder.put("archiveNo", "A001");
            elder.put("name", "张三");
            elder.put("age", 75);
            elder.put("emergencyContactPhone", "13800001111");
            return elder;
        }

        private QrCodeEntity buildEntityWithStatus(String status) {
            QrCodeEntity entity = new QrCodeEntity();
            entity.setId("qr-1");
            entity.setQrId("QR001");
            entity.setElderId("elder-1");
            entity.setQrToken("token-abc");
            entity.setStatus(status);
            entity.setCreatedAt("2026-01-01 00:00:00");
            entity.setDisabledAt(null);
            return entity;
        }

        @Test
        void disabledStatus() throws Exception {
            Map<String, Object> elder = buildElder();
            when(data.assignedElders("vol1")).thenReturn(List.of(elder));
            when(qrCodeService.findCurrentByElder("elder-1")).thenReturn(buildEntityWithStatus("DISABLED"));
            when(qrCodeService.buildPublicUrl("token-abc")).thenReturn("https://example.com/s/token-abc");
            when(reviewRequestService.findPendingByQrCode("qr-1")).thenReturn(null);

            Map<String, Object> result = service.getMyElderQrCode("vol1", "elder-1");

            assertEquals("已停用", result.get("status"));
        }

        @Test
        void regeneratedStatus() throws Exception {
            Map<String, Object> elder = buildElder();
            when(data.assignedElders("vol1")).thenReturn(List.of(elder));
            when(qrCodeService.findCurrentByElder("elder-1")).thenReturn(buildEntityWithStatus("REGENERATED"));
            when(qrCodeService.buildPublicUrl("token-abc")).thenReturn("https://example.com/s/token-abc");
            when(reviewRequestService.findPendingByQrCode("qr-1")).thenReturn(null);

            Map<String, Object> result = service.getMyElderQrCode("vol1", "elder-1");

            assertEquals("已重新生成", result.get("status"));
        }

        @Test
        void enabledStatus() throws Exception {
            Map<String, Object> elder = buildElder();
            when(data.assignedElders("vol1")).thenReturn(List.of(elder));
            when(qrCodeService.findCurrentByElder("elder-1")).thenReturn(buildEntityWithStatus("ENABLED"));
            when(qrCodeService.buildPublicUrl("token-abc")).thenReturn("https://example.com/s/token-abc");
            when(reviewRequestService.findPendingByQrCode("qr-1")).thenReturn(null);

            Map<String, Object> result = service.getMyElderQrCode("vol1", "elder-1");

            assertEquals("启用", result.get("status"));
        }

        @Test
        void otherStatusDefaultsToEnabled() throws Exception {
            Map<String, Object> elder = buildElder();
            when(data.assignedElders("vol1")).thenReturn(List.of(elder));
            when(qrCodeService.findCurrentByElder("elder-1")).thenReturn(buildEntityWithStatus("UNKNOWN"));
            when(qrCodeService.buildPublicUrl("token-abc")).thenReturn("https://example.com/s/token-abc");
            when(reviewRequestService.findPendingByQrCode("qr-1")).thenReturn(null);

            Map<String, Object> result = service.getMyElderQrCode("vol1", "elder-1");

            assertEquals("启用", result.get("status"));
        }
    }
}
