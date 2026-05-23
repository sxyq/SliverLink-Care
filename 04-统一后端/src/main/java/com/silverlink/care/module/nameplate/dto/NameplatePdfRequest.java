package com.silverlink.care.module.nameplate.dto;

import java.util.List;

public class NameplatePdfRequest {
    private List<String> elderIds;
    private boolean blankTemplate;

    public List<String> getElderIds() { return elderIds; }
    public void setElderIds(List<String> elderIds) { this.elderIds = elderIds; }
    public boolean isBlankTemplate() { return blankTemplate; }
    public void setBlankTemplate(boolean blankTemplate) { this.blankTemplate = blankTemplate; }
}
