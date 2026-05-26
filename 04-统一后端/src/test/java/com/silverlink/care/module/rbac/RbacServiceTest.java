package com.silverlink.care.module.rbac;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class RbacServiceTest {

    private RbacService service;

    @BeforeEach
    void setUp() {
        service = new RbacService();
    }

    @Test
    void listRolesReturnsSeededRoles() {
        var roles = service.listRoles();
        assertEquals(4, roles.size());
        assertEquals("VOLUNTEER", roles.get(0).getCode());
        assertEquals("PROJECT_ADMIN", roles.get(1).getCode());
        assertEquals("AUDITOR", roles.get(2).getCode());
        assertEquals("SYSTEM_ADMIN", roles.get(3).getCode());
    }

    @Test
    void listPermissionsReturnsSeededPermissions() {
        var perms = service.listPermissions();
        assertEquals(5, perms.size());
        assertEquals("ELDER_READ", perms.get(0).getCode());
        assertEquals("ELDER_WRITE", perms.get(1).getCode());
        assertEquals("QR_MANAGE", perms.get(2).getCode());
        assertEquals("VOLUNTEER_MANAGE", perms.get(3).getCode());
        assertEquals("AUDIT_LOG_READ", perms.get(4).getCode());
    }

    @Test
    void assignRoleAndGetUserRoles() {
        service.assignRole("user-1", "VOLUNTEER");
        service.assignRole("user-1", "PROJECT_ADMIN");
        service.assignRole("user-2", "AUDITOR");

        List<String> roles1 = service.getUserRoles("user-1");
        assertEquals(2, roles1.size());
        assertTrue(roles1.contains("VOLUNTEER"));
        assertTrue(roles1.contains("PROJECT_ADMIN"));

        List<String> roles2 = service.getUserRoles("user-2");
        assertEquals(1, roles2.size());
        assertEquals("AUDITOR", roles2.get(0));
    }

    @Test
    void getUserRolesReturnsEmptyForUnknownUser() {
        List<String> roles = service.getUserRoles("unknown");
        assertTrue(roles.isEmpty());
    }

    @Test
    void getDataScopeReturnsCorrectScopeForKnownRole() {
        assertEquals("SELF_ELDER", service.getDataScope("VOLUNTEER"));
        assertEquals("PROJECT", service.getDataScope("PROJECT_ADMIN"));
        assertEquals("AUDIT_ONLY", service.getDataScope("AUDITOR"));
        assertEquals("ALL", service.getDataScope("SYSTEM_ADMIN"));
    }

    @Test
    void getDataScopeReturnsNoneForUnknownRole() {
        assertEquals("NONE", service.getDataScope("UNKNOWN"));
    }

    @Test
    void roleEntitiesHaveCorrectNames() {
        var roles = service.listRoles();
        assertEquals("志愿者", roles.get(0).getName());
        assertEquals("项目管理员", roles.get(1).getName());
        assertEquals("审计员", roles.get(2).getName());
        assertEquals("系统管理员", roles.get(3).getName());
    }

    @Test
    void permissionEntitiesHaveCorrectTypes() {
        var perms = service.listPermissions();
        for (var p : perms) {
            assertEquals("MENU", p.getType());
        }
    }
}
