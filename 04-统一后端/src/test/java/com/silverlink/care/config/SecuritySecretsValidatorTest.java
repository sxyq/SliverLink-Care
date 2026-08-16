package com.silverlink.care.config;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class SecuritySecretsValidatorTest {

    @Test
    void acceptsConfiguredNonDemoValues() {
        SecuritySecretsValidator validator = validator(
                "prod-jwt-secret-key-2026-silverlink-care-abcdefghijk",
                "prod-admin-signature-secret-2026-abcdefghijk",
                "relay-prod-device-01",
                "relay-prod-device-secret-2026"
        );

        assertDoesNotThrow(() -> ReflectionTestUtils.invokeMethod(validator, "validate"));
    }

    @Test
    void rejectsKnownInsecureDefaults() {
        SecuritySecretsValidator validator = validator(
                "demo-jwt-secret-key-2026-silverlink-care-must-be-32-bytes!!",
                "demo-admin-signature-secret",
                "relay-android-01",
                "secret-001"
        );

        assertThrows(IllegalStateException.class, () -> ReflectionTestUtils.invokeMethod(validator, "validate"));
    }

    private static SecuritySecretsValidator validator(
            String jwtSecret,
            String adminSignatureSecret,
            String defaultDeviceId,
            String defaultDeviceSecret
    ) {
        SecuritySecretsValidator validator = new SecuritySecretsValidator();
        ReflectionTestUtils.setField(validator, "jwtSecret", jwtSecret);
        ReflectionTestUtils.setField(validator, "adminSignatureSecret", adminSignatureSecret);
        ReflectionTestUtils.setField(validator, "defaultDeviceId", defaultDeviceId);
        ReflectionTestUtils.setField(validator, "defaultDeviceSecret", defaultDeviceSecret);
        ReflectionTestUtils.setField(validator, "smsRelayServerUrl", "https://test.silverlink.local/api");
        return validator;
    }
}
