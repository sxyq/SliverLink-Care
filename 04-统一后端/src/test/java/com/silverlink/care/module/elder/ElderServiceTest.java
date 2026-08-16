package com.silverlink.care.module.elder;

import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ElderServiceTest {

    private SilverLinkDataService data;
    private ElderService service;

    @BeforeEach
    void setUp() {
        data = mock(SilverLinkDataService.class);
        service = new ElderService(data);
    }

    @Test
    void delegatesSaveAndReadOperations() {
        Map<String, Object> basic = Map.of("name", "李奶奶");
        Map<String, Object> health = Map.of("summary", "稳定");
        List<Map<String, String>> medications = List.of(Map.of("name", "阿司匹林"));
        List<Map<String, Object>> scales = List.of(Map.of("scale", "PHQ-9"));
        when(data.scales("elder-1")).thenReturn(scales);

        service.saveBasic("elder-1", basic);
        service.saveHealth("elder-1", health);
        service.saveMedications("elder-1", medications);
        service.saveScales("elder-1", scales);
        assertEquals(scales, service.getScales("elder-1"));

        verify(data).saveBasic("elder-1", basic);
        verify(data).saveHealth("elder-1", health);
        verify(data).saveMedicationList("elder-1", medications);
        verify(data).saveScales("elder-1", scales);
        verify(data).requireVolunteerScope("elder-1");
        verify(data).scales("elder-1");
    }
}
