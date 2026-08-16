package com.silverlink.care.module.volunteer;

import com.silverlink.care.common.ApiResponse;
import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import com.silverlink.care.module.audit.AuditLogService;
import com.silverlink.care.security.AuthCookieService;
import com.silverlink.care.security.JwtTokenProvider;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/volunteer")
public class VolunteerController {

    private final VolunteerService volunteerService;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthCookieService authCookieService;
    private final AuditLogService auditLogService;
    private final SilverLinkDataService data;

    public VolunteerController(
            VolunteerService volunteerService,
            JwtTokenProvider jwtTokenProvider,
            AuthCookieService authCookieService,
            AuditLogService auditLogService,
            SilverLinkDataService data
    ) {
        this.volunteerService = volunteerService;
        this.jwtTokenProvider = jwtTokenProvider;
        this.authCookieService = authCookieService;
        this.auditLogService = auditLogService;
        this.data = data;
    }

    @PostMapping("/login")
    public ApiResponse<Map<String, String>> login(
            @RequestBody Map<String, String> body,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        String account = body.get("account");
        String password = body.get("password");
        var user = data.login(account, password, "VOLUNTEER");
        if (user.isPresent()) {
            String token = jwtTokenProvider.generateToken(account, "VOLUNTEER", 86400000L);
            authCookieService.issueVolunteerCookie(request, response, token, 86400000L);
            Map<String, String> map = new LinkedHashMap<>();
            map.put("token", token);
            map.put("account", account);
            map.put("name", data.dec(user.get().get("name_enc")));
            auditLogService.record(account, "VOLUNTEER", request, "系统", "LOGIN", "SUCCESS", null, null);
            return ApiResponse.ok(map);
        }
        auditLogService.record(account, "UNKNOWN", request, "系统", "LOGIN", "FAIL", "密码错误", null);
        return ApiResponse.fail(401, "账号或密码错误", "errors.loginFailed");
    }

    @PostMapping("/register")
    public ApiResponse<Map<String, String>> register(
            @RequestBody VolunteerRegisterRequest req,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        Map<String, String> result = volunteerService.registerWithInvitation(req);
        String token = result.get("token");
        if (token != null && !token.isBlank()) {
            authCookieService.issueVolunteerCookie(request, response, token, 86400000L);
        }
        auditLogService.record(result.get("account"), "VOLUNTEER", request, result.get("invitationCode"), "INVITATION_REGISTER", "SUCCESS", null, null);
        return ApiResponse.ok(result);
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(Authentication authentication, HttpServletRequest request, HttpServletResponse response) {
        authCookieService.clearVolunteerCookie(request, response);
        auditLogService.record(authentication, request, "绯荤粺", "LOGOUT", "SUCCESS");
        return ApiResponse.ok();
    }

    @GetMapping("/me/elders")
    public ApiResponse<List<Map<String, Object>>> myElders(Authentication authentication) {
        return ApiResponse.ok(volunteerService.getMyElders(authentication.getName()));
    }

    @GetMapping("/me/elders/{elderId}/medications")
    public ApiResponse<List<Map<String, String>>> myElderMedications(@PathVariable String elderId, Authentication authentication) {
        return ApiResponse.ok(volunteerService.getMyElderMedications(authentication.getName(), elderId));
    }

    @GetMapping("/me/profile")
    public ApiResponse<Map<String, Object>> myProfile(Authentication authentication) {
        return ApiResponse.ok(volunteerService.getMyProfile(authentication.getName()));
    }

    @PutMapping("/me/profile")
    public ApiResponse<Map<String, String>> updateMyProfile(
            @RequestBody Map<String, Object> body,
            Authentication authentication,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        Map<String, Object> profile = volunteerService.updateMyProfile(authentication.getName(), body);
        String nextAccount = String.valueOf(profile.getOrDefault("account", authentication.getName()));
        String nextName = String.valueOf(profile.getOrDefault("name", nextAccount));
        String token = jwtTokenProvider.generateToken(nextAccount, "VOLUNTEER", 86400000L);
        authCookieService.issueVolunteerCookie(request, response, token, 86400000L);
        auditLogService.record(authentication, request, nextAccount, "UPDATE_PROFILE", "SUCCESS");
        return ApiResponse.ok(Map.of(
                "token", token,
                "account", nextAccount,
                "name", nextName,
                "phone", String.valueOf(profile.getOrDefault("phone", ""))
        ));
    }

    @PostMapping("/me/elders")
    public ApiResponse<Map<String, String>> createMyElder(
            @RequestBody Map<String, Object> body,
            Authentication authentication,
            HttpServletRequest request
    ) {
        String id = volunteerService.createMyElder(authentication.getName(), body);
        auditLogService.record(authentication, request, id, "CREATE_ELDER", "SUCCESS");
        return ApiResponse.ok(Map.of("id", id));
    }

    @GetMapping("/me/elders/{elderId}/qr-manage")
    public ApiResponse<Map<String, Object>> myElderQrCode(@PathVariable String elderId, Authentication authentication) throws Exception {
        return ApiResponse.ok(volunteerService.getMyElderQrCode(authentication.getName(), elderId));
    }

    @PostMapping("/me/elders/{elderId}/qr-regenerate")
    public ApiResponse<Map<String, Object>> regenerateMyElderQrCode(
            @PathVariable String elderId,
            Authentication authentication,
            HttpServletRequest request
    ) throws Exception {
        Map<String, Object> result = volunteerService.regenerateMyElderQrCode(authentication.getName(), elderId);
        auditLogService.record(authentication, request, elderId, "REGENERATE_QR", "SUCCESS");
        return ApiResponse.ok(result);
    }

    @PutMapping("/me/elders/{elderId}/qr-disable")
    public ApiResponse<Map<String, Object>> disableMyElderQrCode(
            @PathVariable String elderId,
            Authentication authentication,
            HttpServletRequest request
    ) {
        Map<String, Object> result = volunteerService.requestDisableMyElderQrCode(authentication.getName(), elderId);
        auditLogService.record(authentication, request, elderId, "REQUEST_DISABLE_QR", "SUCCESS");
        return ApiResponse.ok(result);
    }
}
