import crypto from 'node:crypto';
import fs from 'node:fs';

const base = 'http://sxyq27.online/silverlink-api';
const reportDir = process.env.REPORT_DIR;
const secret = 'demo-admin-signature-secret';
const results = [];
let adminToken = '';
let volunteerToken = '';
let familyToken = '';
let qrResolvedElderId = '';
let qrToken = '';
let sessionId = '';
let volunteerElderId = '';
let familyElderId = '';

function signHeaders(method, path) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomUUID();
  const requestPath = path.split('?')[0] || path;
  const canonical = `${method.toUpperCase()}\n${requestPath}\n${timestamp}\n${nonce}`;
  const signature = crypto.createHmac('sha256', secret).update(canonical).digest('hex');
  return { 'X-Timestamp': timestamp, 'X-Nonce': nonce, 'X-Signature': signature };
}

function tokenFromQr(row) {
  const direct = row?.token || row?.encryptedToken || '';
  if (direct) return direct;
  const url = row?.url || row?.scanUrl || row?.qrUrl || row?.link || '';
  return url.match(/[?&]token=([^&#]+)/)?.[1] || '';
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
  let parsed = null;
  let text = '';
  let error = null;
  let status = 0;
  try {
    const response = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    status = response.status;
    text = await response.text();
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { raw: text.slice(0, 500) }; }
    if (status !== expectHttp) error = `HTTP ${status}, expected ${expectHttp}`;
    else if (parsed && typeof parsed.code === 'number' && parsed.code >= 400 && expectHttp < 400) error = `API code ${parsed.code}: ${parsed.message || ''}`;
  } catch (ex) {
    error = ex instanceof Error ? ex.message : String(ex);
  }
  const item = { name, method, path, status, durationMs: Date.now() - started, pass: !error, error, apiCode: parsed?.code, message: parsed?.message, dataPreview: previewData(parsed?.data) };
  results.push(item);
  fs.writeFileSync(`${reportDir}/logs/live-smoke-v2-${results.length}-${name.replace(/[^a-zA-Z0-9_-]+/g, '-')}.json`, JSON.stringify({ item, raw: parsed ?? text }, null, 2));
  return parsed;
}

const adminLogin = await request('admin-login-signed', 'POST', '/api/admin/login', { signed: true, body: { account: 'admin', password: 'admin' } });
adminToken = adminLogin?.data?.token || '';
const volunteerLogin = await request('volunteer-login', 'POST', '/api/volunteer/login', { body: { account: 'admin', password: 'admin' } });
volunteerToken = volunteerLogin?.data?.token || '';
const familyLogin = await request('family-login', 'POST', '/api/family/login', { body: { phone: '[REDACTED_PHONE]', password: 'admin' } });
familyToken = familyLogin?.data?.token || '';

await request('admin-dashboard-unauthorized-denied', 'GET', '/api/admin/dashboard', { expectHttp: 403 });
await request('admin-dashboard', 'GET', '/api/admin/dashboard', { token: adminToken, signed: true });
await request('admin-elders', 'GET', '/api/admin/elders', { token: adminToken, signed: true });
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

const qrcodes = await request('admin-qrcodes', 'GET', '/api/admin/qrcodes', { token: adminToken, signed: true });
const qrRows = Array.isArray(qrcodes?.data) ? qrcodes.data : [];
const qr = qrRows.find((row) => String(row.status).toUpperCase() === 'ENABLED' && tokenFromQr(row)) || qrRows.find(tokenFromQr) || null;
qrToken = tokenFromQr(qr);
if (qrToken) {
  const resolved = await request('scan-resolve-token', 'POST', '/api/scan/resolve', { body: { token: qrToken } });
  qrResolvedElderId = resolved?.data?.elderId || resolved?.data?.id || qr?.elderId || '';
}

if (qrResolvedElderId) {
  const verify = await request('scan-identity-verify', 'POST', '/api/scan/verification/identity', { body: { elderId: qrResolvedElderId, target: 'health', name: '孙一洋', phone: '[REDACTED_VISITOR_PHONE]', idCard: '[REDACTED_ID_CARD]' } });
  sessionId = verify?.data?.sessionId || '';
  if (sessionId) {
    const basic = await request('scan-basic-info-verified-same-elder', 'GET', `/api/scan/basic-info?elderId=${encodeURIComponent(qrResolvedElderId)}&sessionId=${encodeURIComponent(sessionId)}`);
    const sameElder = (basic?.data?.id || basic?.data?.elderId || '') === qrResolvedElderId;
    results.push({ name: 'scan-resolve-verify-basic-elder-consistency', method: 'ASSERT', path: qrResolvedElderId, status: sameElder ? 200 : 500, durationMs: 0, pass: sameElder, error: sameElder ? null : `basic-info elder mismatch: expected ${qrResolvedElderId}, got ${basic?.data?.id || basic?.data?.elderId || ''}` });
    await request('scan-archive-verified', 'GET', `/api/scan/archive?elderId=${encodeURIComponent(qrResolvedElderId)}&sessionId=${encodeURIComponent(sessionId)}`);
    await request('scan-medications-verified', 'GET', `/api/scan/medications?elderId=${encodeURIComponent(qrResolvedElderId)}&sessionId=${encodeURIComponent(sessionId)}`);
    await request('scan-scales-verified', 'GET', `/api/scan/scales?elderId=${encodeURIComponent(qrResolvedElderId)}&sessionId=${encodeURIComponent(sessionId)}`);
    await request('scan-session-cross-elder-denied', 'GET', `/api/scan/basic-info?elderId=not-current-elder&sessionId=${encodeURIComponent(sessionId)}`, { expectHttp: 403 });
  }
}

await request('invitation-preview', 'GET', '/api/invitations/INVITE001/preview');
const volunteerProfile = await request('volunteer-profile', 'GET', '/api/volunteer/me/profile', { token: volunteerToken });
const volunteerElders = await request('volunteer-my-elders', 'GET', '/api/volunteer/me/elders', { token: volunteerToken });
volunteerElderId = Array.isArray(volunteerElders?.data) ? (volunteerElders.data[0]?.id || volunteerElders.data[0]?.elderId || '') : '';
if (volunteerElderId) await request('volunteer-qr-manage-own-elder', 'GET', `/api/volunteer/me/elders/${encodeURIComponent(volunteerElderId)}/qr-manage`, { token: volunteerToken });

const familyElders = await request('family-my-elders', 'GET', '/api/family/me/elders', { token: familyToken });
familyElderId = Array.isArray(familyElders?.data) ? (familyElders.data[0]?.id || familyElders.data[0]?.elderId || '') : '';
if (familyElderId) {
  await request('family-elder-detail-own-elder', 'GET', `/api/family/elders/${encodeURIComponent(familyElderId)}`, { token: familyToken });
  await request('family-medications-own-elder', 'GET', `/api/family/elders/${encodeURIComponent(familyElderId)}/medications`, { token: familyToken });
  await request('family-qrcode-own-elder', 'GET', `/api/family/elders/${encodeURIComponent(familyElderId)}/qrcode`, { token: familyToken });
}

const summary = { generatedAt: new Date().toISOString(), base, total: results.length, passed: results.filter((r) => r.pass).length, failed: results.filter((r) => !r.pass).length, qrResolvedElderId, sessionId, volunteerElderId, familyElderId, results };
fs.writeFileSync(`${reportDir}/functional/live-smoke-results-v2.json`, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
