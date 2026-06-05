package com.silverlink.care.module.admin;

import com.silverlink.care.common.ApiResponse;
import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import com.silverlink.care.module.audit.AuditLogService;
import com.silverlink.care.module.qrcode.QrCodeService;
import com.silverlink.care.security.AuthCookieService;
import com.silverlink.care.security.JwtTokenProvider;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminDashboardService dashboardService;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthCookieService authCookieService;
    private final AuditLogService auditLogService;
    private final SilverLinkDataService data;
    private final QrCodeService qrCodeService;

    public AdminController(
            AdminDashboardService dashboardService,
            JwtTokenProvider jwtTokenProvider,
            AuthCookieService authCookieService,
            AuditLogService auditLogService,
            SilverLinkDataService data,
            QrCodeService qrCodeService
    ) {
        this.dashboardService = dashboardService;
        this.jwtTokenProvider = jwtTokenProvider;
        this.authCookieService = authCookieService;
        this.auditLogService = auditLogService;
        this.data = data;
        this.qrCodeService = qrCodeService;
    }

    @PostMapping("/login")
    public ApiResponse<Map<String, String>> login(
            @RequestBody Map<String, String> body,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        String account = body.getOrDefault("account", body.get("username"));
        var user = data.login(account, body.get("password"), "SYSTEM_ADMIN");
        if (user.isPresent()) {
            String token = jwtTokenProvider.generateToken(account, "SYSTEM_ADMIN", 7200000L);
            authCookieService.issueAdminCookie(request, response, token, 7200000L);
            Map<String, String> map = new LinkedHashMap<>();
            map.put("role", "系统管理员");
            map.put("account", account);
            auditLogService.record(account, "SYSTEM_ADMIN", request, "系统", "LOGIN", "SUCCESS", null, null);
            return ApiResponse.ok(map);
        }
        auditLogService.record(account, "UNKNOWN", request, "系统", "LOGIN", "FAIL", "密码错误", null);
        return ApiResponse.fail(401, "账号或密码错误");
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(Authentication authentication, HttpServletRequest request, HttpServletResponse response) {
        authCookieService.clearAdminCookie(request, response);
        auditLogService.record(authentication, request, "绯荤粺", "LOGOUT", "SUCCESS");
        return ApiResponse.ok();
    }

    @GetMapping("/session")
    public ApiResponse<Map<String, String>> session(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ApiResponse.fail(401, "未登录");
        }
        Map<String, String> map = new LinkedHashMap<>();
        map.put("account", authentication.getName());
        map.put("role", "系统管理员");
        return ApiResponse.ok(map);
    }

    @GetMapping("/dashboard")
    public ApiResponse<Map<String, Object>> dashboard() {
        return ApiResponse.ok(dashboardService.stats());
    }

    @GetMapping("/elders")
    public ApiResponse<List<Map<String, Object>>> elders() {
        return ApiResponse.ok(dashboardService.elders());
    }

    @PostMapping("/elders")
    public ApiResponse<Map<String, String>> createElder(@RequestBody Map<String, Object> body, Authentication authentication, HttpServletRequest request) throws Exception {
        String id = data.createElder(body);
        Map<String, Object> elder = data.elderDetail(id, false);
        qrCodeService.generateWithToken(id, String.valueOf(elder.getOrDefault("archiveNo", "")));
        auditLogService.record(authentication, request, String.valueOf(elder.getOrDefault("archiveNo", id)), "CREATE_ELDER", "SUCCESS");
        return ApiResponse.ok(Map.of("id", id));
    }

    @PutMapping("/elders/{id}")
    public ApiResponse<Void> updateElder(@PathVariable String id, @RequestBody Map<String, Object> body, Authentication authentication, HttpServletRequest request) {
        data.updateElder(id, body);
        auditLogService.record(authentication, request, id, "UPDATE_ELDER", "SUCCESS");
        return ApiResponse.ok();
    }

    @DeleteMapping("/elders/{id}")
    public ApiResponse<Void> deleteElder(@PathVariable String id, Authentication authentication, HttpServletRequest request) {
        data.deleteElder(id);
        disableCurrentQrCode(id);
        auditLogService.record(authentication, request, id, "DELETE_ELDER", "SUCCESS");
        return ApiResponse.ok();
    }

    @PutMapping("/elders/{id}/status")
    public ApiResponse<Void> updateElderStatus(@PathVariable String id, @RequestBody Map<String, Object> body, Authentication authentication, HttpServletRequest request) {
        String status = String.valueOf(body.getOrDefault("status", "DISABLED"));
        data.setElderStatus(id, status);
        if (!"ACTIVE".equalsIgnoreCase(status)) {
            disableCurrentQrCode(id);
        }
        auditLogService.record(authentication, request, id, "UPDATE_ELDER_STATUS", "SUCCESS");
        return ApiResponse.ok();
    }

    private void disableCurrentQrCode(String elderId) {
        var current = qrCodeService.findCurrentByElder(elderId);
        if (current != null && !"DISABLED".equalsIgnoreCase(current.getStatus())) {
            qrCodeService.disable(current.getId());
        }
    }

    @GetMapping("/volunteers")
    public ApiResponse<List<Map<String, Object>>> volunteers() {
        return ApiResponse.ok(dashboardService.volunteers());
    }

    @PostMapping("/volunteers")
    public ApiResponse<Map<String, String>> createVolunteer(@RequestBody Map<String, Object> body, Authentication authentication, HttpServletRequest request) {
        String id = data.createVolunteer(body);
        auditLogService.record(authentication, request, id, "CREATE_VOLUNTEER", "SUCCESS");
        return ApiResponse.ok(Map.of("id", id));
    }

    @PutMapping("/volunteers/{id}")
    public ApiResponse<Void> updateVolunteer(@PathVariable String id, @RequestBody Map<String, Object> body, Authentication authentication, HttpServletRequest request) {
        data.updateVolunteer(id, body);
        auditLogService.record(authentication, request, id, "UPDATE_VOLUNTEER", "SUCCESS");
        return ApiResponse.ok();
    }

    @PutMapping("/volunteers/{id}/scope")
    public ApiResponse<Void> updateVolunteerScope(@PathVariable String id, @RequestBody Map<String, Object> body, Authentication authentication, HttpServletRequest request) {
        Object elderIds = body.get("elderIds");
        if (elderIds instanceof List<?> list) {
            data.setVolunteerScope(id, list.stream().map(String::valueOf).toList());
        }
        auditLogService.record(authentication, request, id, "UPDATE_VOLUNTEER_SCOPE", "SUCCESS");
        return ApiResponse.ok();
    }

    @DeleteMapping("/volunteers/{id}")
    public ApiResponse<Void> deleteVolunteer(@PathVariable String id, Authentication authentication, HttpServletRequest request) {
        data.deleteVolunteer(id);
        auditLogService.record(authentication, request, id, "DELETE_VOLUNTEER", "SUCCESS");
        return ApiResponse.ok();
    }

    @GetMapping("/roles")
    public ApiResponse<List<Map<String, String>>> roles() {
        List<Map<String, String>> list = new ArrayList<>();
        list.add(new LinkedHashMap<String, String>() {{ put("code", "VOLUNTEER"); put("name", "志愿者"); }});
        list.add(new LinkedHashMap<String, String>() {{ put("code", "FAMILY"); put("name", "家属协管"); }});
        list.add(new LinkedHashMap<String, String>() {{ put("code", "SYSTEM_ADMIN"); put("name", "系统管理员"); }});
        return ApiResponse.ok(list);
    }

    @GetMapping("/permissions")
    public ApiResponse<List<Map<String, String>>> permissions() {
        List<Map<String, String>> list = new ArrayList<>();
        list.add(new LinkedHashMap<String, String>() {{ put("code", "ELDER_READ"); put("name", "老人档案查看"); }});
        list.add(new LinkedHashMap<String, String>() {{ put("code", "ELDER_WRITE"); put("name", "老人档案编辑"); }});
        list.add(new LinkedHashMap<String, String>() {{ put("code", "QR_MANAGE"); put("name", "二维码管理"); }});
        list.add(new LinkedHashMap<String, String>() {{ put("code", "VOLUNTEER_MANAGE"); put("name", "志愿者管理"); }});
        list.add(new LinkedHashMap<String, String>() {{ put("code", "AUDIT_LOG_READ"); put("name", "审计日志查看"); }});
        return ApiResponse.ok(list);
    }

    @PutMapping("/permissions")
    public ApiResponse<Void> updatePermissions(@RequestBody Map<String, Object> body) {
        return ApiResponse.ok();
    }

    @GetMapping("/audit-logs")
    public ApiResponse<List<Map<String, Object>>> auditLogs() {
        return ApiResponse.ok(dashboardService.auditLogs());
    }

    @GetMapping("/medications")
    public ApiResponse<List<Map<String, Object>>> medications(@RequestParam(required = false) String elderId) {
        if (elderId != null && !elderId.isBlank()) {
            List<Map<String, String>> rows = data.medications(elderId);
            Map<String, Object> elder = data.elderDetail(elderId, false);
            List<Map<String, Object>> result = new ArrayList<>();
            for (Map<String, String> row : rows) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", row.get("id"));
                item.put("archiveNo", elder.getOrDefault("archiveNo", ""));
                item.put("elderName", elder.getOrDefault("name", ""));
                item.put("drugName", row.getOrDefault("name", ""));
                item.put("dosage", row.getOrDefault("dosage", ""));
                item.put("usage", row.getOrDefault("usage", ""));
                item.put("timing", row.getOrDefault("timing", row.getOrDefault("time", "")));
                item.put("updatedAt", row.getOrDefault("updatedAt", ""));
                result.add(item);
            }
            return ApiResponse.ok(result);
        }
        return ApiResponse.ok(data.allMedicationsForAdmin());
    }

    @GetMapping("/scales")
    public ApiResponse<List<Map<String, Object>>> scales(@RequestParam String elderId) {
        Map<String, Object> elder = data.elderDetail(elderId, false);
        List<Map<String, Object>> rows = data.scales(elderId);
        for (Map<String, Object> row : rows) {
            row.put("archiveNo", elder.getOrDefault("archiveNo", ""));
            row.put("elderName", elder.getOrDefault("name", ""));
            row.put("scaleName", row.getOrDefault("name", row.getOrDefault("scale", "")));
        }
        return ApiResponse.ok(rows);
    }
}
