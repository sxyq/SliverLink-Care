package com.silverlink.care.module.rbac;

import com.silverlink.care.common.ApiResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class RoleControllerTest {

    private RbacService rbacService;
    private RoleController controller;

    @BeforeEach
    void setUp() {
        rbacService = new RbacService();
        controller = new RoleController(rbacService);
    }

    @Test
    void rolesReturnsSeededRoles() {
        var result = controller.roles();
        assertEquals(200, result.getCode());
        assertEquals(4, result.getData().size());
    }

    @Test
    void permissionsReturnsSeededPermissions() {
        var result = controller.permissions();
        assertEquals(200, result.getCode());
        assertEquals(5, result.getData().size());
    }

    @Test
    void assignDelegatesToService() {
        var result = controller.assign(Map.of("userId", "user-1", "roleCode", "VOLUNTEER"));
        assertEquals(200, result.getCode());
        assertEquals("assigned", result.getData().get("result"));
        assertEquals(1, rbacService.getUserRoles("user-1").size());
        assertEquals("VOLUNTEER", rbacService.getUserRoles("user-1").get(0));
    }
}
