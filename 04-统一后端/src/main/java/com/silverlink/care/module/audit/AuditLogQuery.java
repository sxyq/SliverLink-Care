package com.silverlink.care.module.audit;

public record AuditLogQuery(
        String from,
        String to,
        String operator,
        String action,
        String result,
        String role,
        String verificationMethod,
        String sourceIp,
        String target
) {
}
