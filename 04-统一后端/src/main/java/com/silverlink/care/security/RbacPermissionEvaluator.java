package com.silverlink.care.security;

import com.silverlink.care.module.rbac.RbacService;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class RbacPermissionEvaluator {

    private final RbacService rbacService;

    public RbacPermissionEvaluator(RbacService rbacService) {
        this.rbacService = rbacService;
    }

    public boolean hasPermission(String userId, String permissionCode) {
        List<String> roles = rbacService.getUserRoles(userId);
        for (String role : roles) {
            if ("SYSTEM_ADMIN".equals(role)) {
                return true;
            }
        }
        return false;
    }

    public boolean canAccessDataScope(String roleCode, String dataScope) {
        String scope = rbacService.getDataScope(roleCode);
        if ("ALL".equals(scope)) return true;
        return scope.equals(dataScope);
    }
}
