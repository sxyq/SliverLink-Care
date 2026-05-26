import crypto from 'node:crypto';
import fs from 'node:fs';

const base = 'http://sxyq27.online/silverlink-api';
const reportDir = process.env.REPORT_DIR;
const secret = 'demo-admin-signature-secret';
const results = [];
let adminToken = '';
let volunteerToken = '';
let familyToken = '';
let firstElderId = '';
let secondElderId = '';
let firstQrToken = '';
let firstSessionId = '';

function signHeaders(method, path) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomUUID();
  const requestPath = path.split('?')[0] || path;
  const canonical = `${method.toUpperCase()}\n${requestPath}\n${timestamp}\n${nonce}`;
  const signature = crypto.createHmac('sha256', secret).update(canonical).digest('hex');
  return {
    'X-Timestamp': timestamp,
    'X-Nonce': nonce,
    'X-Signature': signature,
  };
}

function previewData(data) {
  if (Array.isArray(data)) return { type: 'array', count: data.length, first: data[0] ?? null };
  if (data && typeof data === 'object') return data;
  return data ?? null;
}

async function request(name, method, path, { body, token, signed = false, expectHttp = 200 } = {}) {
  const started = Date.now();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (signed) Object.assign(headers, signHeaders(method, path));
  let text = '';
  let parsed = null;
  let error = null;
  let status = 0;
  try {
    const response = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    status = response.status;
    text = await response.text();
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { raw: text.slice(0, 500) }; }
    if (status !== expectHttp) {
      error = `HTTP ${status}, expected ${expectHttp}`;
    } else if (parsed && typeof parsed.code === 'number' && parsed.code >= 400 && expectHttp < 400) {
      error = `API code ${parsed.code}: ${parsed.message || ''}`;
    }
  } catch (ex) {
    error = ex instanceof Error ? ex.message : String(ex);
  }
  const item = {
    name,
    method,
    path,
    status,
    durationMs: Date.now() - started,
    pass: !error,
    error,
    apiCode: parsed?.code,
    message: parsed?.message,
    dataPreview: previewData(parsed?.data),
  };
  results.push(item);
  fs.writeFileSync(`${reportDir}/logs/live-smoke-${results.length}-${name.replace(/[^a-zA-Z0-9_-]+/g, '-')}.json`, JSON.stringify({ item, raw: parsed ?? text }, null, 2));
  return parsed;
}

const adminLogin = await request('admin-login-signed', 'POST', '/api/admin/login', { signed: true, body: { account: 'admin', password: 'admin' } });
adminToken = adminLogin?.data?.token || '';

const volunteerLogin = await request('volunteer-login', 'POST', '/api/volunteer/login', { body: { account: 'admin', password: 'admin' } });
volunteerToken = volunteerLogin?.data?.token || '';

const familyLogin = await request('family-login', 'POST', '/api/family/login', { body: { phone: '[REDACTED_PHONE]', password: 'admin' } });
familyToken = familyLogin?.data?.token || '';

await request('admin-dashboard-unauthorized-denied', 'GET', '/api/admin/dashboard', { expectHttp: 403 });

const dashboard = await request('admin-dashboard', 'GET', '/api/admin/dashboard', { token: adminToken, signed: true });
const elders = await request('admin-elders', 'GET', '/api/admin/elders', { token: adminToken, signed: true });
const elderRows = Array.isArray(elders?.data) ? elders.data : [];
firstElderId = elderRows[0]?.id || elderRows[0]?.elderId || '';
secondElderId = elderRows.find((row) => (row.id || row.elderId) && (row.id || row.elderId) !== firstElderId)?.id || '';

await request('admin-volunteers', 'GET', '/api/admin/volunteers', { token: adminToken, signed: true });
await request('admin-family-bindings', 'GET', '/api/admin/family-bindings', { token: adminToken, signed: true });
await request('admin-invitations', 'GET', '/api/admin/invitations', { token: adminToken, signed: true });
await request('admin-audit-logs', 'GET', '/api/admin/audit-logs', { token: adminToken, signed: true });
await request('admin-review-requests', 'GET', '/api/admin/review-requests', { token: adminToken, signed: true });
await request('admin-sms-relay-records', 'GET', '/api/sms-relay/admin/records', { token: adminToken, signed: true });
await request('admin-sms-relay-devices', 'GET', '/api/sms-relay/admin/devices', { token: adminToken, signed: true });
await request('admin-sms-relay-sessions', 'GET', '/api/sms-relay/admin/sessions', { token: adminToken, signed: true });
await request('rbac-roles', 'GET', '/api/rbac/roles', { token: adminToken });
await request('rbac-permissions', 'GET', '/api/rbac/permissions', { token: adminToken });
if (firstElderId) {
  await request('admin-medications-by-elder', 'GET', `/api/admin/medications?elderId=${encodeURIComponent(firstElderId)}`, { token: adminToken, signed: true });
  await request('admin-scales-by-elder', 'GET', `/api/admin/scales?elderId=${encodeURIComponent(firstElderId)}`, { token: adminToken, signed: true });
}

const qrcodes = await request('admin-qrcodes', 'GET', '/api/admin/qrcodes', { token: adminToken, signed: true });
const qrRows = Array.isArray(qrcodes?.data) ? qrcodes.data : [];
const qr = qrRows.find((row) => row.token || row.scanUrl || row.qrUrl) || qrRows[0] || null;
firstQrToken = qr?.token || (qr?.scanUrl || qr?.qrUrl || '').match(/[?&]token=([^&#]+)/)?.[1] || '';
if (firstQrToken) {
  const resolved = await request('scan-resolve-token', 'POST', '/api/scan/resolve', { body: { token: firstQrToken } });
  const resolvedElderId = resolved?.data?.elderId || resolved?.data?.id || '';
  if (resolvedElderId) firstElderId = resolvedElderId;
}

if (firstElderId) {
  const verify = await request('scan-identity-verify', 'POST', '/api/scan/verification/identity', {
    body: { elderId: firstElderId, target: 'health', name: '孙一洋', phone: '[REDACTED_VISITOR_PHONE]', idCard: '[REDACTED_ID_CARD]' },
  });
  firstSessionId = verify?.data?.sessionId || '';
  if (firstSessionId) {
    await request('scan-basic-info-verified', 'GET', `/api/scan/basic-info?elderId=${encodeURIComponent(firstElderId)}&sessionId=${encodeURIComponent(firstSessionId)}`);
    await request('scan-archive-verified', 'GET', `/api/scan/archive?elderId=${encodeURIComponent(firstElderId)}&sessionId=${encodeURIComponent(firstSessionId)}`);
    await request('scan-medications-verified', 'GET', `/api/scan/medications?elderId=${encodeURIComponent(firstElderId)}&sessionId=${encodeURIComponent(firstSessionId)}`);
    await request('scan-scales-verified', 'GET', `/api/scan/scales?elderId=${encodeURIComponent(firstElderId)}&sessionId=${encodeURIComponent(firstSessionId)}`);
    await request('scan-session-cross-elder-denied', 'GET', `/api/scan/basic-info?elderId=${encodeURIComponent(secondElderId || 'not-current-elder')}&sessionId=${encodeURIComponent(firstSessionId)}`, { expectHttp: 403 });
  }
}

await request('invitation-preview', 'GET', '/api/invitations/INVITE001/preview');
await request('volunteer-profile', 'GET', '/api/volunteer/me/profile', { token: volunteerToken });
await request('volunteer-my-elders', 'GET', '/api/volunteer/me/elders', { token: volunteerToken });
if (firstElderId) {
  await request('volunteer-qr-manage', 'GET', `/api/volunteer/me/elders/${encodeURIComponent(firstElderId)}/qr-manage`, { token: volunteerToken });
}
await request('family-my-elders', 'GET', '/api/family/me/elders', { token: familyToken });
if (firstElderId) {
  await request('family-elder-detail', 'GET', `/api/family/elders/${encodeURIComponent(firstElderId)}`, { token: familyToken });
  await request('family-medications', 'GET', `/api/family/elders/${encodeURIComponent(firstElderId)}/medications`, { token: familyToken });
  await request('family-qrcode', 'GET', `/api/family/elders/${encodeURIComponent(firstElderId)}/qrcode`, { token: familyToken });
}

const summary = {
  generatedAt: new Date().toISOString(),
  base,
  total: results.length,
  passed: results.filter((r) => r.pass).length,
  failed: results.filter((r) => !r.pass).length,
  firstElderId,
  secondElderId,
  firstSessionId,
  results,
};
fs.writeFileSync(`${reportDir}/functional/live-smoke-results.json`, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
