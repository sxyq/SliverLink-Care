export interface AssignedElder {
  id: string;
  archiveNo: string;
  name: string;
  gender?: BasicInfo['gender'] | string;
  age: number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  aboType?: string;
  rhType?: string;
  allergySummary?: string;
  lastVisitDate: string;
  status: '待随访' | '已完成' | '需复核';
}

export interface BasicInfo {
  name: string;
  gender: '男' | '女';
  age: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  aboBloodType: string;
  rhBloodType: string;
  allergyHistory: string;
}

export interface HealthFormState {
  heightCm: string;
  weightKg: string;
  waistCm: string;
  healthSelfAssessment: string;
  selfCareAssessment: string;
  cognitiveScreening: string;
  emotionScreening: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  usage: string;
  timing: string;
}

export interface ScaleAnswer {
  question: string;
  value: number | null;
}

export type ScaleType = 'PHQ-9' | 'GAD-7' | 'UCLA';

export interface ScaleForm {
  type: ScaleType;
  answers: ScaleAnswer[];
}
