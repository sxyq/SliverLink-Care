export interface AssignedElder {
  id: string;
  archiveNo: string;
  name: string;
  gender?: BasicInfo['gender'] | string;
  age: number;
  residence?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  aboType?: string;
  rhType?: string;
  allergySummary?: string;
  lastVisitDate: string;
  status: '在档' | '已完成' | '需复核';
}

export interface CreateAssignedElderInput {
  name: string;
  gender: '男' | '女';
  age: string;
  residence: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  aboType: string;
  rhType: string;
  allergySummary: string;
}

export interface BasicInfo {
  name: string;
  gender: '男' | '女';
  age: string;
  residence: string;
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

export interface VolunteerQrCodeInfo {
  id: string;
  qrId: string;
  elderId: string;
  archiveNo: string;
  elderName: string;
  elderAge: number;
  elderPhone: string;
  status: string;
  createdAt: string;
  disabledAt?: string;
  token: string;
  url: string;
  publicUrl?: string;
  qrImageBase64?: string;
  qrImageUrl?: string;
  securityNote?: string;
  disableReviewStatus?: string;
  disableReviewId?: string;
  reviewMessage?: string;
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

export interface ScaleRecord {
  scale: ScaleType;
  name: ScaleType;
  score: number;
  date: string;
  volunteer?: string;
  answers: ScaleAnswer[];
}
