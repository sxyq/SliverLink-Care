package com.silverlink.care.module.rbac;

import com.silverlink.care.common.ApiResponse;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rbac")
public class RoleController {

    private final RbacService rbacService;

    public RoleController(RbacService rbacService) {
        this.rbacService = rbacService;
    }

    @GetMapping("/roles")
    public ApiResponse<List<RoleEntity>> roles() {
        return ApiResponse.ok(rbacService.listRoles());
    }

    @GetMapping("/permissions")
    public ApiResponse<List<PermissionEntity>> permissions() {
        return ApiResponse.ok(rbacService.listPermissions());
    }

    @PostMapping("/assign")
    public ApiResponse<Map<String, String>> assign(@RequestBody Map<String, String> body) {
        rbacService.assignRole(body.get("userId"), body.get("roleCode"));
        Map<String, String> map = new LinkedHashMap<>();
        map.put("result", "assigned");
        return ApiResponse.ok(map);
    }
}
