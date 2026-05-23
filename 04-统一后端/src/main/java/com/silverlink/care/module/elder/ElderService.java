package com.silverlink.care.module.elder;

import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class ElderService {

    private final SilverLinkDataService data;

    public ElderService(SilverLinkDataService data) {
        this.data = data;
    }

    public void saveBasic(String elderId, Map<String, Object> body) {
        data.saveBasic(elderId, body);
    }

    public void saveHealth(String elderId, Map<String, Object> body) {
        data.saveHealth(elderId, body);
    }

    public void saveMedications(String elderId, List<Map<String, String>> body) {
        data.saveMedicationList(elderId, body);
    }

    public void saveScales(String elderId, List<Map<String, Object>> body) {
        data.saveScales(elderId, body);
    }
}
