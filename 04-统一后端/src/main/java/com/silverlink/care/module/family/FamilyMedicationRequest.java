package com.silverlink.care.module.family;

public class FamilyMedicationRequest {
    private String name;
    private String dosage;
    private String usage;
    private String timing;

    public FamilyMedicationRequest() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDosage() { return dosage; }
    public void setDosage(String dosage) { this.dosage = dosage; }
    public String getUsage() { return usage; }
    public void setUsage(String usage) { this.usage = usage; }
    public String getTiming() { return timing; }
    public void setTiming(String timing) { this.timing = timing; }
}
