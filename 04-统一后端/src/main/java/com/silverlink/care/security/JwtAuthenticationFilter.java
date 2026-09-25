package com.silverlink.care.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String token = resolveToken(request);
        if (token != null && !token.isBlank()) {
            try {
                if (jwtTokenProvider.validateToken(token)) {
                    String subject = jwtTokenProvider.getSubject(token);
                    String role = jwtTokenProvider.getRole(token);
                    List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role));
                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(subject, null, authorities);
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            } catch (Exception ignored) {
                // Invalid token, continue without authentication
            }
        }
        filterChain.doFilter(request, response);
    }

    private static String resolveToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        String expectedCookieName = cookieNameForPath(request.getServletPath());
        if (expectedCookieName != null) {
            for (Cookie cookie : cookies) {
                if (expectedCookieName.equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
            return null;
        }
        for (Cookie cookie : cookies) {
            String name = cookie.getName();
            if (AuthCookieService.ADMIN_COOKIE.equals(name)
                    || AuthCookieService.VOLUNTEER_COOKIE.equals(name)
                    || AuthCookieService.FAMILY_COOKIE.equals(name)) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private static String cookieNameForPath(String path) {
        if (isPathUnder(path, "/api/admin")
                || isPathUnder(path, "/api/rbac")
                || isPathUnder(path, "/api/audit-logs")
                || isPathUnder(path, "/api/sms-relay/admin")) {
            return AuthCookieService.ADMIN_COOKIE;
        }
        if (isPathUnder(path, "/api/volunteer")
                || isPathUnder(path, "/api/elder")) {
            return AuthCookieService.VOLUNTEER_COOKIE;
        }
        if (isPathUnder(path, "/api/family")) {
            return AuthCookieService.FAMILY_COOKIE;
        }
        return null;
    }

    private static boolean isPathUnder(String path, String prefix) {
        return path != null && (path.equals(prefix) || path.startsWith(prefix + "/"));
    }
}
