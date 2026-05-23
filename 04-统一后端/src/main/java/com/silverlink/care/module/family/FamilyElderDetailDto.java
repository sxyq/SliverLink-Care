package com.silverlink.care.module.family;

public class FamilyElderDetailDto {
    private String id;
    private String name;
    private Integer age;
    private String gender;
    private String bloodType;
    private String allergyHistory;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String emergencyContactRelation;
    private String backupContactName;
    private String backupContactPhone;
    private String backupContactRelation;

    public FamilyElderDetailDto() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    public String getBloodType() { return bloodType; }
    public void setBloodType(String bloodType) { this.bloodType = bloodType; }
    public String getAllergyHistory() { return allergyHistory; }
    public void setAllergyHistory(String allergyHistory) { this.allergyHistory = allergyHistory; }
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
