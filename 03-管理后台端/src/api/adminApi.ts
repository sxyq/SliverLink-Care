import type { AuditLog, ElderRow, SmsRelayDeviceRow, SmsRelayRecordRow, SmsRelaySessionRow } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const GET_CACHE_TTL_MS = 15_000;
const responseCache = new Map<string, { expiresAt: number; data: unknown }>();
const pendingGetRequests = new Map<string, Promise<unknown>>();

interface ApiEnvelope<T> {
  code?: number;
  message?: string;
  data?: T;
}

function clearAdminSession() {
  localStorage.removeItem('sl_admin_token');
  localStorage.removeItem('sl_admin_role');
  window.dispatchEvent(new CustomEvent('sl-admin-session-cleared'));
}

function normalizeErrorMessage(text: string) {
  if (!text) return '请求失败';
  if (text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text) as ApiEnvelope<unknown> & { error?: string };
      if (parsed.message) return parsed.message;
      if (parsed.error) return parsed.error;
    } catch {
      return '请求失败';
    }
    return '请求失败';
  }
  return text;
}

function isGetRequest(options?: RequestInit) {
  return !options?.method || options.method.toUpperCase() === 'GET';
}

function getRequestCacheKey(path: string) {
  const token = localStorage.getItem('sl_admin_token') || '';
  return `${path}::${token}`;
}

const ADMIN_SIGNATURE_SECRET = import.meta.env.VITE_ADMIN_SIGNATURE_SECRET || 'demo-admin-signature-secret';

async function hmacSha256Hex(secret: string, value: string) {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.subtle) {
    throw new Error('当前浏览器不支持管理后台签名能力');
  }
  const encoder = new TextEncoder();
  const key = await cryptoApi.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await cryptoApi.subtle.sign('HMAC', key, encoder.encode(value));
  return Array.from(new Uint8Array(signature))
    .map((item) => item.toString(16).padStart(2, '0'))
    .join('');
}

async function createSignatureHeaders(method: string, path: string) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const requestPath = path.split('?')[0] || path;
  const canonical = `${method.toUpperCase()}\n${requestPath}\n${timestamp}\n${nonce}`;
  return {
    'X-Timestamp': timestamp,
    'X-Nonce': nonce,
    'X-Signature': await hmacSha256Hex(ADMIN_SIGNATURE_SECRET, canonical),
  };
}

export function invalidateAdminCache() {
  responseCache.clear();
  pendingGetRequests.clear();
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const isGet = isGetRequest(options);
  const cacheKey = getRequestCacheKey(path);
  if (isGet) {
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }
    const pending = pendingGetRequests.get(cacheKey);
    if (pending) {
      return (await pending) as T;
    }
  }

  const token = localStorage.getItem('sl_admin_token') || '';
  const execute = async () => {
    const method = options?.method || 'GET';
    const signatureHeaders = await createSignatureHeaders(method, path);
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...signatureHeaders,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers || {}),
      },
    });

    if (response.status === 401 || response.status === 403) {
      clearAdminSession();
      invalidateAdminCache();
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      if (response.status === 401 || response.status === 403) {
        throw new Error('登录态已失效或当前账号无权访问，请重新登录管理员账号');
      }
      throw new Error(normalizeErrorMessage(text));
    }

    const json = (await response.json()) as ApiEnvelope<T> | T;
    if (json && typeof json === 'object' && 'data' in json) {
      const envelope = json as ApiEnvelope<T>;
      if (typeof envelope.code === 'number' && envelope.code >= 400) {
        throw new Error(envelope.message || `API ${envelope.code}`);
      }
      return envelope.data as T;
    }

    return json as T;
  };

  if (!isGet) {
    const result = await execute();
    invalidateAdminCache();
    return result;
  }

  const promise = execute();
  pendingGetRequests.set(cacheKey, promise);
  try {
    const result = await promise;
    responseCache.set(cacheKey, { expiresAt: Date.now() + GET_CACHE_TTL_MS, data: result });
    return result;
  } finally {
    pendingGetRequests.delete(cacheKey);
  }
}

function formatAdminStatus(status: unknown) {
  return String(status || '').toUpperCase() === 'ACTIVE' ? '启用' : '停用';
}

function formatFamilyStatus(status: unknown) {
  return String(status || '').toUpperCase() === 'ACTIVE' ? '已绑定' : '已解绑';
}

function formatQrStatus(status: unknown) {
  const value = String(status || '').toUpperCase();
  if (value === 'ENABLED' || value === 'ACTIVE') return '启用';
  if (value === 'DISABLED') return '已停用';
  if (value === 'REGENERATED') return '已重新生成';
  return '启用';
}

function formatInvitationStatus(row: Record<string, unknown>) {
  const status = String(row.status || '').toUpperCase();
  const usedCount = Number(row.usedCount || 0);
  const maxUses = Number(row.maxUses || 1);
  const expiresAt = String(row.expiresAt || '');

  if (status === 'DISABLED') return '已作废';
  if (expiresAt) {
    const expiresTime = Date.parse(expiresAt);
    if (!Number.isNaN(expiresTime) && expiresTime < Date.now()) return '已过期';
  }
  if (usedCount >= maxUses && maxUses > 0) return '已使用';
  return '未使用';
}

function mapMedicationRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => ({
    id: String(row.id || ''),
    elderId: row.elderId ? String(row.elderId) : '',
    archiveNo: String(row.archiveNo || ''),
    elderName: String(row.elderName || ''),
    drugName: String(row.drugName || row.name || ''),
    dosage: String(row.dosage || ''),
    usage: String(row.usage || ''),
    timing: String(row.timing || row.time || ''),
    updatedAt: String(row.updatedAt || row.updateTime || ''),
    status: String(row.status || '使用中'),
  }));
}

export async function loginAdmin(account: string, password: string) {
  let result: { token: string; role: string };
  try {
    result = await request<{ token: string; role: string }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ account, password }),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      throw new Error('账号或密码错误');
    }
    throw error;
  }
  localStorage.setItem('sl_admin_token', result.token);
  localStorage.setItem('sl_admin_role', result.role || '系统管理员');
  return { ok: Boolean(result.token), role: result.role || '系统管理员' };
}

export async function logoutAdmin() {
  try {
    await request<void>('/api/admin/logout', { method: 'POST' });
  } catch {
    // remote backend may not expose logout yet
  }
}

export async function fetchDashboard() {
  const stats = await request<Record<string, unknown>>('/api/admin/dashboard');
  const elderRows = await fetchElders();
  const auditLogs = await fetchAuditLogs();
  const dashboardMetrics = [
    { label: '老人档案', value: String(stats.elderCount || elderRows.length), trend: '实时数据' },
    { label: '志愿者账号', value: String(stats.volunteerCount || 0), trend: '实时数据' },
    { label: '二维码', value: String(stats.qrCodeCount || 0), trend: '加密 token' },
    { label: '操作日志', value: String(stats.auditCount || auditLogs.length), trend: '可审计' },
  ];
  return { dashboardMetrics, elderRows, auditLogs };
}

export async function fetchElders() {
  const rows = await request<Array<Record<string, unknown>>>('/api/admin/elders');
  return rows.map((row) => ({
    id: String(row.id || row.elderId || ''),
    archiveNo: String(row.archiveNo || ''),
    name: String(row.name || ''),
    gender: String(row.gender || ''),
    age: Number(row.age || 0),
    residence: String(row.residence || ''),
    phoneMasked: String(
      row.phone || row.emergencyContactPhone || row.emergencyPhoneDial || row.phoneMasked || row.emergencyPhoneMasked || '',
    ),
    aboType: String(row.aboType || row.bloodType || ''),
    rhType: String(row.rhType || ''),
    volunteer: String(row.volunteer || '未分配'),
    status: formatAdminStatus(row.status),
  }));
}

export async function createElder(body: Record<string, unknown>) {
  return request<{ id: string }>('/api/admin/elders', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function deleteElder(id: string) {
  return request<void>(`/api/admin/elders/${id}`, { method: 'DELETE' });
}

export async function setElderStatus(id: string, status: 'ACTIVE' | 'DISABLED') {
  return request<void>(`/api/admin/elders/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export async function fetchVolunteers() {
  const rows = await request<Array<Record<string, unknown>>>('/api/admin/volunteers');
  return rows.map((row) => ({
    id: String(row.id || ''),
    name: String(row.name || ''),
    account: String(row.account || ''),
    phone: String(row.phone || ''),
    elderCount: Number(row.scopeCount || row.elderCount || 0),
    status: formatAdminStatus(row.status),
    lastSubmit: String(row.lastSubmit || '-'),
    createdAt: String(row.createdAt || row.createTime || '-'),
    createMethod: String(row.createMethod || row.source || '后台创建'),
    invitationCode: String(row.invitationCode || '-'),
  }));
}

export async function createVolunteer(body: Record<string, unknown>) {
  return request<{ id: string }>('/api/admin/volunteers', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateVolunteer(id: string, body: Record<string, unknown>) {
  return request<void>(`/api/admin/volunteers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function updateVolunteerScope(id: string, elderIds: string[]) {
  return request<void>(`/api/admin/volunteers/${id}/scope`, {
    method: 'PUT',
    body: JSON.stringify({ elderIds }),
  });
}

export async function deleteVolunteer(id: string) {
  return request<void>(`/api/admin/volunteers/${id}`, { method: 'DELETE' });
}

export async function fetchQrCodes() {
  const rows = await request<Array<Record<string, unknown>>>('/api/admin/qrcodes');
  return rows.map((row) => ({
    id: String(row.id || ''),
    token: String(row.qrId || row.qrTokenHash || ''),
    archiveNo: row.archiveNo ? String(row.archiveNo) : null,
    elderName: row.elderName ? String(row.elderName) : null,
    elderAge: row.elderAge == null ? null : Number(row.elderAge),
    elderPhone: row.elderPhone ? String(row.elderPhone) : null,
    relayDeviceId: row.relayDeviceId ? String(row.relayDeviceId) : null,
    relayReceiverPhone: row.relayReceiverPhone ? String(row.relayReceiverPhone) : null,
    url: row.url ? String(row.url) : null,
    status: formatQrStatus(row.status),
    createdAt: String(row.createdAt || ''),
  }));
}

export async function createQrCode(elderId: string, archiveNo: string) {
  return request<Record<string, string>>('/api/admin/qrcodes', {
    method: 'POST',
    body: JSON.stringify({ elderId, archiveNo }),
  });
}

export async function disableQrCode(id: string) {
  return request<void>(`/api/admin/qrcodes/${id}/disable`, { method: 'PUT' });
}

export async function regenerateQrCode(id: string) {
  return request<Record<string, string>>(`/api/admin/qrcodes/${id}/regenerate`, { method: 'POST' });
}

export async function updateQrCodeRelayDevice(id: string, relayDeviceId: string) {
  const row = await request<Record<string, unknown>>(`/api/admin/qrcodes/${encodeURIComponent(id)}/relay-device`, {
    method: 'PUT',
    body: JSON.stringify({ relayDeviceId }),
  });
  return {
    id: String(row.id || ''),
    relayDeviceId: row.relayDeviceId ? String(row.relayDeviceId) : null,
    relayReceiverPhone: row.relayReceiverPhone ? String(row.relayReceiverPhone) : null,
  };
}

export async function fetchInvitations() {
  const rows = await request<Array<Record<string, unknown>>>('/api/admin/invitations');
  return rows.map((row) => ({
    id: String(row.id || ''),
    code: String(row.code || ''),
    elderId: String(row.elderId || row.elder_id || ''),
    elderName: String(row.elderName || ''),
    archiveNo: String(row.archiveNo || ''),
    expiresAt: String(row.expiresAt || ''),
    maxUses: Number(row.maxUses || 1),
    usedCount: Number(row.usedCount || 0),
    status: formatInvitationStatus(row),
    createdAt: String(row.createdAt || ''),
  }));
}

export async function createInvitation(elderId: string, expiresInDays: number, maxUses: number) {
  return request<Record<string, unknown>>('/api/admin/invitations', {
    method: 'POST',
    body: JSON.stringify({ elderId, expiresInDays, maxUses }),
  });
}

export async function disableInvitation(id: string) {
  return request<void>(`/api/admin/invitations/${id}/disable`, { method: 'PUT' });
}

export async function deleteInvitation(id: string) {
  return request<void>(`/api/admin/invitations/${id}`, { method: 'DELETE' });
}

export async function fetchFamilyBindings() {
  const rows = await request<Array<Record<string, unknown>>>('/api/admin/family-bindings');
  return rows.map((row) => ({
    id: String(row.id || ''),
    familyName: String(row.familyName || ''),
    familyPhoneMasked: String(row.familyPhoneMasked || ''),
    relationship: String(row.relationship || ''),
    elderName: String(row.elderName || ''),
    elderArchiveNo: String(row.elderArchiveNo || ''),
    invitationCode: String(row.invitationCode || ''),
    boundAt: String(row.boundAt || ''),
    status: formatFamilyStatus(row.status),
    createMethod: String(row.createMethod || '邀请码注册'),
  }));
}

export async function unbindFamily(id: string) {
  return request<void>(`/api/admin/family-bindings/${id}/disable`, { method: 'PUT' });
}

export async function fetchAuditLogs() {
  const rows = await request<Array<Record<string, unknown>>>('/api/admin/audit-logs');
  return rows.map((row) => ({
    time: String(row.time || ''),
    operator: String(row.operator || ''),
    role: String(row.role || ''),
    action: String(row.action || ''),
    verificationMethod: String(row.verificationMethod || ''),
    visitorName: String(row.visitorName || ''),
    visitorPhone: String(row.visitorPhone || ''),
    visitorPhoneMasked: String(row.visitorPhoneMasked || ''),
    visitorIdCard: String(row.visitorIdCard || ''),
    visitorIdCardMasked: String(row.visitorIdCardMasked || ''),
    target: String(row.target || ''),
    ip: String(row.sourceIp || row.ip || ''),
    result: String(row.result || '').toUpperCase() === 'SUCCESS' ? '成功' : '失败',
  })) as AuditLog[];
}

export async function fetchMedications() {
  const rows = await request<Array<Record<string, unknown>>>('/api/admin/medications');
  return mapMedicationRows(rows);
}

export async function fetchElderMedications(elderId: string) {
  const rows = await request<Array<Record<string, unknown>>>(
    `/api/admin/medications?elderId=${encodeURIComponent(elderId)}`,
  );
  return mapMedicationRows(rows);
}

export async function saveElderMedications(elderId: string, items: Array<Record<string, string>>) {
  return request<{ recordId: string }>(`/api/elder/${elderId}/medications`, {
    method: 'POST',
    body: JSON.stringify(items),
  });
}

export async function fetchElderScales(elderId: string) {
  const rows = await request<Array<Record<string, unknown>>>(
    `/api/admin/scales?elderId=${encodeURIComponent(elderId)}`,
  );
  return rows.map((row) => ({
    id: String(row.id || ''),
    elderId,
    archiveNo: String(row.archiveNo || ''),
    elderName: String(row.elderName || ''),
    scaleName: String(row.scaleName || row.name || row.scale || ''),
    score: Number(row.score || 0),
    date: String(row.date || row.updatedAt || ''),
    volunteer: String(row.volunteer || ''),
  }));
}

export async function fetchAllScales(eldersInput?: Array<{ id?: string; archiveNo: string; name: string }>) {
  const elders = eldersInput ?? (await fetchElders());
  const nestedRows = await Promise.all(
    elders.map(async (elder) => {
      if (!elder.id) return [];
      const rows = await fetchElderScales(elder.id);
      return rows.map((row) => ({
        ...row,
        elderId: elder.id,
        archiveNo: row.archiveNo || elder.archiveNo,
        elderName: row.elderName || elder.name,
      }));
    }),
  );
  return nestedRows.flat().sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export async function saveElderScales(elderId: string, items: Array<Record<string, unknown>>) {
  return request<{ recordId: string }>(`/api/elder/${elderId}/scale-records`, {
    method: 'POST',
    body: JSON.stringify(items),
  });
}

function formatRelayStatus(status: unknown) {
  const value = String(status || '').trim().toUpperCase();
  if (value === '在线') return '在线';
  if (value === 'UPLOADED') return '已上传';
  if (value === 'VERIFIED') return '已验证';
  if (value === 'PENDING') return '等待验证';
  if (value === 'EXPIRED') return '已过期';
  return value || '未知';
}

function formatDateTime(value: unknown) {
  const text = String(value || '');
  if (!text) return '-';
  const numeric = Number(text);
  if (!Number.isNaN(numeric) && numeric > 0) {
    return new Date(numeric).toLocaleString('zh-CN', { hour12: false });
  }
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleString('zh-CN', { hour12: false });
}

export async function fetchSmsRelayDevices() {
  const rows = await request<Array<Record<string, unknown>>>('/api/sms-relay/admin/devices');
  return rows.map((row) => ({
    deviceId: String(row.deviceId || ''),
    receiverPhone: String(row.receiverPhone || ''),
    serverUrl: String(row.serverUrl || ''),
    messagePrefix: String(row.messagePrefix || ''),
    status: formatRelayStatus(row.status),
    serviceStatus: String(row.serviceStatus || ''),
    lastHeartbeat: formatDateTime(row.lastHeartbeat),
  })) as SmsRelayDeviceRow[];
}

export async function updateSmsRelayDevice(deviceId: string, body: Pick<SmsRelayDeviceRow, 'receiverPhone' | 'serverUrl' | 'messagePrefix'>) {
  const row = await request<Record<string, unknown>>(`/api/sms-relay/admin/devices/${encodeURIComponent(deviceId)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return {
    deviceId: String(row.deviceId || ''),
    receiverPhone: String(row.receiverPhone || ''),
    serverUrl: String(row.serverUrl || ''),
    messagePrefix: String(row.messagePrefix || ''),
    status: formatRelayStatus(row.status),
    serviceStatus: String(row.serviceStatus || ''),
    lastHeartbeat: formatDateTime(row.lastHeartbeat),
  } as SmsRelayDeviceRow;
}

export async function fetchSmsRelayRecords() {
  const rows = await request<Array<Record<string, unknown>>>('/api/sms-relay/admin/records');
  return rows.map((row) => ({
    id: String(row.id || ''),
    deviceId: String(row.deviceId || ''),
    receiverPhone: String(row.receiverPhone || ''),
    senderPhone: String(row.senderPhone || ''),
    messageBody: String(row.messageBody || ''),
    receivedAt: formatDateTime(row.receivedAt),
    uploadedAt: formatDateTime(row.uploadedAt),
    status: formatRelayStatus(row.status),
  })) as SmsRelayRecordRow[];
}

export async function fetchSmsRelaySessions() {
  const rows = await request<Array<Record<string, unknown>>>('/api/sms-relay/admin/sessions');
  return rows.map((row) => ({
    sessionId: String(row.sessionId || ''),
    elderId: String(row.elderId || ''),
    target: String(row.target || ''),
    relayDeviceId: String(row.relayDeviceId || ''),
    receiverPhone: String(row.receiverPhone || ''),
    messageBody: String(row.messageBody || ''),
    status: formatRelayStatus(row.status),
    expiresAt: formatDateTime(row.expiresAt),
    verifiedAt: formatDateTime(row.verifiedAt),
    senderPhoneMasked: String(row.senderPhoneMasked || '-'),
    createdAt: formatDateTime(row.createdAt),
  })) as SmsRelaySessionRow[];
}
