package com.silverlink.care.module.volunteer;

import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class VolunteerService {

    private final SilverLinkDataService data;

    public VolunteerService(SilverLinkDataService data) {
        this.data = data;
    }

    public List<Map<String, Object>> getMyElders(String account) {
        return data.assignedElders(account);
    }
}
