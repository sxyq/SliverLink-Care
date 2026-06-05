package com.silverlink.care.security;

import com.silverlink.care.module.rbac.RbacService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RbacPermissionEvaluatorTest {

    @Mock
    private RbacService rbacService;

    @InjectMocks
    private RbacPermissionEvaluator evaluator;

    @Test
    void hasPermission_systemAdmin_returnsTrue() {
        when(rbacService.getUserRoles("user-1")).thenReturn(List.of("SYSTEM_ADMIN"));

        assertTrue(evaluator.hasPermission("user-1", "ELDER_READ"));
    }

    @Test
    void hasPermission_systemAdminAmongOtherRoles_returnsTrue() {
        when(rbacService.getUserRoles("user-2")).thenReturn(List.of("VOLUNTEER", "SYSTEM_ADMIN"));

        assertTrue(evaluator.hasPermission("user-2", "ELDER_WRITE"));
    }

    @Test
    void hasPermission_nonAdmin_returnsFalse() {
        when(rbacService.getUserRoles("user-3")).thenReturn(List.of("VOLUNTEER"));

        assertFalse(evaluator.hasPermission("user-3", "ELDER_READ"));
    }

    @Test
    void hasPermission_multipleNonAdminRoles_returnsFalse() {
        when(rbacService.getUserRoles("user-4")).thenReturn(List.of("VOLUNTEER", "PROJECT_ADMIN"));

        assertFalse(evaluator.hasPermission("user-4", "QR_MANAGE"));
    }

    @Test
    void hasPermission_emptyRoles_returnsFalse() {
        when(rbacService.getUserRoles("user-5")).thenReturn(Collections.emptyList());

        assertFalse(evaluator.hasPermission("user-5", "AUDIT_LOG_READ"));
    }

    @Test
    void hasPermission_auditorRole_returnsFalse() {
        when(rbacService.getUserRoles("user-6")).thenReturn(List.of("AUDITOR"));

        assertFalse(evaluator.hasPermission("user-6", "VOLUNTEER_MANAGE"));
    }

    @Test
    void canAccessDataScope_allScope_returnsTrue() {
        when(rbacService.getDataScope("SYSTEM_ADMIN")).thenReturn("ALL");

        assertTrue(evaluator.canAccessDataScope("SYSTEM_ADMIN", "SELF_ELDER"));
    }

    @Test
    void canAccessDataScope_allScope_anyDataScope_returnsTrue() {
        when(rbacService.getDataScope("SYSTEM_ADMIN")).thenReturn("ALL");

        assertTrue(evaluator.canAccessDataScope("SYSTEM_ADMIN", "PROJECT"));
        assertTrue(evaluator.canAccessDataScope("SYSTEM_ADMIN", "AUDIT_ONLY"));
    }

    @Test
    void canAccessDataScope_matchingScope_returnsTrue() {
        when(rbacService.getDataScope("VOLUNTEER")).thenReturn("SELF_ELDER");

        assertTrue(evaluator.canAccessDataScope("VOLUNTEER", "SELF_ELDER"));
    }

    @Test
    void canAccessDataScope_nonMatchingScope_returnsFalse() {
        when(rbacService.getDataScope("VOLUNTEER")).thenReturn("SELF_ELDER");

        assertFalse(evaluator.canAccessDataScope("VOLUNTEER", "PROJECT"));
    }

    @Test
    void canAccessDataScope_projectScope_matching_returnsTrue() {
        when(rbacService.getDataScope("PROJECT_ADMIN")).thenReturn("PROJECT");

        assertTrue(evaluator.canAccessDataScope("PROJECT_ADMIN", "PROJECT"));
    }

    @Test
    void canAccessDataScope_auditOnlyScope_matching_returnsTrue() {
        when(rbacService.getDataScope("AUDITOR")).thenReturn("AUDIT_ONLY");

        assertTrue(evaluator.canAccessDataScope("AUDITOR", "AUDIT_ONLY"));
    }

    @Test
    void canAccessDataScope_auditOnlyScope_nonMatching_returnsFalse() {
        when(rbacService.getDataScope("AUDITOR")).thenReturn("AUDIT_ONLY");

        assertFalse(evaluator.canAccessDataScope("AUDITOR", "SELF_ELDER"));
    }

    @Test
    void canAccessDataScope_noneScope_returnsFalseForAny() {
        when(rbacService.getDataScope("UNKNOWN")).thenReturn("NONE");

        assertFalse(evaluator.canAccessDataScope("UNKNOWN", "SELF_ELDER"));
        assertFalse(evaluator.canAccessDataScope("UNKNOWN", "PROJECT"));
        assertFalse(evaluator.canAccessDataScope("UNKNOWN", "ALL"));
    }
}
