package com.silverlink.care.module.audit;

import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import org.springframework.stereotype.Service;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class AuditLogService {

    private final SilverLinkDataService data;

    public AuditLogService(SilverLinkDataService data) {
        this.data = data;
    }

    public List<AuditLogEntity> listAll() {
        return toEntities(data.auditLogs(null, null, null));
    }

    public List<AuditLogEntity> filter(String operator, String action, String result) {
        return toEntities(data.auditLogs(operator, action, result));
    }

    public void record(String operator, String role, String ip, String target, String action, String result, String failReason, String requestId) {
        data.recordAudit(operator, role, ip, target, action, result, failReason, requestId);
    }

    public String operatorOf(Authentication authentication) {
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            return "anonymous";
        }
        return authentication.getName();
    }

    public String roleOf(Authentication authentication) {
        if (authentication == null || authentication.getAuthorities() == null || authentication.getAuthorities().isEmpty()) {
            return "UNKNOWN";
        }
        GrantedAuthority authority = authentication.getAuthorities().iterator().next();
        if (authority == null || authority.getAuthority() == null) {
            return "UNKNOWN";
        }
        return authority.getAuthority().replace("ROLE_", "");
    }

    public void record(Authentication authentication, String ip, String target, String action, String result) {
        record(operatorOf(authentication), roleOf(authentication), ip, target, action, result, null, null);
    }

    private List<AuditLogEntity> toEntities(List<Map<String, Object>> rows) {
        List<AuditLogEntity> list = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            AuditLogEntity log = new AuditLogEntity();
            log.setId(data.str(row.get("id")));
            log.setTime(data.str(row.get("time")));
            log.setOperator(data.str(row.get("operator")));
            log.setRole(data.str(row.get("role")));
            log.setSourceIp(data.str(row.get("sourceIp")));
            log.setTarget(data.str(row.get("target")));
            log.setAction(data.str(row.get("action")));
            log.setResult(data.str(row.get("result")));
            log.setFailReason(data.str(row.get("failReason")));
            log.setRequestId(data.str(row.get("requestId")));
            list.add(log);
        }
        return list;
    }
}
