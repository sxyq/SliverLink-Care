export interface ScanBasicInfo {
  elderId: string;
  archiveNo: string;
  name: string;
  gender: string;
  age: number;
  residence: string;
  emergencyContactName: string;
  emergencyPhoneMasked: string;
  emergencyPhoneDial: string;
  relationship: string;
  aboType: string;
  rhType: string;
  allergySummary: string;
}

export interface ScanResolveRequest {
  token: string;
}

export interface ScanVerificationSession {
  sessionId: string;
  elderId: string;
  receiverPhone: string;
  receiverPhoneMasked: string;
  messageBody: string;
  messagePrefix: string;
  status: 'PENDING' | 'VERIFIED' | 'EXPIRED';
  expiresAt: string;
}

export interface ScanVerificationStatus {
  sessionId: string;
  elderId: string;
  status: 'PENDING' | 'VERIFIED' | 'EXPIRED';
  verified: boolean;
  verifiedAt: string;
  senderPhoneMasked: string;
}

export interface ScanIdentityVerificationPayload {
  elderId: string;
  target: string;
  name: string;
  phone: string;
  idCard: string;
}

export interface ScanArchiveRecord {
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

export interface ScanMedicationItem {
  name: string;
  dosage: string;
  usage: string;
  time: string;
}

export interface ScanScaleAnswerDetail {
  question: string;
  value: number | null;
}

export interface ScanScaleSummaryItem {
  name: string;
  score: number;
  updatedAt: string;
  volunteer: string;
  answers?: ScanScaleAnswerDetail[];
  level?: string;
  note?: string;
}
