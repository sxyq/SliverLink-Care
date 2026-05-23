export interface InvitationPreview {
  code: string;
  elderName: string;
  elderAge: number;
  elderArchiveNo: string;
  status: '未使用' | '已使用' | '已过期' | '已作废' | string;
  expiresAt: string;
  maxUses: number;
  usedCount: number;
}

export interface FamilyAccount {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

export interface ElderInfo {
  id: string;
  archiveNo: string;
  name: string;
  age: number;
  gender: string;
  bloodType: string;
  allergyHistory: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  backupContactName: string;
  backupContactPhone: string;
  backupContactRelation: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  usage: string;
  timing: string;
  updatedAt: string;
}

export interface QrCodeInfo {
  elderId: string;
  token: string;
  status: '启用' | '已停用' | string;
  createdAt: string;
  pdfUrl: string;
}
