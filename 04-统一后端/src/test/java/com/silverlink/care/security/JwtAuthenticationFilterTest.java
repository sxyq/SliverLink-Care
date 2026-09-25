package com.silverlink.care.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        filter = new JwtAuthenticationFilter(jwtTokenProvider);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void doFilter_noAuthHeader_continuesWithoutAuth() throws ServletException, IOException {
        when(request.getHeader("Authorization")).thenReturn(null);

        filter.doFilterInternal(request, response, filterChain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilter_nonBearerHeader_continuesWithoutAuth() throws ServletException, IOException {
        when(request.getHeader("Authorization")).thenReturn("Basic dXNlcjpwYXNz");

        filter.doFilterInternal(request, response, filterChain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilter_bearerPrefixOnly_continuesWithoutAuth() throws ServletException, IOException {
        when(request.getHeader("Authorization")).thenReturn("Bearer ");

        filter.doFilterInternal(request, response, filterChain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilter_validToken_setsAuthentication() throws ServletException, IOException {
        String token = "valid.jwt.token";
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtTokenProvider.validateToken(token)).thenReturn(true);
        when(jwtTokenProvider.getSubject(token)).thenReturn("admin");
        when(jwtTokenProvider.getRole(token)).thenReturn("SYSTEM_ADMIN");

        filter.doFilterInternal(request, response, filterChain);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(auth);
        assertEquals("admin", auth.getName());
        assertTrue(auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_SYSTEM_ADMIN".equals(a.getAuthority())));
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilter_validToken_volunteerRole_setsRoleAuthority() throws ServletException, IOException {
        String token = "valid.jwt.token";
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtTokenProvider.validateToken(token)).thenReturn(true);
        when(jwtTokenProvider.getSubject(token)).thenReturn("volunteer1");
        when(jwtTokenProvider.getRole(token)).thenReturn("VOLUNTEER");

        filter.doFilterInternal(request, response, filterChain);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(auth);
        assertEquals("volunteer1", auth.getName());
        assertTrue(auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_VOLUNTEER".equals(a.getAuthority())));
    }

    @Test
    void doFilter_invalidToken_continuesWithoutAuth() throws ServletException, IOException {
        String token = "invalid.jwt.token";
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtTokenProvider.validateToken(token)).thenReturn(false);

        filter.doFilterInternal(request, response, filterChain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilter_tokenValidationThrows_continuesWithoutAuth() throws ServletException, IOException {
        String token = "broken.jwt.token";
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtTokenProvider.validateToken(token)).thenThrow(new RuntimeException("JWT parse error"));

        filter.doFilterInternal(request, response, filterChain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilter_getSubjectThrows_continuesWithoutAuth() throws ServletException, IOException {
        String token = "valid-but-broken.jwt.token";
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtTokenProvider.validateToken(token)).thenReturn(true);
        when(jwtTokenProvider.getSubject(token)).thenThrow(new RuntimeException("parse error"));

        filter.doFilterInternal(request, response, filterChain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilter_familyRole_setsRoleAuthority() throws ServletException, IOException {
        String token = "family.jwt.token";
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtTokenProvider.validateToken(token)).thenReturn(true);
        when(jwtTokenProvider.getSubject(token)).thenReturn("13800138000");
        when(jwtTokenProvider.getRole(token)).thenReturn("FAMILY");

        filter.doFilterInternal(request, response, filterChain);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(auth);
        assertEquals("13800138000", auth.getName());
        assertTrue(auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_FAMILY".equals(a.getAuthority())));
    }

    @Test
    void doFilter_adminEndpoint_usesAdminCookieWhenVolunteerCookieComesFirst() throws ServletException, IOException {
        String adminToken = "admin.jwt.token";
        String volunteerToken = "volunteer.jwt.token";
        when(request.getHeader("Authorization")).thenReturn(null);
        when(request.getServletPath()).thenReturn("/api/admin/session");
        when(request.getCookies()).thenReturn(new Cookie[] {
                new Cookie(AuthCookieService.VOLUNTEER_COOKIE, volunteerToken),
                new Cookie(AuthCookieService.ADMIN_COOKIE, adminToken)
        });
        when(jwtTokenProvider.validateToken(adminToken)).thenReturn(true);
        when(jwtTokenProvider.getSubject(adminToken)).thenReturn("admin");
        when(jwtTokenProvider.getRole(adminToken)).thenReturn("SYSTEM_ADMIN");

        filter.doFilterInternal(request, response, filterChain);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(auth);
        assertEquals("admin", auth.getName());
        assertTrue(auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_SYSTEM_ADMIN".equals(a.getAuthority())));
        verify(jwtTokenProvider).validateToken(adminToken);
        verify(jwtTokenProvider, never()).validateToken(volunteerToken);
    }

    @Test
    void doFilter_adminEndpoint_ignoresVolunteerCookieWhenAdminCookieIsMissing() throws ServletException, IOException {
        when(request.getHeader("Authorization")).thenReturn(null);
        when(request.getServletPath()).thenReturn("/api/admin/session");
        when(request.getCookies()).thenReturn(new Cookie[] {
                new Cookie(AuthCookieService.VOLUNTEER_COOKIE, "volunteer.jwt.token")
        });

        filter.doFilterInternal(request, response, filterChain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verifyNoInteractions(jwtTokenProvider);
    }

    @Test
    void doFilter_volunteerEndpoint_usesVolunteerCookieWhenFamilyCookieComesFirst() throws ServletException, IOException {
        String volunteerToken = "volunteer.jwt.token";
        when(request.getHeader("Authorization")).thenReturn(null);
        when(request.getServletPath()).thenReturn("/api/volunteer/me/profile");
        when(request.getCookies()).thenReturn(new Cookie[] {
                new Cookie(AuthCookieService.FAMILY_COOKIE, "family.jwt.token"),
                new Cookie(AuthCookieService.VOLUNTEER_COOKIE, volunteerToken)
        });
        when(jwtTokenProvider.validateToken(volunteerToken)).thenReturn(true);
        when(jwtTokenProvider.getSubject(volunteerToken)).thenReturn("volunteer1");
        when(jwtTokenProvider.getRole(volunteerToken)).thenReturn("VOLUNTEER");

        filter.doFilterInternal(request, response, filterChain);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(auth);
        assertEquals("volunteer1", auth.getName());
        assertTrue(auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_VOLUNTEER".equals(a.getAuthority())));
        verify(jwtTokenProvider).validateToken(volunteerToken);
    }

    @Test
    void doFilter_alwaysCallsFilterChain() throws ServletException, IOException {
        when(request.getHeader("Authorization")).thenReturn(null);

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain, times(1)).doFilter(request, response);
    }
}
