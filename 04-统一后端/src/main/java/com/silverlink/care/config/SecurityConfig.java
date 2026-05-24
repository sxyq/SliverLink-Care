package com.silverlink.care.config;

import com.silverlink.care.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                        "/api/scan/**",
                        "/api/sms/**",
                        "/api/sms-relay/inbound",
                        "/api/sms-relay/heartbeat",
                        "/api/sms-relay/devices/*/config",
                        "/api/nameplates/**",
                        "/api/audit-logs/report",
                        "/api/admin/login",
                        "/api/volunteer/login",
                        "/api/invitations/**",
                        "/api/family/login"
                ).permitAll()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                .requestMatchers(
                        "/api/admin/**",
                        "/api/volunteer/me/**",
                        "/api/elder/**",
                        "/api/rbac/**",
                        "/api/audit-logs/**",
                        "/api/family/**",
                        "/api/sms-relay/admin/**"
                ).authenticated()
                .anyRequest().permitAll()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .httpBasic(basic -> basic.disable())
            .formLogin(fl -> fl.disable());
        return http.build();
    }
}
