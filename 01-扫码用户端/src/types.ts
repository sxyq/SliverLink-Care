export type VerificationState = 'none' | 'pending' | 'verified';

export interface ElderBasicInfo {
  id: string;
  archiveNo: string;
  name: string;
  gender: string;
  age: number;
  emergencyContact: string;
  emergencyPhoneMasked: string;
  emergencyPhoneDial: string;
  relationship: string;
  aboType: string;
  rhType: string;
  allergySummary: string;
}

export interface HealthRecord {
  date: string;
  volunteer: string;
  heightCm: number;
  weightKg: number;
  waistCm: number;
  bmi: number;
  healthSelfAssessment: string;
  selfCareAssessment: string;
  cognitiveScreening: string;
  emotionScreening: string;
}

export interface Medication {
  name: string;
  dosage: string;
  usage: string;
  time: string;
}

export type ScaleName = 'PHQ-9' | 'GAD-7' | 'UCLA';

export interface ScaleSummary {
  name: ScaleName;
  score: number;
  updatedAt: string;
  volunteer: string;
  level?: string;
  note?: string;
}
