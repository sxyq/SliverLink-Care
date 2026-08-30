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
  assignedElderIds?: string[];
  assignedElders?: ElderScopeOption[];
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
  elderId: string;
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
  id?: string;
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

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface AuditLogFilters {
  from?: string;
  to?: string;
  operator?: string;
  action?: string;
  result?: string;
  role?: string;
  verificationMethod?: string;
  sourceIp?: string;
  target?: string;
}

export interface AuditLogSummary {
  total: number;
  successCount: number;
  failureCount: number;
  pendingCount?: number;
  sourceIpCount: number;
  actions: Array<{ label: string; value: number }>;
  verificationMethods: Array<{ label: string; value: number }>;
  trend: Array<{ day: string; value: number }>;
  recent: AuditLog[];
  asOf?: string;
  lagSeconds?: number;
  source?: string;
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

export interface AdminReviewRequest {
  id: string;
  type: string;
  title: string;
  summary: string;
  targetId: string;
  targetLabel: string;
  elderId: string;
  elderName: string;
  archiveNo: string;
  qrCodeId: string;
  qrStatus: string;
  requesterAccount: string;
  requesterRole: string;
  requesterRoleLabel: string;
  requesterNote: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  createdAt: string;
  handledAt: string;
  handledBy: string;
  resultNote: string;
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
