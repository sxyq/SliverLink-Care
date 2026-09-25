#!/usr/bin/env node

import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '../../..');
const outputDir = path.join(rootDir, '06-测试与质量保障/reports/functional/sms-relay-production');
const currentJsonPath = path.join(outputDir, 'current.json');
const currentNdjsonPath = path.join(outputDir, 'current.ndjson');

const args = new Set(process.argv.slice(2));
const once = args.has('--once');
const selfTest = args.has('--self-test');
const showHelp = args.has('--help') || args.has('-h');
const apiBaseUrl = (process.env.SILVERLINK_API_BASE_URL || 'https://sxyq27.online/silverlink-api').replace(/\/$/, '');
const adbSerial = process.env.SILVERLINK_ADB_SERIAL || 'd715a3a4';
const adbBin = process.env.SILVERLINK_ADB_BIN || 'adb';
const intervalMs = positiveInteger(process.env.SILVERLINK_MONITOR_INTERVAL_MS, 3000);
const timeoutMs = positiveInteger(process.env.SILVERLINK_MONITOR_TIMEOUT_MS, 8000);
const maxEvents = positiveInteger(process.env.SILVERLINK_MONITOR_MAX_EVENTS, 1000);
const packageName = 'com.silverlink.smsrelay';
const serviceName = `${packageName}/.service.RelayForegroundService`;
const logTags = ['SmsRelayHeartbeat', 'SmsRelayApi', 'SmsRelayInboxSync'];

const endpoints = [
  { name: 'devices', path: '/api/sms-relay/admin/devices' },
  { name: 'summary', path: '/api/sms-relay/admin/summary' },
  { name: 'records', path: '/api/sms-relay/admin/records/page?limit=50' },
  { name: 'sessions', path: '/api/sms-relay/admin/sessions/page?limit=50' },
  { name: 'enrollmentRequests', path: '/api/sms-relay/admin/enrollment-requests' },
];

let stopping = false;
let stopReason = once ? 'once' : 'running';

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function maskIdentifier(value) {
  const text = String(value ?? '');
  if (!text) return '';
  if (text.length <= 4) return '*'.repeat(text.length);
  if (text.length <= 10) return `${text.slice(0, 2)}***${text.slice(-2)}`;
  return `${text.slice(0, 4)}***${text.slice(-4)}`;
}

function maskPhone(value) {
  const text = String(value ?? '');
  const digits = text.replace(/\D/g, '');
  if (digits.length < 7) return text ? '<redacted-phone>' : '';
  return `***${digits.slice(-4)}`;
}

function redactText(value) {
  return String(value ?? '')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer <redacted>')
    .replace(/\b(token|secret|password|cookie|authorization|signature)\s*[:=]\s*[^\s,;]+/gi, '$1=<redacted>')
    .replace(/\b(device(?:Id)?|sessionId|requestId|recordId)\s*=\s*([A-Za-z0-9._:-]{5,})/gi,
      (_, label, id) => `${label}=${maskIdentifier(id)}`)
    .replace(/(?<!\d)1\d{10}(?!\d)/g, (phone) => maskPhone(phone));
}

function redact(value, key = '') {
  const normalizedKey = key.toLowerCase();
  if (/secret|password|token|cookie|authorization|signature/.test(normalizedKey)) {
    return '<redacted>';
  }
  if (/messagebody|smsbody|verificationcode/.test(normalizedKey)) {
    const length = String(value ?? '').length;
    return length ? `<redacted-message length=${length}>` : '';
  }
  if (/devicename|reviewreason/.test(normalizedKey)) {
    return value ? '<redacted-text>' : '';
  }
  if (/phone|mobile/.test(normalizedKey)) {
    return maskPhone(value);
  }
  if (/^(id|deviceid|relaydeviceid|sessionid|requestid|elderid|clientrecordid)$/.test(normalizedKey)) {
    return maskIdentifier(value);
  }
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, redact(childValue, childKey)]));
  }
  if (typeof value === 'string') return redactText(value);
  return value;
}

function normalizeCookie(rawValue) {
  const value = String(rawValue || '').trim().replace(/^Cookie:\s*/i, '');
  if (!value) return '';
  return value.includes('=') ? value : `sl_admin_session=${value}`;
}

function extractAdminCookie(headers) {
  const values = typeof headers.getSetCookie === 'function'
    ? headers.getSetCookie()
    : [headers.get('set-cookie') || ''];
  for (const value of values) {
    const match = value.match(/(?:^|,\s*)(sl_admin_session=[^;,\s]+)/i);
    if (match) return match[1];
  }
  return '';
}

async function fetchJson(urlPath, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetch(`${apiBaseUrl}${urlPath}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    });
    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    return {
      ok: response.ok && (!body || Number(body.code || 200) < 400),
      status: response.status,
      durationMs: Date.now() - startedAt,
      body,
      responseHeaders: response.headers,
      parseError: Boolean(text && body === null),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: Date.now() - startedAt,
      error: redactText(error instanceof Error ? error.message : String(error)),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function resolveAdminCookie() {
  const supplied = normalizeCookie(
    process.env.SILVERLINK_ADMIN_SESSION_COOKIE || process.env.SILVERLINK_ADMIN_COOKIE,
  );
  if (supplied) return { cookie: supplied, source: 'environment-session' };

  const account = String(process.env.SILVERLINK_ADMIN_ACCOUNT || '').trim();
  const password = String(process.env.SILVERLINK_ADMIN_PASSWORD || '');
  if (!account || !password) {
    return {
      cookie: '',
      source: 'missing',
      error: '缺少管理员会话 Cookie，或未同时提供管理员账号和密码',
    };
  }

  const result = await fetchJson('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account, password }),
  });
  if (!result.ok) {
    return {
      cookie: '',
      source: 'login-failed',
      error: `管理员登录失败：HTTP ${result.status || 0}`,
    };
  }
  const cookie = extractAdminCookie(result.responseHeaders);
  if (!cookie) {
    return { cookie: '', source: 'login-failed', error: '管理员登录成功，但响应未包含管理员会话 Cookie' };
  }
  return { cookie, source: 'environment-credentials' };
}

async function collectApi(cookieState) {
  const result = {};
  if (!cookieState.cookie) {
    for (const endpoint of endpoints) {
      result[endpoint.name] = { ok: false, skipped: true, error: cookieState.error };
    }
    return result;
  }

  const responses = await Promise.all(endpoints.map(async (endpoint) => {
    const response = await fetchJson(endpoint.path, {
      method: 'GET',
      headers: { Cookie: cookieState.cookie },
    });
    if (!response.ok) {
      const apiMessage = response.body && typeof response.body.message === 'string'
        ? redactText(response.body.message)
        : '';
      return [endpoint.name, {
        ok: false,
        status: response.status,
        durationMs: response.durationMs,
        error: apiMessage || response.error || (response.parseError ? '响应不是 JSON' : `HTTP ${response.status}`),
      }];
    }
    return [endpoint.name, {
      ok: true,
      status: response.status,
      durationMs: response.durationMs,
      data: redact(response.body?.data ?? response.body),
    }];
  }));
  return Object.fromEntries(responses);
}

async function runAdb(commandArgs, options = {}) {
  try {
    const result = await execFileAsync(adbBin, commandArgs, {
      encoding: 'utf8',
      timeout: options.timeout ?? timeoutMs,
      maxBuffer: options.maxBuffer ?? 2 * 1024 * 1024,
    });
    return { ok: true, stdout: result.stdout || '', stderr: result.stderr || '' };
  } catch (error) {
    return {
      ok: false,
      stdout: error?.stdout || '',
      stderr: error?.stderr || '',
      error: redactText(error instanceof Error ? error.message : String(error)),
    };
  }
}

function parseConnectedDevice(devicesOutput) {
  const line = devicesOutput.split(/\r?\n/).find((item) => item.trim().split(/\s+/, 1)[0] === adbSerial);
  if (!line) return { connected: false, state: 'missing' };
  const state = line.split(/\s+/)[1] || 'unknown';
  const model = line.match(/\bmodel:([^\s]+)/)?.[1] || '';
  return { connected: state === 'device', state, model: redactText(model) };
}

function sanitizeLogLine(line) {
  const tagMatch = logTags.find((tag) => line.includes(tag));
  if (!tagMatch) return '';
  return redactText(line.trim());
}

async function collectAdb() {
  const devices = await runAdb(['devices', '-l']);
  if (!devices.ok) {
    return { ok: false, serial: maskIdentifier(adbSerial), connected: false, error: devices.error };
  }
  const connection = parseConnectedDevice(devices.stdout);
  if (!connection.connected) {
    return { ok: false, serial: maskIdentifier(adbSerial), ...connection, error: `ADB 设备不可用：${connection.state}` };
  }

  const pidResult = await runAdb(['-s', adbSerial, 'shell', 'pidof', packageName]);
  const pid = pidResult.ok ? pidResult.stdout.trim().split(/\s+/)[0] : '';
  const serviceResult = await runAdb([
    '-s', adbSerial, 'shell', 'dumpsys', 'activity', 'services', serviceName,
  ]);
  const serviceText = serviceResult.stdout || '';
  const serviceRunning = serviceResult.ok && serviceText.includes('ServiceRecord') && serviceText.includes('RelayForegroundService');
  const serviceForeground = serviceRunning && /\bisForeground=true\b/.test(serviceText);
  const startRequested = serviceRunning && /\bstartRequested=true\b/.test(serviceText);

  let logs = [];
  let logError = '';
  if (pid) {
    const logResult = await runAdb([
      '-s', adbSerial, 'logcat', '-d', '-v', 'epoch', '-t', '1200', '--pid', pid,
    ], { maxBuffer: 4 * 1024 * 1024 });
    if (logResult.ok) {
      logs = logResult.stdout.split(/\r?\n/).map(sanitizeLogLine).filter(Boolean).slice(-200);
    } else {
      logError = logResult.error;
    }
  }

  return {
    ok: connection.connected && Boolean(pid) && serviceResult.ok && serviceRunning && serviceForeground,
    serial: maskIdentifier(adbSerial),
    connected: connection.connected,
    state: connection.state,
    model: connection.model,
    appProcessRunning: Boolean(pid),
    foregroundService: {
      running: serviceRunning,
      foreground: serviceForeground,
      startRequested,
    },
    logs,
    ...(pidResult.ok ? {} : { processError: pidResult.error }),
    ...(serviceResult.ok ? {} : { serviceError: serviceResult.error }),
    ...(!pid ? { appError: 'APP 进程未运行' } : {}),
    ...(serviceResult.ok && !serviceRunning ? { serviceError: '短信中转前台服务未运行' } : {}),
    ...(serviceRunning && !serviceForeground ? { serviceError: '短信中转服务未处于前台状态' } : {}),
    ...(logError ? { logError } : {}),
  };
}

function comparableSnapshot(snapshot) {
  const api = Object.fromEntries(Object.entries(snapshot.api).map(([name, value]) => [name, {
    ok: value.ok,
    status: value.status,
    skipped: value.skipped,
    error: value.error,
    data: value.data,
  }]));
  return JSON.stringify({ api, adb: snapshot.adb });
}

function errorList(snapshot) {
  const errors = [];
  for (const [name, result] of Object.entries(snapshot.api)) {
    if (!result.ok) errors.push(`api.${name}: ${result.error || `HTTP ${result.status || 0}`}`);
  }
  if (!snapshot.adb.ok) errors.push(`adb: ${snapshot.adb.error || snapshot.adb.serviceError || '未知错误'}`);
  if (snapshot.adb.appError) errors.push(`adb.app: ${snapshot.adb.appError}`);
  if (snapshot.adb.processError) errors.push(`adb.process: ${snapshot.adb.processError}`);
  if (snapshot.adb.logError) errors.push(`adb.logs: ${snapshot.adb.logError}`);
  return errors.map(redactText);
}

function endpointCount(result) {
  if (!result?.ok) return '-';
  const data = result.data;
  if (Array.isArray(data)) return String(data.length);
  if (Array.isArray(data?.items)) return String(data.items.length);
  return 'ok';
}

function printChange(snapshot, changedSources, errors) {
  const apiSummary = endpoints
    .map(({ name }) => `${name}=${endpointCount(snapshot.api[name])}`)
    .join(' ');
  const service = snapshot.adb.foregroundService || {};
  console.log([
    `[${snapshot.observedAt}] 状态变化: ${changedSources.join(', ') || 'initial'}`,
    `API ${apiSummary}`,
    `ADB connected=${Boolean(snapshot.adb.connected)} process=${Boolean(snapshot.adb.appProcessRunning)}`
      + ` service=${Boolean(service.running)} foreground=${Boolean(service.foreground)}`,
    ...(errors.length ? [`错误: ${errors.join(' | ')}`] : []),
  ].join('\n'));
}

function changedSourceNames(previous, current) {
  if (!previous) return ['initial'];
  const changed = [];
  for (const { name } of endpoints) {
    const before = JSON.stringify(comparableApiValue(previous.api[name]));
    const after = JSON.stringify(comparableApiValue(current.api[name]));
    if (before !== after) changed.push(`api.${name}`);
  }
  if (JSON.stringify(previous.adb) !== JSON.stringify(current.adb)) changed.push('adb');
  return changed;
}

function comparableApiValue(value) {
  return {
    ok: value?.ok,
    status: value?.status,
    skipped: value?.skipped,
    error: value?.error,
    data: value?.data,
  };
}

async function writeState(runtime, latestSnapshot) {
  const report = {
    title: 'SilverLink Care 生产短信中转三轮实测实时监测',
    mode: 'read-only',
    apiBaseUrl,
    adbSerial: maskIdentifier(adbSerial),
    startedAt: runtime.startedAt,
    updatedAt: new Date().toISOString(),
    stoppedAt: runtime.stoppedAt || null,
    stopReason: runtime.stopReason,
    pollCount: runtime.pollCount,
    changeCount: runtime.changeCount,
    errorObservations: runtime.errorObservations,
    authSource: runtime.authSource,
    latest: latestSnapshot,
    summary: runtime.summary || null,
  };
  const ndjson = runtime.events.map((event) => JSON.stringify(event)).join('\n');
  await fs.mkdir(outputDir, { recursive: true });
  await Promise.all([
    fs.writeFile(currentJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8'),
    fs.writeFile(currentNdjsonPath, ndjson ? `${ndjson}\n` : '', 'utf8'),
  ]);
}

function addEvent(runtime, event) {
  runtime.events.push(redact(event));
  if (runtime.events.length > maxEvents) {
    runtime.events.splice(0, runtime.events.length - maxEvents);
  }
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function printHelp() {
  console.log(`用法: node 06-测试与质量保障/scripts/functional/real_production_sms_revoke_monitor.mjs [--once|--self-test]

认证环境变量（二选一）:
  SILVERLINK_ADMIN_SESSION_COOKIE   已有 sl_admin_session Cookie，可传完整键值或只传值
  SILVERLINK_ADMIN_ACCOUNT          管理员账号，需与 SILVERLINK_ADMIN_PASSWORD 同时提供
  SILVERLINK_ADMIN_PASSWORD         管理员密码

可选环境变量:
  SILVERLINK_API_BASE_URL           默认 ${apiBaseUrl}
  SILVERLINK_ADB_SERIAL             默认 ${adbSerial}
  SILVERLINK_ADB_BIN                默认 adb
  SILVERLINK_MONITOR_INTERVAL_MS    默认 3000
  SILVERLINK_MONITOR_TIMEOUT_MS     默认 8000
  SILVERLINK_MONITOR_MAX_EVENTS     默认 1000

输出:
  ${currentJsonPath}
  ${currentNdjsonPath}`);
}

async function runSelfTest() {
  const sample = redact({
    deviceId: 'device-production-12345678',
    receiverPhone: '13800138000',
    sessionId: 'session-production-87654321',
    messageBody: '验证码 123456',
    deviceSecret: 'must-not-appear',
    nested: { authorization: 'Bearer abc.def.ghi' },
  });
  const encoded = JSON.stringify(sample);
  const failures = [
    encoded.includes('13800138000'),
    encoded.includes('123456'),
    encoded.includes('must-not-appear'),
    encoded.includes('abc.def.ghi'),
    sample.deviceId === 'device-production-12345678',
    sample.sessionId === 'session-production-87654321',
  ].filter(Boolean).length;
  console.log(JSON.stringify({ selfTest: failures === 0 ? 'passed' : 'failed', sample }, null, 2));
  process.exitCode = failures === 0 ? 0 : 1;
}

async function main() {
  if (showHelp) {
    printHelp();
    return;
  }
  if (selfTest) {
    await runSelfTest();
    return;
  }

  await fs.mkdir(outputDir, { recursive: true });
  const runtime = {
    startedAt: new Date().toISOString(),
    stoppedAt: null,
    stopReason,
    pollCount: 0,
    changeCount: 0,
    errorObservations: 0,
    authSource: 'resolving',
    events: [],
    summary: null,
  };
  const cookieState = await resolveAdminCookie();
  runtime.authSource = cookieState.source;
  addEvent(runtime, { type: 'start', at: runtime.startedAt, authSource: runtime.authSource });

  let previousSnapshot = null;
  let previousComparable = '';
  let latestSnapshot = null;

  while (!stopping) {
    const observedAt = new Date().toISOString();
    const [api, adb] = await Promise.all([collectApi(cookieState), collectAdb()]);
    const snapshot = { observedAt, api, adb };
    const comparable = comparableSnapshot(snapshot);
    const errors = errorList(snapshot);
    const changed = comparable !== previousComparable;
    runtime.pollCount += 1;
    if (errors.length) runtime.errorObservations += 1;

    if (changed) {
      const changedSources = changedSourceNames(previousSnapshot, snapshot);
      runtime.changeCount += 1;
      addEvent(runtime, {
        type: errors.length ? 'change-with-errors' : 'change',
        at: observedAt,
        changedSources,
        errors,
        snapshot,
      });
      printChange(snapshot, changedSources, errors);
    }

    latestSnapshot = snapshot;
    previousSnapshot = snapshot;
    previousComparable = comparable;
    await writeState(runtime, latestSnapshot);

    if (once) break;
    await sleep(intervalMs);
  }

  runtime.stoppedAt = new Date().toISOString();
  runtime.stopReason = once ? 'once' : stopReason;
  runtime.summary = {
    durationMs: Date.parse(runtime.stoppedAt) - Date.parse(runtime.startedAt),
    pollCount: runtime.pollCount,
    changeCount: runtime.changeCount,
    errorObservations: runtime.errorObservations,
    finalErrors: latestSnapshot ? errorList(latestSnapshot) : ['未完成首次轮询'],
  };
  addEvent(runtime, { type: 'stop', at: runtime.stoppedAt, reason: runtime.stopReason, summary: runtime.summary });
  await writeState(runtime, latestSnapshot);
  console.log(JSON.stringify({
    stopped: true,
    reason: runtime.stopReason,
    currentJsonPath,
    currentNdjsonPath,
    summary: runtime.summary,
  }, null, 2));
  if (once && runtime.summary.finalErrors.length) process.exitCode = 1;
}

process.on('SIGINT', () => {
  stopping = true;
  stopReason = 'SIGINT';
});
process.on('SIGTERM', () => {
  stopping = true;
  stopReason = 'SIGTERM';
});

main().catch(async (error) => {
  const message = redactText(error instanceof Error ? error.message : String(error));
  console.error(`监测器停止：${message}`);
  try {
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(currentJsonPath, `${JSON.stringify({
      title: 'SilverLink Care 生产短信中转三轮实测实时监测',
      mode: 'read-only',
      updatedAt: new Date().toISOString(),
      fatalError: message,
    }, null, 2)}\n`, 'utf8');
  } catch {
    // The original error remains the useful failure signal.
  }
  process.exitCode = 1;
});
