package com.silverlink.care.module.rbac;

import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class RbacService {

    private final Map<String, RoleEntity> roleStore = new LinkedHashMap<>();
    private final Map<String, PermissionEntity> permissionStore = new LinkedHashMap<>();
    private final List<UserRoleEntity> userRoleStore = new ArrayList<>();

    public RbacService() {
        seedRoles();
        seedPermissions();
    }

    private void seedRoles() {
        RoleEntity r1 = new RoleEntity(); r1.setId("r1"); r1.setCode("VOLUNTEER"); r1.setName("志愿者"); r1.setDataScope("SELF_ELDER");
        RoleEntity r2 = new RoleEntity(); r2.setId("r2"); r2.setCode("PROJECT_ADMIN"); r2.setName("项目管理员"); r2.setDataScope("PROJECT");
        RoleEntity r3 = new RoleEntity(); r3.setId("r3"); r3.setCode("AUDITOR"); r3.setName("审计员"); r3.setDataScope("AUDIT_ONLY");
        RoleEntity r4 = new RoleEntity(); r4.setId("r4"); r4.setCode("SYSTEM_ADMIN"); r4.setName("系统管理员"); r4.setDataScope("ALL");
        roleStore.put(r1.getCode(), r1);
        roleStore.put(r2.getCode(), r2);
        roleStore.put(r3.getCode(), r3);
        roleStore.put(r4.getCode(), r4);
    }

    private void seedPermissions() {
        PermissionEntity p1 = new PermissionEntity(); p1.setId("p1"); p1.setCode("ELDER_READ"); p1.setName("老人档案查看"); p1.setType("MENU");
        PermissionEntity p2 = new PermissionEntity(); p2.setId("p2"); p2.setCode("ELDER_WRITE"); p2.setName("老人档案编辑"); p2.setType("MENU");
        PermissionEntity p3 = new PermissionEntity(); p3.setId("p3"); p3.setCode("QR_MANAGE"); p3.setName("二维码管理"); p3.setType("MENU");
        PermissionEntity p4 = new PermissionEntity(); p4.setId("p4"); p4.setCode("VOLUNTEER_MANAGE"); p4.setName("志愿者管理"); p4.setType("MENU");
        PermissionEntity p5 = new PermissionEntity(); p5.setId("p5"); p5.setCode("AUDIT_LOG_READ"); p5.setName("审计日志查看"); p5.setType("MENU");
        permissionStore.put(p1.getCode(), p1);
        permissionStore.put(p2.getCode(), p2);
        permissionStore.put(p3.getCode(), p3);
        permissionStore.put(p4.getCode(), p4);
        permissionStore.put(p5.getCode(), p5);
    }

    public List<RoleEntity> listRoles() {
        return new ArrayList<>(roleStore.values());
    }

    public List<PermissionEntity> listPermissions() {
        return new ArrayList<>(permissionStore.values());
    }

    public void assignRole(String userId, String roleCode) {
        UserRoleEntity ur = new UserRoleEntity();
        ur.setId(UUID.randomUUID().toString());
        ur.setUserId(userId);
        ur.setRoleCode(roleCode);
        userRoleStore.add(ur);
    }

    public List<String> getUserRoles(String userId) {
        List<String> roles = new ArrayList<>();
        for (UserRoleEntity ur : userRoleStore) {
            if (ur.getUserId().equals(userId)) {
                roles.add(ur.getRoleCode());
            }
        }
        return roles;
    }

    public String getDataScope(String roleCode) {
        RoleEntity r = roleStore.get(roleCode);
        return r == null ? "NONE" : r.getDataScope();
    }
}
