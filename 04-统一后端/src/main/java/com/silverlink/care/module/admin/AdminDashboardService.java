package com.silverlink.care.module.admin;

import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class AdminDashboardService {

    private final SilverLinkDataService data;

    public AdminDashboardService(SilverLinkDataService data) {
        this.data = data;
    }

    public Map<String, Object> stats() {
        return data.dashboard();
    }

    public List<Map<String, Object>> elders() {
        return data.eldersForAdmin();
    }

    public List<Map<String, Object>> volunteers() {
        return data.volunteers();
    }

    public List<Map<String, Object>> auditLogs() {
        return data.auditLogs(null, null, null);
    }
}
