package com.silverlink.care.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class AuthCookieService {

    public static final String ADMIN_COOKIE = "sl_admin_session";
    public static final String VOLUNTEER_COOKIE = "sl_volunteer_session";
    public static final String FAMILY_COOKIE = "sl_family_session";

    public void issueAdminCookie(HttpServletRequest request, HttpServletResponse response, String token, long ttlMillis) {
        addCookie(request, response, ADMIN_COOKIE, token, ttlMillis);
    }

    public void issueVolunteerCookie(HttpServletRequest request, HttpServletResponse response, String token, long ttlMillis) {
        addCookie(request, response, VOLUNTEER_COOKIE, token, ttlMillis);
    }

    public void issueFamilyCookie(HttpServletRequest request, HttpServletResponse response, String token, long ttlMillis) {
        addCookie(request, response, FAMILY_COOKIE, token, ttlMillis);
    }

    public void clearAdminCookie(HttpServletRequest request, HttpServletResponse response) {
        clearCookie(request, response, ADMIN_COOKIE);
    }

    public void clearVolunteerCookie(HttpServletRequest request, HttpServletResponse response) {
        clearCookie(request, response, VOLUNTEER_COOKIE);
    }

    public void clearFamilyCookie(HttpServletRequest request, HttpServletResponse response) {
        clearCookie(request, response, FAMILY_COOKIE);
    }

    private void addCookie(HttpServletRequest request, HttpServletResponse response, String name, String value, long ttlMillis) {
        ResponseCookie cookie = ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(request.isSecure())
                .sameSite("Lax")
                .path("/")
                .maxAge(Duration.ofMillis(ttlMillis))
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearCookie(HttpServletRequest request, HttpServletResponse response, String name) {
        ResponseCookie cookie = ResponseCookie.from(name, "")
                .httpOnly(true)
                .secure(request.isSecure())
                .sameSite("Lax")
                .path("/")
                .maxAge(Duration.ZERO)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
