package com.silverlink.care.module.elder;

import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
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

    public List<Map<String, Object>> getScales(String elderId) {
        data.requireVolunteerScope(elderId);
        List<Map<String, Object>> rows = data.scales(elderId);
        Map<String, Map<String, Object>> latestByScale = new LinkedHashMap<>();
        for (Map<String, Object> row : rows) {
            String scaleName = String.valueOf(row.getOrDefault("scale", row.getOrDefault("name", "")));
            if (scaleName.isBlank() || latestByScale.containsKey(scaleName)) {
                continue;
            }
            Map<String, Object> detail = data.scaleDetail(elderId, scaleName);
            latestByScale.put(scaleName, detail.isEmpty() ? row : detail);
        }
        return List.copyOf(latestByScale.values());
    }

    public List<Map<String, String>> getMedications(String elderId) {
        data.requireVolunteerScope(elderId);
        return data.medications(elderId);
    }
}
