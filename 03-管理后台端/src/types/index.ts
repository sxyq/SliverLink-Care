export interface DashboardMetric {
  label: string;
  value: string;
  trend: string;
  icon?: string;
}

export interface ElderRow {
  id?: string;
  archiveNo: string;
  name: string;
  gender?: string;
  age: number;
  residence?: string;
  phoneMasked: string;
  aboType?: string;
  rhType?: string;
  volunteer: string;
  status: string;
}

export interface VolunteerRow {
  id: string;
  name: string;
  account: string;
  phone?: string;
  elderCount: number;
  status: string;
  lastSubmit: string;
  createdAt?: string;
  createMethod?: string;
  invitationCode?: string;
}

export interface ElderScopeOption {
  id: string;
  archiveNo: string;
  name: string;
  age: number;
  status: string;
}

export interface QrCodeRow {
  id: string;
  token: string;
  archiveNo: string | null;
  elderName: string | null;
  elderAge?: number | null;
  elderPhone?: string | null;
  relayDeviceId?: string | null;
  relayReceiverPhone?: string | null;
  url?: string | null;
  status: string;
  createdAt: string;
}

export interface MedicationRow {
  id: string;
  elderId?: string;
  archiveNo: string;
  elderName: string;
  drugName: string;
  dosage: string;
  usage: string;
  timing: string;
  updatedAt: string;
  status: string;
}

export interface ScaleRecordRow {
  id: string;
  elderId?: string;
  archiveNo?: string;
  elderName?: string;
  scaleName: string;
  score: number;
  date: string;
  volunteer: string;
}

export interface RolePermission {
  role: string;
  dataScope: string;
  menuPermissions: string[];
  apiPermissions: string[];
  exportPermissions: string[];
}

export interface AuditLog {
  time: string;
  operator: string;
  role?: string;
  action: string;
  verificationMethod?: string;
  visitorName?: string;
  visitorPhone?: string;
  visitorPhoneMasked?: string;
  visitorIdCard?: string;
  visitorIdCardMasked?: string;
  target: string;
  ip: string;
  result: '成功' | '失败' | string;
}

export interface SecurityModule {
  key: string;
  name: string;
  status: string;
  description: string;
}

export interface NavItem {
  label: string;
  path: string;
  icon?: string;
}

export interface InvitationRow {
  id: string;
  code: string;
  elderId: string;
  elderName: string;
  archiveNo: string;
  expiresAt: string;
  maxUses: number;
  usedCount: number;
  status: string;
  createdAt: string;
}

export interface FamilyBindingRow {
  id: string;
  familyName: string;
  familyPhoneMasked: string;
  relationship: string;
  elderName: string;
  elderArchiveNo: string;
  invitationCode: string;
  boundAt: string;
  status: string;
  createMethod?: string;
}

export interface SmsRelayDeviceRow {
  deviceId: string;
  receiverPhone: string;
  serverUrl: string;
  messagePrefix: string;
  status: string;
  serviceStatus: string;
  lastHeartbeat: string;
}

export interface SmsRelayRecordRow {
  id: string;
  deviceId: string;
  receiverPhone: string;
  senderPhone: string;
  messageBody: string;
  receivedAt: string;
  uploadedAt: string;
  status: string;
}

export interface SmsRelaySessionRow {
  sessionId: string;
  elderId: string;
  target: string;
  relayDeviceId: string;
  receiverPhone: string;
  messageBody: string;
  status: string;
  expiresAt: string;
  verifiedAt: string;
  senderPhoneMasked: string;
  createdAt: string;
}
