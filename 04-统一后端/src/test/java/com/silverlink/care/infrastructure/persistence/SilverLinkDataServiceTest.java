package com.silverlink.care.infrastructure.persistence;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.silverlink.care.common.BizException;
import com.silverlink.care.infrastructure.crypto.AesGcmCryptoService;
import com.silverlink.care.infrastructure.crypto.HashService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SilverLinkDataServiceTest {

    @Mock
    private JdbcTemplate jdbc;

    @Mock
    private AesGcmCryptoService crypto;

    @Mock
    private HashService hashService;

    @InjectMocks
    private SilverLinkDataService service;

    private final ObjectMapper realMapper = new ObjectMapper();

    @BeforeEach
    void setUp() throws Exception {
        ReflectionTestUtils.setField(service, "objectMapper", realMapper);
        lenient().when(crypto.encrypt(anyString())).thenAnswer(inv -> "enc:" + inv.getArgument(0));
        lenient().when(crypto.decrypt(argThat(s -> s != null && s.startsWith("enc:")))).thenAnswer(inv -> ((String) inv.getArgument(0)).substring(4));
        lenient().when(crypto.decrypt(argThat(s -> s != null && !s.startsWith("enc:") && !s.isBlank()))).thenThrow(new Exception("not encrypted"));
        lenient().when(hashService.sha256(anyString())).thenAnswer(inv -> "hash:" + inv.getArgument(0));
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private Map<String, Object> fullElderRow() {
        Map<String, Object> row = new HashMap<>();
        row.put("id", "e1");
        row.put("archive_no", "A001");
        row.put("name_enc", "enc:张三");
        row.put("gender", "男");
        row.put("age", 75);
        row.put("residence_enc", "enc:北京");
        row.put("emergency_contact_name_enc", "enc:李四");
        row.put("emergency_phone_enc", "enc:13812345678");
        row.put("backup_contact_name_enc", "enc:王五");
        row.put("backup_phone_enc", "enc:13987654321");
        row.put("relationship", "子女");
        row.put("abo_type", "A");
        row.put("rh_type", "+");
        row.put("allergy_enc", "enc:无");
        row.put("status", "ACTIVE");
        return row;
    }

    @Nested
    class StrMethod {
        @Test
        void nullReturnsEmpty() {
            assertEquals("", service.str(null));
        }

        @Test
        void nonNullReturnsString() {
            assertEquals("123", service.str(123));
            assertEquals("hello", service.str("hello"));
        }
    }

    @Nested
    class ValueMethod {
        @Test
        void keyExistsNonBlank() {
            Map<String, Object> map = Map.of("name", "Alice");
            assertEquals("Alice", service.value(map, "name", "fallback"));
        }

        @Test
        void keyExistsBlankReturnsFallback() {
            Map<String, Object> map = new HashMap<>();
            map.put("name", "");
            assertEquals("fallback", service.value(map, "name", "fallback"));
        }

        @Test
        void keyMissingReturnsFallback() {
            Map<String, Object> map = new HashMap<>();
            assertEquals("fallback", service.value(map, "name", "fallback"));
        }

        @Test
        void keyNullReturnsFallback() {
            Map<String, Object> map = new HashMap<>();
            map.put("name", null);
            assertEquals("fallback", service.value(map, "name", "fallback"));
        }
    }

    @Nested
    class IntValueMethod {
        @Test
        void nullReturnsZero() {
            assertEquals(0, service.intValue(null));
        }

        @Test
        void numberReturnsInt() {
            assertEquals(42, service.intValue(42));
            assertEquals(42, service.intValue(42L));
            assertEquals(42, service.intValue(42.5));
        }

        @Test
        void stringNumberReturnsInt() {
            assertEquals(42, service.intValue("42"));
        }

        @Test
        void invalidStringReturnsZero() {
            assertEquals(0, service.intValue("abc"));
        }
    }

    @Nested
    class DecimalMethod {
        @Test
        void nullReturnsZero() {
            assertEquals(BigDecimal.ZERO, service.decimal(null));
        }

        @Test
        void blankStringReturnsZero() {
            assertEquals(BigDecimal.ZERO, service.decimal("  "));
        }

        @Test
        void bigDecimalReturnsSame() {
            BigDecimal bd = new BigDecimal("3.14");
            assertEquals(bd, service.decimal(bd));
        }

        @Test
        void numberReturnsBigDecimal() {
            assertEquals(BigDecimal.valueOf(3.14), service.decimal(3.14));
        }

        @Test
        void stringParsesToBigDecimal() {
            assertEquals(new BigDecimal("3.14"), service.decimal("3.14"));
        }

        @Test
        void invalidStringReturnsZero() {
            assertEquals(BigDecimal.ZERO, service.decimal("abc"));
        }
    }

    @Nested
    class MaskPhoneMethod {
        @Test
        void nullReturnsMask() {
            assertEquals("****", service.maskPhone(null));
        }

        @Test
        void shortReturnsMask() {
            assertEquals("****", service.maskPhone("123"));
        }

        @Test
        void validPhoneMasks() {
            assertEquals("138****5678", service.maskPhone("13812345678"));
        }
    }

    @Nested
    class MaskNameMethod {
        @Test
        void nullReturnsStar() {
            assertEquals("*", service.maskName(null));
        }

        @Test
        void blankReturnsStar() {
            assertEquals("*", service.maskName(""));
        }

        @Test
        void singleCharReturnsStar() {
            assertEquals("*", service.maskName("A"));
        }

        @Test
        void multiCharMasks() {
            assertEquals("张**", service.maskName("张三丰"));
        }
    }

    @Nested
    class MaskIdCardMethod {
        @Test
        void nullReturnsEmpty() {
            assertEquals("", service.maskIdCard(null));
        }

        @Test
        void blankReturnsEmpty() {
            assertEquals("", service.maskIdCard(""));
        }

        @Test
        void shortReturnsSame() {
            assertEquals("12345678", service.maskIdCard("12345678"));
        }

        @Test
        void longIdCardMasks() {
            assertEquals("1101********1234", service.maskIdCard("110101199001011234"));
        }
    }

    @Nested
    class EncMethod {
        @Test
        void nullReturnsEmpty() {
            assertEquals("", service.enc(null));
        }

        @Test
        void blankReturnsEmpty() {
            assertEquals("", service.enc(""));
        }

        @Test
        void alreadyEncryptedReturnsSame() throws Exception {
            when(crypto.decrypt("enc:hello")).thenReturn("hello");
            assertEquals("enc:hello", service.enc("enc:hello"));
        }

        @Test
        void plainTextEncrypts() {
            assertEquals("enc:hello", service.enc("hello"));
        }

        @Test
        void encryptFailureThrows() throws Exception {
            reset(crypto);
            when(crypto.decrypt(anyString())).thenThrow(new Exception("not encrypted"));
            when(crypto.encrypt(anyString())).thenThrow(new RuntimeException("encrypt failed"));
            assertThrows(RuntimeException.class, () -> service.enc("hello"));
        }
    }

    @Nested
    class DecMethod {
        @Test
        void nullObjectReturnsEmpty() {
            assertEquals("", service.dec(null));
        }

        @Test
        void blankReturnsEmpty() {
            assertEquals("", service.dec(""));
        }

        @Test
        void encryptedDecrypts() throws Exception {
            when(crypto.decrypt("enc:hello")).thenReturn("hello");
            assertEquals("hello", service.dec("enc:hello"));
        }

        @Test
        void decryptFailureReturnsRaw() {
            assertEquals("plaintext", service.dec("plaintext"));
        }
    }

    @Nested
    class HashMethod {
        @Test
        void nullHashesEmpty() {
            assertEquals("hash:", service.hash(null));
        }

        @Test
        void nonNullHashes() {
            assertEquals("hash:abc", service.hash("abc"));
        }
    }

    @Nested
    class CurrentOperatorMethod {
        @Test
        void noAuthReturnsSystem() {
            assertEquals("system", service.currentOperator());
        }

        @Test
        void withAuthReturnsName() {
            Authentication auth = new TestingAuthenticationToken("admin", "pass", "ROLE_ADMIN");
            SecurityContextHolder.getContext().setAuthentication(auth);
            assertEquals("admin", service.currentOperator());
        }
    }

    @Nested
    class FormatVolunteerLabelMethod {
        @Test
        void bothNonBlank() {
            String result = ReflectionTestUtils.invokeMethod(service, "formatVolunteerLabel", "张三", "vol001");
            assertEquals("张三 / vol001", result);
        }

        @Test
        void onlyName() {
            String result = ReflectionTestUtils.invokeMethod(service, "formatVolunteerLabel", "张三", "");
            assertEquals("张三", result);
        }

        @Test
        void onlyAccount() {
            String result = ReflectionTestUtils.invokeMethod(service, "formatVolunteerLabel", "", "vol001");
            assertEquals("vol001", result);
        }

        @Test
        void bothBlank() {
            String result = ReflectionTestUtils.invokeMethod(service, "formatVolunteerLabel", "", "");
            assertEquals("", result);
        }
    }

    @Nested
    class LoginMethod {
        @Test
        void noUserReturnsEmpty() {
            when(jdbc.queryForList(anyString(), (Object) any(), (Object) any())).thenReturn(Collections.emptyList());
            assertTrue(service.login("a", "p", "ADMIN").isEmpty());
        }

        @Test
        void passwordMismatchReturnsEmpty() {
            Map<String, Object> user = new HashMap<>();
            user.put("password_hash", "correct");
            when(jdbc.queryForList(anyString(), (Object) any(), (Object) any())).thenReturn(List.of(user));
            assertTrue(service.login("a", "wrong", "ADMIN").isEmpty());
        }

        @Test
        void matchReturnsUser() {
            Map<String, Object> user = new HashMap<>();
            user.put("password_hash", "pass123");
            user.put("account", "admin1");
            when(jdbc.queryForList(anyString(), (Object) any(), (Object) any())).thenReturn(List.of(user));
            Optional<Map<String, Object>> result = service.login("admin1", "pass123", "ADMIN");
            assertTrue(result.isPresent());
            assertEquals("admin1", result.get().get("account"));
        }
    }

    @Nested
    class FindUserMethod {
        @Test
        void notFoundReturnsEmpty() {
            when(jdbc.queryForList(anyString(), (Object) any(), (Object) any())).thenReturn(Collections.emptyList());
            assertTrue(service.findUser("a", "ADMIN").isEmpty());
        }

        @Test
        void foundReturnsUser() {
            Map<String, Object> user = Map.of("account", "admin1");
            when(jdbc.queryForList(anyString(), (Object) any(), (Object) any())).thenReturn(List.of(user));
            assertTrue(service.findUser("admin1", "ADMIN").isPresent());
        }
    }

    @Nested
    class DashboardMethod {
        @Test
        void returnsAllMetrics() {
            when(jdbc.queryForObject(contains("elder"), eq(Integer.class))).thenReturn(10, 8);
            when(jdbc.queryForObject(contains("app_user"), eq(Integer.class))).thenReturn(5, 3);
            when(jdbc.queryForObject(contains("qr_code"), eq(Integer.class))).thenReturn(20);
            when(jdbc.queryForObject(contains("audit_log"), eq(Integer.class))).thenReturn(100);
            Map<String, Object> dash = service.dashboard();
            assertEquals(6, dash.size());
            assertTrue(dash.containsKey("elderCount"));
        }
    }

    @Nested
    class EldersForAdminMethod {
        @Test
        void returnsMappedList() throws Exception {
            Map<String, Object> row = fullElderRow();
            row.put("volunteer_account", "vol1");
            row.put("volunteer_name_enc", "enc:志愿者1");
            when(jdbc.queryForList(anyString())).thenReturn(List.of(row));
            when(crypto.decrypt("enc:志愿者1")).thenReturn("志愿者1");

            List<Map<String, Object>> result = service.eldersForAdmin();
            assertEquals(1, result.size());
            assertEquals("e1", result.get(0).get("id"));
            assertEquals("张三", result.get(0).get("name"));
        }
    }

    @Nested
    class ElderDetailMethod {
        @Test
        void returnsMaskedRow() throws Exception {
            Map<String, Object> row = fullElderRow();
            when(jdbc.queryForList(anyString(), (Object) any())).thenReturn(List.of(row));

            Map<String, Object> detail = service.elderDetail("e1", true);
            assertEquals("e1", detail.get("id"));
            assertEquals("张**", detail.get("name"));
        }

        @Test
        void returnsUnmaskedRow() throws Exception {
            Map<String, Object> row = fullElderRow();
            when(jdbc.queryForList(anyString(), (Object) any())).thenReturn(List.of(row));

            Map<String, Object> detail = service.elderDetail("e1", false);
            assertEquals("张三", detail.get("name"));
        }
    }

    @Nested
    class CreateElderMethod {
        @Test
        void insertsAndReturnsId() {
            when(jdbc.update(anyString(), (Object) any(), (Object) any(), (Object) any(), (Object) any(),
                    (Object) any(), (Object) any(), (Object) any(), (Object) any(), (Object) any(),
                    (Object) any(), (Object) any(), (Object) any(), (Object) any(), (Object) any())).thenReturn(1);
            String id = service.createElder(new HashMap<>());
            assertNotNull(id);
            assertTrue(id.startsWith("elder-"));
        }

        @Test
        void usesProvidedArchiveNo() {
            Map<String, Object> body = Map.of("archiveNo", "A999", "name", "测试");
            when(jdbc.update(anyString(), (Object) any(), (Object) any(), (Object) any(), (Object) any(),
                    (Object) any(), (Object) any(), (Object) any(), (Object) any(), (Object) any(),
                    (Object) any(), (Object) any(), (Object) any(), (Object) any(), (Object) any())).thenReturn(1);
            String id = service.createElder(body);
            assertNotNull(id);
        }
    }

    @Nested
    class CreateElderForVolunteerMethod {
        @Test
        void createsElderAndScope() {
            Map<String, Object> user = Map.of("id", "u1");
            when(jdbc.update(anyString(), (Object) any(), (Object) any(), (Object) any(), (Object) any(),
                    (Object) any(), (Object) any(), (Object) any(), (Object) any(), (Object) any(),
                    (Object) any(), (Object) any(), (Object) any(), (Object) any(), (Object) any())).thenReturn(1);
            when(jdbc.queryForList(anyString(), (Object) any())).thenReturn(List.of(user));
            when(jdbc.update(anyString(), (Object) any(), (Object) any(), (Object) any())).thenReturn(1);
            String id = service.createElderForVolunteer("vol1", new HashMap<>());
            assertNotNull(id);
            assertTrue(id.startsWith("elder-"));
        }
    }

    @Nested
    class UpdateElderMethod {
        @Test
        void updatesRecord() {
            when(jdbc.update(anyString(), (Object) any(), (Object) any(), (Object) any(), (Object) any(),
                    (Object) any(), (Object) any(), (Object) any(), (Object) any(), (Object) any(),
                    (Object) any(), (Object) any(), (Object) any())).thenReturn(1);
            Map<String, Object> body = new HashMap<>();
            body.put("name", "张三");
            assertDoesNotThrow(() -> service.updateElder("e1", body));
        }
    }

    @Nested
    class DeleteElderMethod {
        @Test
        void setsStatusDisabled() {
            when(jdbc.update(anyString(), (Object) any())).thenReturn(1);
            assertDoesNotThrow(() -> service.deleteElder("e1"));
        }
    }

    @Nested
    class SetElderStatusMethod {
        @Test
        void activeNormalizes() {
            when(jdbc.update(anyString(), (Object) any(), (Object) any())).thenReturn(1);
            assertDoesNotThrow(() -> service.setElderStatus("e1", "active"));
        }

        @Test
        void otherBecomesDisabled() {
            when(jdbc.update(anyString(), (Object) any(), (Object) any())).thenReturn(1);
            assertDoesNotThrow(() -> service.setElderStatus("e1", "INACTIVE"));
        }
    }

    @Nested
    class VolunteersMethod {
        @Test
        void returnsMappedList() throws Exception {
            Map<String, Object> row = new HashMap<>();
            row.put("id", "v1");
            row.put("name_enc", "enc:志愿者1");
            row.put("phone_enc", "enc:13812345678");
            row.put("account", "vol1");
            row.put("status", "ACTIVE");
            when(jdbc.queryForList(anyString())).thenReturn(List.of(row));
            when(jdbc.queryForList(contains("volunteer_elder_scope"), (Object) any())).thenReturn(List.of(Map.of(
                    "id", "elder-1",
                    "archive_no", "A001",
                    "name_enc", "enc:李奶奶"
            )));
            when(crypto.decrypt("enc:志愿者1")).thenReturn("志愿者1");
            when(crypto.decrypt("enc:13812345678")).thenReturn("13812345678");
            when(crypto.decrypt("enc:李奶奶")).thenReturn("李奶奶");

            List<Map<String, Object>> result = service.volunteers();
            assertEquals(1, result.size());
            assertEquals("v1", result.get(0).get("id"));
            assertEquals(1, result.get(0).get("scopeCount"));
            assertEquals(List.of("elder-1"), result.get(0).get("assignedElderIds"));
        }
    }

    @Nested
    class CreateVolunteerMethod {
        @Test
        void createsWithoutScope() {
            when(jdbc.update(anyString(), (Object) any(), (Object) any(), (Object) any(), (Object) any(),
                    (Object) any(), (Object) any())).thenReturn(1);
            String id = service.createVolunteer(new HashMap<>());
            assertTrue(id.startsWith("vol-"));
        }

        @Test
        void createsWithScope() {
            Map<String, Object> body = new HashMap<>();
            body.put("elderIds", List.of("e1", "e2"));
            when(jdbc.update(anyString(), (Object) any(), (Object) any(), (Object) any(), (Object) any(),
                    (Object) any(), (Object) any())).thenReturn(1);
            when(jdbc.update(anyString(), (Object) any())).thenReturn(1);
            when(jdbc.update(anyString(), (Object) any(), (Object) any())).thenReturn(1);
            when(jdbc.update(anyString(), (Object) any(), (Object) any(), (Object) any())).thenReturn(1);
            String id = service.createVolunteer(body);
            assertTrue(id.startsWith("vol-"));
        }

        @Test
        void rejectsExistingAccountBeforeInsert() {
            when(jdbc.queryForList(anyString(), eq("vol1"), eq("VOLUNTEER")))
                    .thenReturn(List.of(Map.of("id", "existing-volunteer")));

            BizException exception = assertThrows(BizException.class,
                    () -> service.createVolunteer(Map.of("account", "vol1")));

            assertEquals("该登录账号已存在，请更换后重试", exception.getMessage());
            verify(jdbc, never()).update(startsWith("insert into app_user"), any(), any(), any(), any(), any());
        }

        @Test
        void translatesConcurrentDuplicateInsertIntoBusinessError() {
            when(jdbc.update(startsWith("insert into app_user"), any(), any(), any(), any(), any()))
                    .thenThrow(new DuplicateKeyException("duplicate"));

            BizException exception = assertThrows(BizException.class,
                    () -> service.createVolunteer(Map.of("account", "vol2")));

            assertEquals("该登录账号已存在，请更换后重试", exception.getMessage());
        }
    }

    @Nested
    class UpdateVolunteerMethod {
        @Test
        void updateWithoutPassword() throws Exception {
            Map<String, Object> existing = new HashMap<>();
            existing.put("account", "vol1");
            existing.put("name_enc", "enc:旧名");
            existing.put("phone_enc", "enc:13800001111");
            existing.put("status", "ACTIVE");
            when(jdbc.queryForList(anyString(), (Object) any())).thenReturn(List.of(existing));
            when(crypto.decrypt("enc:旧名")).thenReturn("旧名");
            when(crypto.decrypt("enc:13800001111")).thenReturn("13800001111");
            when(jdbc.update(anyString(), (Object) any(), (Object) any(), (Object) any(), (Object) any(), (Object) any())).thenReturn(1);

            Map<String, Object> body = Map.of("name", "新名");
            assertDoesNotThrow(() -> service.updateVolunteer("v1", body));
        }

        @Test
        void updateWithPassword() throws Exception {
            Map<String, Object> existing = new HashMap<>();
            existing.put("account", "vol1");
            existing.put("name_enc", "enc:旧名");
            existing.put("phone_enc", "enc:13800001111");
            existing.put("status", "ACTIVE");
            when(jdbc.queryForList(anyString(), (Object) any())).thenReturn(List.of(existing));
            when(crypto.decrypt("enc:旧名")).thenReturn("旧名");
            when(crypto.decrypt("enc:13800001111")).thenReturn("13800001111");
            when(jdbc.update(anyString(), (Object) any(), (Object) any(), (Object) any(), (Object) any(), (Object) any(), (Object) any())).thenReturn(1);

            Map<String, Object> body = new HashMap<>();
            body.put("password", "NewPass123");
            assertDoesNotThrow(() -> service.updateVolunteer("v1", body));
        }
    }

    @Nested
    class DeleteVolunteerMethod {
        @Test
        void setsStatusDisabled() {
            when(jdbc.update(anyString(), (Object) any())).thenReturn(1);
            assertDoesNotThrow(() -> service.deleteVolunteer("v1"));
        }
    }

    @Nested
    class SetVolunteerScopeMethod {
        @Test
        void deletesOldAndInsertsNew() {
            when(jdbc.update(anyString(), (Object) any())).thenReturn(1);
            when(jdbc.update(anyString(), (Object) any(), (Object) any())).thenReturn(1);
            when(jdbc.update(anyString(), (Object) any(), (Object) any(), (Object) any())).thenReturn(1);
            assertDoesNotThrow(() -> service.setVolunteerScope("v1", List.of("e1", "e2")));
        }
    }

    @Nested
    class AssignedEldersMethod {
        @Test
        void returnsMappedList() throws Exception {
            Map<String, Object> user = Map.of("id", "v1");
            Map<String, Object> elderRow = fullElderRow();
            when(jdbc.queryForList(contains("app_user"), (Object) any())).thenReturn(List.of(user));
            when(jdbc.queryForList(contains("elder e"), (Object) any())).thenReturn(List.of(elderRow));
            when(jdbc.queryForList(contains("health_record"), (Object) any())).thenReturn(Collections.emptyList());

            List<Map<String, Object>> result = service.assignedElders("vol1");
            assertEquals(1, result.size());
        }
    }

    @Nested
    class VolunteerProfileMethod {
        @Test
        void returnsProfile() throws Exception {
            Map<String, Object> row = new HashMap<>();
            row.put("account", "vol1");
            row.put("name_enc", "enc:志愿者1");
            row.put("phone_enc", "enc:13812345678");
            when(jdbc.queryForList(anyString(), (Object) any())).thenReturn(List.of(row));
            when(crypto.decrypt("enc:志愿者1")).thenReturn("志愿者1");
            when(crypto.decrypt("enc:13812345678")).thenReturn("13812345678");

            Map<String, Object> profile = service.volunteerProfile("vol1");
            assertEquals("vol1", profile.get("account"));
            assertEquals("志愿者1", profile.get("name"));
        }
    }

    @Nested
    class UpdateVolunteerProfileMethod {
        private Map<String, Object> existingUser() {
            Map<String, Object> existing = new HashMap<>();
            existing.put("id", "v1");
            existing.put("account", "vol1");
            existing.put("name_enc", "enc:旧名");
            existing.put("phone_enc", "enc:13800001111");
            existing.put("password_hash", "oldpass");
            return existing;
        }

        private void stubExisting() throws Exception {
            when(jdbc.queryForList(anyString(), (Object) any())).thenReturn(List.of(existingUser()));
            when(crypto.decrypt("enc:旧名")).thenReturn("旧名");
            when(crypto.decrypt("enc:13800001111")).thenReturn("13800001111");
        }

        @Test
        void noPasswordChange() throws Exception {
            stubExisting();
            when(jdbc.update(anyString(), (Object) any(), (Object) any(), (Object) any(), (Object) any())).thenReturn(1);
            Map<String, Object> profileRow = new HashMap<>();
            profileRow.put("account", "vol1");
            profileRow.put("name_enc", "enc:新名");
            profileRow.put("phone_enc", "enc:13800001111");
            when(jdbc.queryForList(anyString(), (Object) any())).thenReturn(List.of(existingUser()), List.of(profileRow));

            Map<String, Object> body = Map.of("name", "新名");
            assertDoesNotThrow(() -> service.updateVolunteerProfile("vol1", body));
        }

        @Test
        void passwordChangeWithCorrectCurrent() throws Exception {
            stubExisting();
            when(jdbc.update(anyString(), (Object) any(), (Object) any(), (Object) any(), (Object) any(), (Object) any())).thenReturn(1);
            Map<String, Object> profileRow = new HashMap<>();
            profileRow.put("account", "vol1");
            profileRow.put("name_enc", "enc:旧名");
            profileRow.put("phone_enc", "enc:13800001111");
            when(jdbc.queryForList(anyString(), (Object) any())).thenReturn(List.of(existingUser()), List.of(profileRow));

            Map<String, Object> body = new HashMap<>();
            body.put("currentPassword", "oldpass");
            body.put("password", "newpass123");
            assertDoesNotThrow(() -> service.updateVolunteerProfile("vol1", body));
        }

        @Test
        void passwordChangeWithWrongCurrentThrows() throws Exception {
            stubExisting();
            Map<String, Object> body = new HashMap<>();
            body.put("currentPassword", "wrongpass");
            body.put("password", "newpass123");
            BizException ex = assertThrows(BizException.class, () -> service.updateVolunteerProfile("vol1", body));
            assertEquals(400, ex.getCode());
        }

        @Test
        void passwordChangeWithBlankCurrentThrows() throws Exception {
            stubExisting();
            Map<String, Object> body = new HashMap<>();
            body.put("password", "newpass123");
            BizException ex = assertThrows(BizException.class, () -> service.updateVolunteerProfile("vol1", body));
            assertEquals(400, ex.getCode());
        }

        @Test
        void duplicateAccountThrows() throws Exception {
            stubExisting();
            when(jdbc.queryForList(anyString(), (Object) any()))
                    .thenReturn(List.of(existingUser()), List.of(existingUser()));
            Map<String, Object> body = Map.of("account", "vol2");

            BizException ex = assertThrows(BizException.class, () -> service.updateVolunteerProfile("vol1", body));

            assertEquals(400, ex.getCode());
            assertEquals("该登录账号已存在，请更换后重试", ex.getMessage());
        }
    }

    @Nested
    class HealthMethod {
        @Test
        void emptyReturnsEmptyMap() {
            when(jdbc.queryForList(anyString(), (Object) any())).thenReturn(Collections.emptyList());
            assertTrue(service.health("e1").isEmpty());
        }

        @Test
        void foundReturnsMapped() {
            Map<String, Object> row = new HashMap<>();
            row.put("record_date", "2026-01-01");
            row.put("volunteer", "vol1");
            row.put("height_cm", new BigDecimal("170"));
            row.put("weight_kg", new BigDecimal("65"));
            row.put("waist_cm", new BigDecimal("80"));
            row.put("bmi", new BigDecimal("22.5"));
            row.put("health_self_assessment", "良好");
            row.put("self_care_assessment", "自理");
            row.put("cognitive_screening", "正常");
            row.put("emotion_screening", "正常");
            when(jdbc.queryForList(anyString(), (Object) any())).thenReturn(List.of(row));

            Map<String, Object> result = service.health("e1");
            assertEquals("2026-01-01", result.get("date"));
            assertEquals(new BigDecimal("170"), result.get("heightCm"));
        }
    }

    @Nested
    class MedicationsMethod {
        @Test
        void returnsMappedList() throws Exception {
            Map<String, Object> row = new HashMap<>();
            row.put("id", "m1");
            row.put("name_enc", "enc:阿司匹林");
            row.put("dosage_enc", "enc:100mg");
            row.put("usage_text_enc", "enc:口服");
            row.put("timing_enc", "enc:每日一次");
            row.put("updated_at", "2026-01-01");
            when(jdbc.queryForList(anyString(), (Object) any())).thenReturn(List.of(row));
            when(crypto.decrypt("enc:阿司匹林")).thenReturn("阿司匹林");
            when(crypto.decrypt("enc:100mg")).thenReturn("100mg");
            when(crypto.decrypt("enc:口服")).thenReturn("口服");
            when(crypto.decrypt("enc:每日一次")).thenReturn("每日一次");

            List<Map<String, String>> result = service.medications("e1");
            assertEquals(1, result.size());
            assertEquals("阿司匹林", result.get(0).get("name"));
        }
    }

    @Nested
    class AllMedicationsForAdminMethod {
        @Test
        void returnsMappedList() throws Exception {
            Map<String, Object> row = new HashMap<>();
            row.put("id", "m1");
            row.put("elder_id", "e1");
            row.put("archive_no", "A001");
            row.put("elder_name_enc", "enc:张三");
            row.put("name_enc", "enc:阿司匹林");
            row.put("dosage_enc", "enc:100mg");
            row.put("usage_text_enc", "enc:口服");
            row.put("timing_enc", "enc:每日一次");
            row.put("updated_at", "2026-01-01");
            when(jdbc.queryForList(anyString())).thenReturn(List.of(row));
            when(crypto.decrypt("enc:张三")).thenReturn("张三");
            when(crypto.decrypt("enc:阿司匹林")).thenReturn("阿司匹林");
            when(crypto.decrypt("enc:100mg")).thenReturn("100mg");
            when(crypto.decrypt("enc:口服")).thenReturn("口服");
            when(crypto.decrypt("enc:每日一次")).thenReturn("每日一次");

            List<Map<String, Object>> result = service.allMedicationsForAdmin();
            assertEquals(1, result.size());
            assertEquals("张**", result.get(0).get("elderName"));
        }
    }

    @Nested
    class SaveHealthMethod {
        @Test
        void insertsRecord() {
            when(jdbc.update(anyString(), (Object) any(), (Object) any(), (Object) any(), (Object) any(),
                    (Object) any(), (Object) any(), (Object) any(), (Object) any(), (Object) any(),
                    (Object) any(), (Object) any(), (Object) any())).thenReturn(1);
            Map<String, Object> data = new HashMap<>();
            data.put("date", "2026-01-01");
            assertDoesNotThrow(() -> service.saveHealth("e1", data));
        }
    }

    @Nested
    class SaveMedicationListMethod {
        @Test
        void deletesOldAndAddsNew() {
            when(jdbc.update(anyString(), (Object) any())).thenReturn(1);
            when(jdbc.update(anyString(), (Object) any(), (Object) any(), (Object) any(), (Object) any(),
                    (Object) any(), (Object) any())).thenReturn(1);
            Map<String, String> item = new LinkedHashMap<>();
            item.put("name", "阿司匹林");
            item.put("dosage", "100mg");
            item.put("usage", "口服");
            item.put("timing", "每日一次");
            assertDoesNotThrow(() -> service.saveMedicationList("e1", List.of(item)));
        }
    }

    @Nested
    class AddMedicationMethod {
        @Test
        void insertsAndReturnsId() {
            when(jdbc.update(anyString(), (Object) any(), (Object) any(), (Object) any(), (Object) any(),
                    (Object) any(), (Object) any())).thenReturn(1);
            Map<String, String> item = Map.of("name", "阿司匹林", "dosage", "100mg", "usage", "口服");
            Map<String, String> result = service.addMedication("e1", item);
            assertTrue(result.containsKey("id"));
        }
    }

    @Nested
    class UpdateMedicationMethod {
        @Test
        void updatesRecord() {
            when(jdbc.update(anyString(), (Object) any(), (Object) any(), (Object) any(), (Object) any(), (Object) any())).thenReturn(1);
            Map<String, String> item = Map.of("name", "新药", "dosage", "200mg", "usage", "外用");
            assertDoesNotThrow(() -> service.updateMedication("m1", item));
        }
    }

    @Nested
    class DeleteMedicationMethod {
        @Test
        void deletesRecord() {
            when(jdbc.update(anyString(), (Object) any())).thenReturn(1);
            assertDoesNotThrow(() -> service.deleteMedication("m1"));
        }
    }

    @Nested
    class SaveScalesMethod {
        @Test
        void deletesOldAndInsertsNew() {
            when(jdbc.update(anyString(), (Object) any(), (Object) any())).thenReturn(1);
            when(jdbc.update(anyString(), (Object) any(), (Object) any(), (Object) any(), (Object) any(),
                    (Object) any(), (Object) any(), (Object) any())).thenReturn(1);
            Map<String, Object> scale = new HashMap<>();
            scale.put("name", "PHQ-9");
            scale.put("score", 10);
            scale.put("date", "2026-01-01");
            assertDoesNotThrow(() -> service.saveScales("e1", List.of(scale)));
        }

        @Test
        void usesScaleKeyFallback() {
            when(jdbc.update(anyString(), (Object) any(), (Object) any())).thenReturn(1);
            when(jdbc.update(anyString(), (Object) any(), (Object) any(), (Object) any(), (Object) any(),
                    (Object) any(), (Object) any(), (Object) any())).thenReturn(1);
            Map<String, Object> scale = new HashMap<>();
            scale.put("scale", "GAD-7");
            scale.put("score", 5);
            assertDoesNotThrow(() -> service.saveScales("e1", List.of(scale)));
        }
    }

    @Nested
    class ScalesMethod {
        @Test
        void returnsMappedList() throws Exception {
            Map<String, Object> row = new HashMap<>();
            row.put("id", "s1");
            row.put("scale_name", "PHQ-9");
            row.put("score", 10);
            row.put("record_date", "2026-01-01");
            row.put("volunteer", "vol1");
            row.put("payload_enc", "enc:{}");
            when(jdbc.queryForList(anyString(), (Object) any())).thenReturn(List.of(row));
            when(crypto.decrypt("enc:{}")).thenReturn("{}");

            List<Map<String, Object>> result = service.scales("e1");
            assertEquals(1, result.size());
            assertEquals("PHQ-9", result.get(0).get("name"));
        }
    }

    @Nested
    class ScaleDetailMethod {
        @Test
        void emptyRowsReturnEmptyMap() {
            when(jdbc.queryForList(contains("where elder_id=? and scale_name=?"), eq("e1"), eq("PHQ-9")))
                    .thenReturn(List.of());

            Map<String, Object> result = service.scaleDetail("e1", "PHQ-9");

            assertTrue(result.isEmpty());
        }

        @Test
        void returnsParsedAnswersAndDefensiveCopies() throws Exception {
            Map<String, Object> row = new HashMap<>();
            row.put("id", "scale-1");
            row.put("scale_name", "PHQ-9");
            row.put("score", 12);
            row.put("record_date", "2026-05-29");
            row.put("volunteer", "志愿者A");
            row.put("payload_enc", "enc:{\"answers\":[{\"question\":\"睡眠\",\"value\":2},{\"question\":\"胃口\",\"value\":null}]}");
            when(jdbc.queryForList(contains("where elder_id=? and scale_name=?"), eq("e1"), eq("PHQ-9")))
                    .thenReturn(List.of(row));
            when(crypto.decrypt(startsWith("enc:{\"answers\""))).thenReturn("{\"answers\":[{\"question\":\"睡眠\",\"value\":2},{\"question\":\"胃口\",\"value\":null}]}");

            Map<String, Object> first = service.scaleDetail("e1", "PHQ-9");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> firstAnswers = (List<Map<String, Object>>) first.get("answers");
            firstAnswers.get(0).put("question", "已修改");

            Map<String, Object> second = service.scaleDetail("e1", "PHQ-9");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> secondAnswers = (List<Map<String, Object>>) second.get("answers");

            assertEquals("PHQ-9", second.get("name"));
            assertEquals(12, second.get("score"));
            assertEquals("睡眠", secondAnswers.get(0).get("question"));
            assertNull(secondAnswers.get(1).get("value"));
        }
    }

    @Nested
    class RecordAuditMethod {
        @Test
        void shortOverloadDelegates() {
            when(jdbc.update(anyString(), (Object) any(), (Object) any(), (Object) any(), (Object) any(),
                    (Object) any(), (Object) any(), (Object) any(), (Object) any(), (Object) any(),
                    (Object) any(), (Object) any(), (Object) any(), (Object) any(), (Object) any())).thenReturn(1);
            assertDoesNotThrow(() -> service.recordAudit("admin", "ADMIN", "127.0.0.1", "elder", "CREATE", "SUCCESS", "", "req1"));
        }

        @Test
        void longOverloadInserts() {
            when(jdbc.update(anyString(), (Object) any(), (Object) any(), (Object) any(), (Object) any(),
                    (Object) any(), (Object) any(), (Object) any(), (Object) any(), (Object) any(),
                    (Object) any(), (Object) any(), (Object) any(), (Object) any(), (Object) any())).thenReturn(1);
            assertDoesNotThrow(() -> service.recordAudit("admin", "ADMIN", "127.0.0.1", "elder", "CREATE", "SUCCESS", "", "req1", "SMS", "张三", "13812345678", "110101199001011234"));
        }
    }

    @Nested
    class RecordAuditBatchMethod {
        @Test
        void emptyEntriesDoNothing() {
            service.recordAuditBatch(List.of());
            service.recordAuditBatch(null);
            verify(jdbc, never()).batchUpdate(anyString(), any(Collection.class), anyInt(), any());
        }

        @Test
        @SuppressWarnings({"rawtypes", "unchecked"})
        void batchEntriesEncryptSensitiveFieldsAndBindAllColumns() throws Exception {
            PreparedStatement ps = mock(PreparedStatement.class);
            doAnswer(invocation -> {
                Collection<SilverLinkDataService.AuditLogWrite> entries = invocation.getArgument(1);
                org.springframework.jdbc.core.ParameterizedPreparedStatementSetter setter = invocation.getArgument(3);
                for (SilverLinkDataService.AuditLogWrite entry : entries) {
                    setter.setValues(ps, entry);
                }
                return new int[][]{{entries.size()}};
            }).when(jdbc).batchUpdate(anyString(), any(Collection.class), anyInt(), any());

            service.recordAuditBatch(List.of(
                    new SilverLinkDataService.AuditLogWrite(
                            "2026-05-29T00:00:00Z",
                            "admin",
                            "ADMIN",
                            "127.0.0.1",
                            "elder:e1",
                            "VIEW",
                            "IDENTITY",
                            "访客",
                            "13800000000",
                            "500102200212180836",
                            "SUCCESS",
                            "",
                            "req-1"
                    )
            ));

            verify(ps).setString(eq(3), eq("admin"));
            verify(ps).setString(eq(9), eq("enc:访客"));
            verify(ps).setString(eq(10), eq("enc:13800000000"));
            verify(ps).setString(eq(11), eq("enc:500102200212180836"));
            verify(ps).setString(eq(14), eq("req-1"));
        }
    }

    @Nested
    class AuditLogsMethod {
        @Test
        void returnsFilteredLogs() throws Exception {
            Map<String, Object> row = new HashMap<>();
            row.put("id", "a1");
            row.put("time", "2026-01-01T00:00:00Z");
            row.put("operator", "admin");
            row.put("role", "ADMIN");
            row.put("source_ip", "127.0.0.1");
            row.put("target", "elder");
            row.put("action", "CREATE");
            row.put("verification_method", "");
            row.put("visitor_name_enc", "");
            row.put("visitor_phone_enc", "");
            row.put("visitor_id_card_enc", "");
            row.put("result", "SUCCESS");
            row.put("fail_reason", "");
            row.put("request_id", "r1");
            when(jdbc.queryForList(anyString(), any(Object[].class))).thenReturn(List.of(row));

            List<Map<String, Object>> result = service.auditLogs("admin", "CREATE", "SUCCESS");
            assertEquals(1, result.size());
        }

        @Test
        void filtersByOperatorViaSqlArguments() throws Exception {
            Map<String, Object> row1 = new HashMap<>();
            row1.put("operator", "admin");
            row1.put("action", "CREATE");
            row1.put("result", "SUCCESS");
            row1.put("visitor_name_enc", "");
            row1.put("visitor_phone_enc", "");
            row1.put("visitor_id_card_enc", "");
            when(jdbc.queryForList(anyString(), any(Object[].class))).thenReturn(List.of(row1));

            List<Map<String, Object>> result = service.auditLogs("admin", null, null);
            assertEquals(1, result.size());
            ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
            ArgumentCaptor<Object[]> argsCaptor = ArgumentCaptor.forClass(Object[].class);
            verify(jdbc).queryForList(sqlCaptor.capture(), argsCaptor.capture());
            assertTrue(sqlCaptor.getValue().contains("operator like ?"));
            assertArrayEquals(new Object[]{"%admin%"}, argsCaptor.getValue());
        }

        @Test
        void nullFiltersPassAll() throws Exception {
            Map<String, Object> row = new HashMap<>();
            row.put("operator", "admin");
            row.put("action", "CREATE");
            row.put("result", "SUCCESS");
            row.put("visitor_name_enc", "");
            row.put("visitor_phone_enc", "");
            row.put("visitor_id_card_enc", "");
            when(jdbc.queryForList(anyString(), any(Object[].class))).thenReturn(List.of(row));

            List<Map<String, Object>> result = service.auditLogs(null, null, null);
            assertEquals(1, result.size());
            ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
            ArgumentCaptor<Object[]> argsCaptor = ArgumentCaptor.forClass(Object[].class);
            verify(jdbc).queryForList(sqlCaptor.capture(), argsCaptor.capture());
            assertTrue(sqlCaptor.getValue().contains("order by time desc limit 500"));
            assertArrayEquals(new Object[]{}, argsCaptor.getValue());
        }

        @Test
        void actionFilterUsesSqlPredicate() throws Exception {
            Map<String, Object> row = new HashMap<>();
            row.put("operator", "admin");
            row.put("action", "CREATE");
            row.put("result", "SUCCESS");
            row.put("visitor_name_enc", "");
            row.put("visitor_phone_enc", "");
            row.put("visitor_id_card_enc", "");
            when(jdbc.queryForList(anyString(), any(Object[].class))).thenReturn(List.of(row));

            List<Map<String, Object>> result = service.auditLogs(null, "CREATE", null);
            assertEquals(1, result.size());
            ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
            ArgumentCaptor<Object[]> argsCaptor = ArgumentCaptor.forClass(Object[].class);
            verify(jdbc).queryForList(sqlCaptor.capture(), argsCaptor.capture());
            assertTrue(sqlCaptor.getValue().contains("action = ?"));
            assertArrayEquals(new Object[]{"CREATE"}, argsCaptor.getValue());
        }

        @Test
        void resultFilterUsesSqlPredicate() throws Exception {
            Map<String, Object> row = new HashMap<>();
            row.put("operator", "admin");
            row.put("action", "CREATE");
            row.put("result", "SUCCESS");
            row.put("visitor_name_enc", "");
            row.put("visitor_phone_enc", "");
            row.put("visitor_id_card_enc", "");
            when(jdbc.queryForList(anyString(), any(Object[].class))).thenReturn(List.of(row));

            List<Map<String, Object>> result = service.auditLogs(null, null, "SUCCESS");
            assertEquals(1, result.size());
            ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
            ArgumentCaptor<Object[]> argsCaptor = ArgumentCaptor.forClass(Object[].class);
            verify(jdbc).queryForList(sqlCaptor.capture(), argsCaptor.capture());
            assertTrue(sqlCaptor.getValue().contains("result = ?"));
            assertArrayEquals(new Object[]{"SUCCESS"}, argsCaptor.getValue());
        }
    }

    @Nested
    class OneMethod {
        @Test
        void foundReturnsRow() {
            Map<String, Object> row = Map.of("id", "e1");
            when(jdbc.queryForList(anyString(), (Object) any())).thenReturn(List.of(row));
            Map<String, Object> result = service.one("select * from elder where id=?", "e1");
            assertEquals("e1", result.get("id"));
        }

        @Test
        void notFoundThrows404() {
            when(jdbc.queryForList(anyString(), (Object) any())).thenReturn(Collections.emptyList());
            BizException ex = assertThrows(BizException.class, () -> service.one("select * from elder where id=?", "missing"));
            assertEquals(404, ex.getCode());
        }
    }

    @Nested
    class IsFamilyBoundMethod {
        @Test
        void boundReturnsTrue() {
            when(jdbc.queryForObject(anyString(), eq(Integer.class), (Object) any(), (Object) any())).thenReturn(1);
            assertTrue(service.isFamilyBound("f1", "e1"));
        }

        @Test
        void notBoundReturnsFalse() {
            when(jdbc.queryForObject(anyString(), eq(Integer.class), (Object) any(), (Object) any())).thenReturn(0);
            assertFalse(service.isFamilyBound("f1", "e1"));
        }

        @Test
        void nullCountReturnsFalse() {
            when(jdbc.queryForObject(anyString(), eq(Integer.class), (Object) any(), (Object) any())).thenReturn(null);
            assertFalse(service.isFamilyBound("f1", "e1"));
        }
    }

    @Nested
    class ScanBasicMethod {
        @Test
        void returnsMaskedElderRow() throws Exception {
            Map<String, Object> row = fullElderRow();
            when(jdbc.queryForList(anyString(), (Object) any())).thenReturn(List.of(row));

            Map<String, Object> result = service.scanBasic("e1");
            assertEquals("张**", result.get("name"));
            assertEquals("138****5678", result.get("phone"));
        }
    }

    @Nested
    class SaveBasicMethod {
        @Test
        void callsRequireScopeAndUpdate() {
            when(jdbc.update(anyString(), (Object) any(), (Object) any(), (Object) any(), (Object) any(),
                    (Object) any(), (Object) any(), (Object) any(), (Object) any(), (Object) any(),
                    (Object) any(), (Object) any(), (Object) any())).thenReturn(1);
            Map<String, Object> data = new HashMap<>();
            data.put("name", "张三");
            assertDoesNotThrow(() -> service.saveBasic("e1", data));
        }
    }

    @Nested
    class RequireVolunteerScopeMethod {
        @Test
        void noAuthPasses() {
            assertDoesNotThrow(() -> service.requireVolunteerScope("e1"));
        }

        @Test
        void nonVolunteerPasses() {
            Authentication auth = new TestingAuthenticationToken("admin", "pass", "ROLE_ADMIN");
            SecurityContextHolder.getContext().setAuthentication(auth);
            assertDoesNotThrow(() -> service.requireVolunteerScope("e1"));
        }

        @Test
        void volunteerWithScopePasses() {
            Authentication auth = new TestingAuthenticationToken("vol1", "pass", "ROLE_VOLUNTEER");
            SecurityContextHolder.getContext().setAuthentication(auth);
            Map<String, Object> user = Map.of("id", "v1");
            when(jdbc.queryForList(anyString(), (Object) any())).thenReturn(List.of(user));
            when(jdbc.queryForObject(anyString(), eq(Integer.class), (Object) any(), (Object) any())).thenReturn(1);
            assertDoesNotThrow(() -> service.requireVolunteerScope("e1"));
        }

        @Test
        void volunteerWithoutScopeThrows403() {
            Authentication auth = new TestingAuthenticationToken("vol1", "pass", "ROLE_VOLUNTEER");
            SecurityContextHolder.getContext().setAuthentication(auth);
            Map<String, Object> user = Map.of("id", "v1");
            when(jdbc.queryForList(anyString(), (Object) any())).thenReturn(List.of(user));
            when(jdbc.queryForObject(anyString(), eq(Integer.class), (Object) any(), (Object) any())).thenReturn(0);
            BizException ex = assertThrows(BizException.class, () -> service.requireVolunteerScope("e1"));
            assertEquals(403, ex.getCode());
        }

        @Test
        void volunteerWithNullCountThrows403() {
            Authentication auth = new TestingAuthenticationToken("vol1", "pass", "ROLE_VOLUNTEER");
            SecurityContextHolder.getContext().setAuthentication(auth);
            Map<String, Object> user = Map.of("id", "v1");
            when(jdbc.queryForList(anyString(), (Object) any())).thenReturn(List.of(user));
            when(jdbc.queryForObject(anyString(), eq(Integer.class), (Object) any(), (Object) any())).thenReturn(null);
            BizException ex = assertThrows(BizException.class, () -> service.requireVolunteerScope("e1"));
            assertEquals(403, ex.getCode());
        }
    }

    @Nested
    class ParseScaleAnswersMethod {
        @Test
        void nullReturnsEmpty() {
            List<?> result = ReflectionTestUtils.invokeMethod(service, "parseScaleAnswers", (String) null);
            assertTrue(result.isEmpty());
        }

        @Test
        void blankReturnsEmpty() {
            List<?> result = ReflectionTestUtils.invokeMethod(service, "parseScaleAnswers", "");
            assertTrue(result.isEmpty());
        }

        @Test
        void emptyJsonReturnsEmpty() {
            List<?> result = ReflectionTestUtils.invokeMethod(service, "parseScaleAnswers", "{}");
            assertTrue(result.isEmpty());
        }

        @Test
        void jsonWithAnswersReturnsList() {
            String payload = "{\"answers\":[{\"question\":\"Q1\",\"value\":1},{\"question\":\"Q2\",\"value\":2}]}";
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> result = ReflectionTestUtils.invokeMethod(service, "parseScaleAnswers", payload);
            assertEquals(2, result.size());
            assertEquals("Q1", result.get(0).get("question"));
            assertEquals(1, result.get(0).get("value"));
        }

        @Test
        void jsonWithNullValueReturnsNull() {
            String payload = "{\"answers\":[{\"question\":\"Q1\",\"value\":null}]}";
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> result = ReflectionTestUtils.invokeMethod(service, "parseScaleAnswers", payload);
            assertEquals(1, result.size());
            assertNull(result.get(0).get("value"));
        }

        @Test
        void legacyStringFormatParses() {
            String payload = "[{question=兴趣减退, value=1}, {question=情绪低落, value=2}]";
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> result = ReflectionTestUtils.invokeMethod(service, "parseScaleAnswers", payload);
            assertEquals(2, result.size());
            assertEquals("兴趣减退", result.get(0).get("question"));
            assertEquals(1, result.get(0).get("value"));
        }

        @Test
        void legacyWithNullValueParses() {
            String payload = "[{question=Q1, value=null}]";
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> result = ReflectionTestUtils.invokeMethod(service, "parseScaleAnswers", payload);
            assertEquals(1, result.size());
            assertNull(result.get(0).get("value"));
        }

        @Test
        void invalidJsonFallsBackToRegex() {
            String payload = "not json [{question=Q1, value=1}]";
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> result = ReflectionTestUtils.invokeMethod(service, "parseScaleAnswers", payload);
            assertEquals(1, result.size());
        }

        @Test
        void jsonWithNonListAnswersReturnsEmpty() {
            String payload = "{\"answers\":\"not a list\"}";
            List<?> result = ReflectionTestUtils.invokeMethod(service, "parseScaleAnswers", payload);
            assertTrue(result.isEmpty());
        }
    }

    @Nested
    class EncryptSeedDataMethod {
        @Test
        void handlesDbException() {
            when(jdbc.queryForList(anyString())).thenThrow(new RuntimeException("db not ready"));
            assertDoesNotThrow(() -> service.encryptSeedData());
        }

        @Test
        void skipsBlankAndEncryptedRows() throws Exception {
            Map<String, Object> row = new HashMap<>();
            row.put("id", "1");
            row.put("name_enc", "enc:already");
            when(jdbc.queryForList(anyString())).thenReturn(List.of(row)).thenReturn(Collections.emptyList());
            when(crypto.decrypt("enc:already")).thenReturn("already");

            service.encryptSeedData();
            verify(jdbc, never()).update(contains("update"), (Object) any(), (Object) any());
        }
    }
}
