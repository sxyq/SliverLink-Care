import crypto from 'node:crypto';
import fs from 'node:fs';
const reportDir = process.env.REPORT_DIR;
const apiBase = 'http://sxyq27.online/silverlink-api';
const staticUrls = [
  'http://sxyq27.online/silverlink/scan/',
  'http://sxyq27.online/silverlink/volunteer/',
  'http://sxyq27.online/silverlink/admin/',
];
const secret = 'demo-admin-signature-secret';
function signHeaders(method, path) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomUUID();
  const canonical = `${method}\n${path.split('?')[0]}\n${timestamp}\n${nonce}`;
  return {
    'X-Timestamp': timestamp,
    'X-Nonce': nonce,
    'X-Signature': crypto.createHmac('sha256', secret).update(canonical).digest('hex'),
  };
}
async function timedFetch(url, opts = {}) {
  const started = Date.now();
  const response = await fetch(url, opts);
  const text = await response.text();
  return { status: response.status, durationMs: Date.now() - started, bytes: Buffer.byteLength(text), text };
}
async function requestApi(path, { method = 'GET', body, token, signed = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (signed) Object.assign(headers, signHeaders(method, path));
  const result = await timedFetch(`${apiBase}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json = null;
  try { json = JSON.parse(result.text); } catch {}
  return { ...result, json };
}
function stat(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  const pct = (p) => sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)];
  return { count: samples.length, minMs: sorted[0], avgMs: Math.round(avg), p50Ms: pct(0.5), p95Ms: pct(0.95), maxMs: sorted.at(-1) };
}
const staticResults = [];
for (const url of staticUrls) {
  const samples = [];
  let status = 0;
  let bytes = 0;
  for (let i = 0; i < 5; i++) {
    const result = await timedFetch(url);
    status = result.status;
    bytes = result.bytes;
    samples.push(result.durationMs);
  }
  staticResults.push({ url, status, bytes, ...stat(samples), pass: status === 200 });
}
const login = await requestApi('/api/admin/login', { method: 'POST', signed: true, body: { account: 'admin', password: 'admin' } });
const token = login.json?.data?.token;
const apiPaths = [
  { name: 'admin-dashboard', path: '/api/admin/dashboard', signed: true },
  { name: 'admin-elders', path: '/api/admin/elders', signed: true },
  { name: 'admin-qrcodes', path: '/api/admin/qrcodes', signed: true },
  { name: 'invitation-preview', path: '/api/invitations/INVITE001/preview', signed: false, token: '' },
];
const apiResults = [];
for (const item of apiPaths) {
  const samples = [];
  let status = 0;
  let code = null;
  for (let i = 0; i < 10; i++) {
    const result = await requestApi(item.path, { token: item.token === '' ? undefined : token, signed: item.signed });
    status = result.status;
    code = result.json?.code ?? null;
    samples.push(result.durationMs);
  }
  apiResults.push({ name: item.name, path: item.path, status, apiCode: code, ...stat(samples), pass: status === 200 && (code === 200 || code === null) });
}
const summary = {
  generatedAt: new Date().toISOString(),
  staticResults,
  apiResults,
  pass: staticResults.every((x) => x.pass) && apiResults.every((x) => x.pass),
};
fs.writeFileSync(`${reportDir}/performance/live-latency-summary.json`, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
