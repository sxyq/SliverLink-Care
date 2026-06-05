#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

export const rootDir = process.cwd();
export const webBaseUrl = (process.env.SILVERLINK_WEB_BASE_URL || 'http://sxyq27.online').replace(/\/$/, '');
export const apiBaseUrl = (process.env.SILVERLINK_API_BASE_URL || `${webBaseUrl}/silverlink-api`).replace(/\/$/, '');
export const adminAccount = process.env.SILVERLINK_ADMIN_ACCOUNT || 'admin';
export const adminPassword = process.env.SILVERLINK_ADMIN_PASSWORD || 'admin';
export const adminSignatureSecret = process.env.SILVERLINK_ADMIN_SIGNATURE_SECRET || 'demo-admin-signature-secret';
export const volunteerAccount = process.env.SILVERLINK_VOLUNTEER_ACCOUNT || 'admin';
export const volunteerPassword = process.env.SILVERLINK_VOLUNTEER_PASSWORD || 'admin';
export const familyPhone = process.env.SILVERLINK_FAMILY_PHONE || 'admin';
export const familyPassword = process.env.SILVERLINK_FAMILY_PASSWORD || 'admin';

export function isoFileTs(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

export function signedHeaders(method, requestPath, { timestamp, nonce, secret = adminSignatureSecret } = {}) {
  const ts = timestamp ?? String(Math.floor(Date.now() / 1000));
  const requestNonce = nonce ?? `nonce-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const canonical = `${method.toUpperCase()}\n${requestPath}\n${ts}\n${requestNonce}`;
  const signature = crypto.createHmac('sha256', secret).update(canonical).digest('hex');
  return {
    'X-Timestamp': ts,
    'X-Nonce': requestNonce,
    'X-Signature': signature,
  };
}

export async function requestJson(urlPath, options = {}) {
  const startedAt = performance.now();
  const response = await fetch(`${apiBaseUrl}${urlPath}`, options);
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return {
    ok: response.ok,
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    durationMs: Math.round(performance.now() - startedAt),
    text,
    json,
  };
}

export async function loginAdmin() {
  const urlPath = '/api/admin/login';
  const headers = {
    'Content-Type': 'application/json',
    ...signedHeaders('POST', urlPath),
  };
  const result = await requestJson(urlPath, {
    method: 'POST',
    headers,
    body: JSON.stringify({ account: adminAccount, password: adminPassword }),
  });
  const token = result.json?.data?.token ?? '';
  if (!result.ok || !token) {
    throw new Error(`admin login failed: HTTP ${result.status} ${result.text}`);
  }
  return { token, role: result.json?.data?.role ?? '', loginResult: result };
}

export async function loginVolunteer() {
  const result = await requestJson('/api/volunteer/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account: volunteerAccount, password: volunteerPassword }),
  });
  const token = result.json?.data?.token ?? '';
  if (!result.ok || !token) {
    throw new Error(`volunteer login failed: HTTP ${result.status} ${result.text}`);
  }
  return { token, loginResult: result };
}

export async function loginFamily() {
  const result = await requestJson('/api/family/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: familyPhone, password: familyPassword }),
  });
  const token = result.json?.data?.token ?? '';
  if (!result.ok || !token) {
    throw new Error(`family login failed: HTTP ${result.status} ${result.text}`);
  }
  return { token, loginResult: result };
}

export async function ensureDir(relativeDir) {
  const dir = path.join(rootDir, relativeDir);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function writeJsonReport(relativeDir, prefix, payload) {
  const dir = await ensureDir(relativeDir);
  const filePath = path.join(dir, `${isoFileTs()}-${prefix}.json`);
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return filePath;
}
