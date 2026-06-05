package com.silverlink.care.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.Set;

@Component
public class SecuritySecretsValidator {

    private static final Set<String> DISALLOWED_JWT_SECRETS = Set.of(
            "demo-jwt-secret-key-2026-silverlink-care-must-be-32-bytes!!"
    );

    private static final Set<String> DISALLOWED_ADMIN_SIGNATURE_SECRETS = Set.of(
            "demo-admin-signature-secret"
    );

    @Value("${silverlink.security.jwt-secret}")
    private String jwtSecret;

    @Value("${silverlink.security.admin-signature-secret}")
    private String adminSignatureSecret;

    @Value("${silverlink.smsrelay.default-device-id}")
    private String defaultDeviceId;

    @Value("${silverlink.smsrelay.default-device-secret}")
    private String defaultDeviceSecret;

    @Value("${silverlink.smsrelay.server-url}")
    private String smsRelayServerUrl;

    @PostConstruct
    void validate() {
        requireSecureValue("silverlink.security.jwt-secret", jwtSecret, 32, DISALLOWED_JWT_SECRETS);
        requireSecureValue(
                "silverlink.security.admin-signature-secret",
                adminSignatureSecret,
                32,
                DISALLOWED_ADMIN_SIGNATURE_SECRETS
        );
        requirePresentValue("silverlink.smsrelay.default-device-id", defaultDeviceId);
        requirePresentValue("silverlink.smsrelay.default-device-secret", defaultDeviceSecret);
        requireHttpsOrLocal("silverlink.smsrelay.server-url", smsRelayServerUrl);
    }

    private static void requireSecureValue(String propertyName, String value, int minLength, Set<String> disallowedValues) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Missing required secure property: " + propertyName);
        }
        if (value.length() < minLength) {
            throw new IllegalStateException(
                    "Secure property is too short, expected at least " + minLength + " characters: " + propertyName
            );
        }
        if (disallowedValues.contains(value)) {
            throw new IllegalStateException("Refusing insecure default value for property: " + propertyName);
        }
    }

    private static void requirePresentValue(String propertyName, String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Missing required property: " + propertyName);
        }
    }

    private static void requireHttpsOrLocal(String propertyName, String value) {
        try {
            URI uri = URI.create(value);
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
            String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
            if ("https".equals(scheme)) {
                return;
            }
            if ("http".equals(scheme) && isLocalDevelopmentHost(host)) {
                return;
            }
            throw new IllegalStateException("Property must use HTTPS outside local development: " + propertyName);
        } catch (IllegalArgumentException ex) {
            throw new IllegalStateException("Property is not a valid URL: " + propertyName, ex);
        }
    }

    private static boolean isLocalDevelopmentHost(String host) {
        if (host.isBlank()) {
            return false;
        }
        if ("localhost".equals(host) || "127.0.0.1".equals(host)) {
            return true;
        }
        if (host.startsWith("10.") || host.startsWith("192.168.")) {
            return true;
        }
        if (host.startsWith("172.")) {
            String[] segments = host.split("\\.");
            if (segments.length > 1) {
                try {
                    int second = Integer.parseInt(segments[1]);
                    return second >= 16 && second <= 31;
                } catch (NumberFormatException ignored) {
                    return false;
                }
            }
        }
        return false;
    }
}
