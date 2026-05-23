package com.silverlink.care.module.family;

public class UpdateContactsRequest {
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String emergencyContactRelation;
    private String backupContactName;
    private String backupContactPhone;
    private String backupContactRelation;

    public UpdateContactsRequest() {}

    public String getEmergencyContactName() { return emergencyContactName; }
    public void setEmergencyContactName(String emergencyContactName) { this.emergencyContactName = emergencyContactName; }
    public String getEmergencyContactPhone() { return emergencyContactPhone; }
    public void setEmergencyContactPhone(String emergencyContactPhone) { this.emergencyContactPhone = emergencyContactPhone; }
    public String getEmergencyContactRelation() { return emergencyContactRelation; }
    public void setEmergencyContactRelation(String emergencyContactRelation) { this.emergencyContactRelation = emergencyContactRelation; }
    public String getBackupContactName() { return backupContactName; }
    public void setBackupContactName(String backupContactName) { this.backupContactName = backupContactName; }
    public String getBackupContactPhone() { return backupContactPhone; }
    public void setBackupContactPhone(String backupContactPhone) { this.backupContactPhone = backupContactPhone; }
    public String getBackupContactRelation() { return backupContactRelation; }
    public void setBackupContactRelation(String backupContactRelation) { this.backupContactRelation = backupContactRelation; }
}
