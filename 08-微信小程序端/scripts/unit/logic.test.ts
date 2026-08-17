import assert from 'node:assert/strict';

import Taro from '@tarojs/taro';
import { APP_ROUTES, ERROR_MESSAGES, ROLE_TYPES, STORAGE_KEYS } from '@/app/app.constants';
import { createLaunchContext, persistLaunchContext, readLaunchContext } from '@/app/app.lifecycle';
import { useScanEntry } from '@/hooks/useScanEntry';
import {
  clearAuthSession,
  getAuthSession,
  saveAuthSession,
  updateAuthSession,
  type AuthSession,
} from '@/store/auth/authStore';
import { isFamily, isLoggedIn, isVolunteer, shouldRedirectToLogin } from '@/store/auth/authSelectors';
import { clearCurrentElderSummary, getCurrentElderSummary, saveCurrentElderSummary } from '@/store/elder/currentElderStore';
import { getAppSession, updateAppSession } from '@/store/app/appSessionStore';
import {
  canEditBasicInfo,
  canEditMedications,
  canEditScales,
  canExportNameplate,
  canManageContacts,
  canManageQrCode,
  canRegenerateQrCode,
  canRequestQrDisable,
  canViewScales,
} from '@/utils/permissions';
import {
  hasScanContext,
  parseQueryParams,
  parseRouteText,
  parseSceneString,
} from '@/utils/routeParams';
import {
  cleanupExpiredStorage,
  getStorageValue,
  getStorageValueAsync,
  removeStorageValuesByPrefix,
  removeStorageValue,
  setStorageValue,
  setStorageValueAsync,
} from '@/utils/storage';
import { httpClient } from '@/services/api/httpClient';
import { i18nRuntime } from '@/i18n';
import { normalizeLocalizedError } from '@/hooks/useLocalizedError';
import { ApiMessageError, getErrorMessage } from '@shared-i18n/messages';
import {
  getScanVerificationStatus,
  resolveScanToken,
  startScanSmsVerification,
  verifyScanIdentity,
} from '@/services/scan/scanAuthService';
import {
  fetchArchive,
  fetchMedications,
  fetchScales,
  fetchVerifiedBasicInfo,
} from '@/services/scan/scanArchiveService';
import {
  cacheVolunteerMedications,
  createFamilyMedication,
  deleteFamilyMedication,
  fetchWorkbenchMedications,
  getCachedVolunteerMedications,
  updateFamilyMedication,
} from '@/services/workbench/medicationService';
import {
  fetchNameplatePreview,
  openNameplatePdf,
  resolveBase64PreviewImage,
  resolveNameplateQrValue,
  resolveQrDisplayUrl,
  resolveQrPayloadPreviewImage,
  resolveWorkbenchQrPreviewImage,
} from '@/services/workbench/qrcodeService';
import { batchRequests } from '@/utils/requestQueue';
import {
  formatAgeLabel,
  formatArchiveNoLabel,
  formatDateLabel,
  formatDateTimeLabel,
  formatPhoneLabel,
  formatScoreLabel,
} from '@/utils/formatters';

type TestCase = {
  name: string;
  run: () => void | Promise<void>;
};

const tests: TestCase[] = [];
type PlatformCallName =
  | 'getSetting'
  | 'authorize'
  | 'openSetting'
  | 'scanCode'
  | 'navigateTo'
  | 'redirectTo'
  | 'showToast'
  | 'showModal'
  | 'setClipboardData'
  | 'makePhoneCall';
const taroTestApi = Taro as unknown as {
  __resetStorage: () => void;
  __getStorageSnapshot: () => Map<string, unknown>;
  __getRequests: () => Array<Record<string, unknown>>;
  __getDownloads: () => Array<Record<string, unknown>>;
  __getOpenDocuments: () => Array<Record<string, unknown>>;
  __getPlatformCalls: (name: PlatformCallName) => Array<Record<string, unknown>>;
  __setRequestHandler: (handler: ((option: Record<string, unknown>) => Promise<Record<string, unknown>> | Record<string, unknown>) | null) => void;
  __setDownloadHandler: (handler: ((option: Record<string, unknown>) => Promise<Record<string, unknown>> | Record<string, unknown>) | null) => void;
  __setPlatformHandler: (name: PlatformCallName, handler: ((option: Record<string, unknown>) => Promise<unknown> | unknown) | null) => void;
};
const realDateNow = Date.now;
const API_BASE_URL = 'https://sxyq27.online/silverlink-api';

function test(name: string, run: TestCase['run']) {
  tests.push({ name, run });
}

async function withFrozenTime<T>(timestamp: number, run: () => T | Promise<T>) {
  Date.now = () => timestamp;
  try {
    return await run();
  } finally {
    Date.now = realDateNow;
  }
}

function resetStorage() {
  taroTestApi.__resetStorage();
  clearAuthSession();
  clearCurrentElderSummary();
}

function requestPath(item: Record<string, unknown>) {
  return String(item.url).replace(API_BASE_URL, '');
}

test('route params parse H5 token, /s token, raw token, and scene payloads', () => {
  assert.deepEqual(parseRouteText('demo-key-v1.abc def'), {
    qrToken: 'demo-key-v1.abc+def',
  });

  assert.deepEqual(parseRouteText('https://sxyq27.online/silverlink/scan/?token=demo-key-v1.a%2Bb&source=card'), {
    qrToken: 'demo-key-v1.a+b',
    elderId: undefined,
    archiveNo: undefined,
    inviteCode: undefined,
    source: 'card',
    rawScene: undefined,
  });

  assert.deepEqual(parseRouteText('https://sxyq27.online/silverlink/scan/s/demo-key-v1.path%2Btoken'), {
    qrToken: 'demo-key-v1.path+token',
    elderId: undefined,
    archiveNo: undefined,
    inviteCode: undefined,
    source: undefined,
    rawScene: undefined,
  });

  assert.deepEqual(parseSceneString('qrToken=scene token&elderId=elder-1&archiveNo=A001'), {
    qrToken: 'scene+token',
    elderId: 'elder-1',
    archiveNo: 'A001',
    inviteCode: undefined,
    source: undefined,
    rawScene: 'qrToken=scene token&elderId=elder-1&archiveNo=A001',
  });

  assert.deepEqual(parseQueryParams({ token: 'direct token', scene: encodeURIComponent('qrToken=scene-token&elderId=elder-2') }), {
    qrToken: 'scene-token',
    elderId: 'elder-2',
    archiveNo: undefined,
    inviteCode: undefined,
    source: undefined,
    rawScene: 'qrToken=scene-token&elderId=elder-2',
  });

  assert.equal(hasScanContext({ qrToken: 'token' }), true);
  assert.equal(hasScanContext({}), false);
});

test('launch context marks scan launches and can persist/read them', () => {
  resetStorage();
  void withFrozenTime(1780680000000, () => {
    const context = createLaunchContext({ scene: encodeURIComponent('token=launch-token&archiveNo=A002') });
    assert.equal(context.launchMode, 'scan');
    assert.equal(context.openedAt, 1780680000000);
    assert.deepEqual(context.params, {
      qrToken: 'launch-token',
      elderId: undefined,
      archiveNo: 'A002',
      inviteCode: undefined,
      source: undefined,
      rawScene: 'token=launch-token&archiveNo=A002',
    });
    persistLaunchContext(context);
    assert.deepEqual(readLaunchContext(), context);
  });

  assert.equal(createLaunchContext({}).launchMode, 'home');
});

test('role permission matrix keeps volunteer and family scopes separated', () => {
  assert.equal(canEditBasicInfo(ROLE_TYPES.volunteer), true);
  assert.equal(canEditBasicInfo(ROLE_TYPES.family), false);
  assert.equal(canManageContacts(ROLE_TYPES.family), true);
  assert.equal(canManageContacts(ROLE_TYPES.volunteer), false);
  assert.equal(canEditMedications(ROLE_TYPES.volunteer), true);
  assert.equal(canEditMedications(ROLE_TYPES.family), true);
  assert.equal(canEditScales(ROLE_TYPES.volunteer), true);
  assert.equal(canEditScales(ROLE_TYPES.family), false);
  assert.equal(canViewScales(ROLE_TYPES.volunteer), true);
  assert.equal(canViewScales(ROLE_TYPES.family), false);
  assert.equal(canManageQrCode(ROLE_TYPES.volunteer), true);
  assert.equal(canManageQrCode(ROLE_TYPES.family), true);
  assert.equal(canRegenerateQrCode(ROLE_TYPES.volunteer), true);
  assert.equal(canRegenerateQrCode(ROLE_TYPES.family), false);
  assert.equal(canRequestQrDisable(ROLE_TYPES.volunteer), true);
  assert.equal(canRequestQrDisable(ROLE_TYPES.family), true);
  assert.equal(canExportNameplate(ROLE_TYPES.volunteer), true);
  assert.equal(canExportNameplate(ROLE_TYPES.family), true);
});

test('formatters normalize empty values, dates, phones, ages, and scores', () => {
  assert.equal(formatDateLabel(), '暂无记录');
  assert.equal(formatDateTimeLabel(), '暂无记录');
  assert.equal(formatDateTimeLabel(undefined), '暂无记录');
  assert.equal(formatDateTimeLabel(null as unknown as string), '暂无记录');
  assert.equal(formatDateLabel('2026-06-06T01:15:00Z'), '2026-06-06');
  assert.equal(formatDateTimeLabel('bad-date'), 'bad-date');
  assert.match(formatDateTimeLabel('2026-06-05T17:15:00Z'), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  assert.equal(formatPhoneLabel('13816660001'), '138 1666 0001');
  assert.equal(formatPhoneLabel('010-123456'), '010-123456');
  assert.equal(formatArchiveNoLabel(''), '未分配');
  assert.equal(formatAgeLabel(0), '未填写');
  assert.equal(formatAgeLabel('78'), '78 岁');
  assert.equal(formatScoreLabel(''), '未评分');
  assert.equal(formatScoreLabel(12), '12 分');
});

test('sync storage supports fallback, ttl expiration, removal, and cleanup', async () => {
  resetStorage();
  await withFrozenTime(1000, () => {
    assert.equal(getStorageValue('missing', 'fallback'), 'fallback');
    setStorageValue('token', 'abc', 500);
    assert.equal(getStorageValue('token', 'fallback'), 'abc');
  });

  await withFrozenTime(1601, () => {
    assert.equal(getStorageValue('token', 'fallback'), 'fallback');
    assert.equal(taroTestApi.__getStorageSnapshot().has('token'), false);
    assert.equal(taroTestApi.__getStorageSnapshot().has('token__exp__'), false);
  });

  await withFrozenTime(2000, () => {
    setStorageValue('cleanup-me', 'value', 100);
    setStorageValue('keep-me', 'value', 5000);
  });
  await withFrozenTime(2200, () => {
    cleanupExpiredStorage();
    assert.equal(getStorageValue('cleanup-me', 'fallback'), 'fallback');
    assert.equal(getStorageValue('keep-me', 'fallback'), 'value');
    removeStorageValue('keep-me');
    assert.equal(getStorageValue('keep-me', 'fallback'), 'fallback');
  });

  setStorageValue('sensitive-cache__a', 'A', 1000);
  setStorageValue('sensitive-cache__b', 'B');
  setStorageValue('other-cache__c', 'C');
  removeStorageValuesByPrefix(['sensitive-cache__']);
  assert.equal(getStorageValue('sensitive-cache__a', 'fallback'), 'fallback');
  assert.equal(taroTestApi.__getStorageSnapshot().has('sensitive-cache__a__exp__'), false);
  assert.equal(getStorageValue('sensitive-cache__b', 'fallback'), 'fallback');
  assert.equal(getStorageValue('other-cache__c', 'fallback'), 'C');
});

test('async storage returns values without ttl and expires ttl-backed values', async () => {
  resetStorage();
  await withFrozenTime(3000, async () => {
    await setStorageValueAsync('async-no-ttl', 'value');
    assert.equal(await getStorageValueAsync('async-no-ttl', 'fallback'), 'value');
    await setStorageValueAsync('async-with-ttl', 'fresh', 100);
    assert.equal(await getStorageValueAsync('async-with-ttl', 'fallback'), 'fresh');
  });

  await withFrozenTime(3200, async () => {
    assert.equal(await getStorageValueAsync('async-with-ttl', 'fallback'), 'fallback');
  });
});

test('auth, app session, and current elder stores persist expected state', () => {
  resetStorage();
  const authSession: AuthSession = {
    token: 'token-1',
    role: ROLE_TYPES.volunteer,
    accountId: 'vol-1',
    displayName: '志愿者一',
    loggedInAt: 1780680000000,
    cookieBacked: true,
  };

  assert.equal(isLoggedIn(null), false);
  assert.equal(shouldRedirectToLogin(null), true);
  saveAuthSession(authSession);
  assert.deepEqual(getAuthSession(), authSession);
  assert.equal(isLoggedIn(getAuthSession()), true);
  assert.equal(isVolunteer(getAuthSession()), true);
  assert.equal(isFamily(getAuthSession()), false);
  assert.equal(updateAuthSession({ displayName: '更新名' })?.displayName, '更新名');
  persistLaunchContext(createLaunchContext({ token: 'scan-token' }));
  updateAppSession({ homeEntrySource: 'workbench', lastWorkbenchOpenedAt: 1780680000100 });
  saveCurrentElderSummary({
    id: 'elder-privacy',
    archiveNo: 'A-PRIVACY',
    name: '隐私老人',
    age: 82,
    gender: '女',
    residence: '完整住址',
    bloodType: 'A',
    allergyHistory: '花粉',
    emergencyContactName: '联系人',
    emergencyContactPhone: '13816660001',
    emergencyContactRelation: '子女',
    lastUpdate: '2026-06-06',
    role: ROLE_TYPES.family,
  });
  setStorageValue('api_cache__/api/workbench/elders', {
    data: [{ name: '缓存老人', emergencyContactPhone: '13816660001' }],
    cachedAt: 1780680000000,
  }, 30000);
  cacheVolunteerMedications('elder-privacy', [{ id: 'med-cache', name: '缓存药', dosage: '1片', usage: '口服', timing: '早', updatedAt: '' }]);
  clearAuthSession();
  assert.equal(getAuthSession(), null);
  assert.equal(getStorageValue(STORAGE_KEYS.authToken, ''), '');
  assert.equal(getStorageValue(STORAGE_KEYS.currentElderSummary, null), null);
  assert.equal(getStorageValue(STORAGE_KEYS.appSession, null), null);
  assert.equal(getStorageValue(STORAGE_KEYS.launchContext, null), null);
  assert.equal(getStorageValue('api_cache__/api/workbench/elders', null), null);
  assert.equal(taroTestApi.__getStorageSnapshot().has('api_cache__/api/workbench/elders__exp__'), false);
  assert.deepEqual(getCachedVolunteerMedications('elder-privacy'), []);

  assert.equal(getAppSession().homeEntrySource, 'unknown');
  assert.equal(updateAppSession({ homeEntrySource: 'scan', privacyAccepted: true }).privacyAccepted, true);

  const elderSummary = {
    id: 'elder-1',
    archiveNo: 'A001',
    name: '老人一',
    age: 78,
    gender: '男',
    residence: '上海',
    bloodType: 'A',
    allergyHistory: '无',
    emergencyContactName: '联系人',
    emergencyContactPhone: '13816660001',
    emergencyContactRelation: '子女',
    lastUpdate: '2026-06-06',
    role: ROLE_TYPES.family,
  };
  saveCurrentElderSummary(elderSummary);
  assert.deepEqual(getCurrentElderSummary(), elderSummary);
  clearCurrentElderSummary();
  assert.equal(getCurrentElderSummary(), null);
});

test('batch request queue honors max concurrent limit and keeps result order', async () => {
  let active = 0;
  let maxActive = 0;
  const result = await batchRequests(
    [1, 2, 3, 4, 5],
    async (item) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return item * 10;
    },
    { maxConcurrent: 2 },
  );

  assert.deepEqual(result, [10, 20, 30, 40, 50]);
  assert.equal(maxActive <= 2, true);
});

test('route constants include first-version scan and workbench surfaces', () => {
  assert.equal(APP_ROUTES.home, '/pages/home/index');
  assert.equal(APP_ROUTES.scanLanding, '/subpackages/scan/landing/index');
  assert.equal(APP_ROUTES.scanVerify, '/subpackages/scan/verify/index');
  assert.equal(APP_ROUTES.scanArchive, '/subpackages/scan/archive/index');
  assert.equal(APP_ROUTES.workbenchQrCode, '/subpackages/workbench/qrcode/index');
  assert.equal(STORAGE_KEYS.launchContext, 'sl_weapp_launch_context');
});

test('scan entry scans immediately when camera permission is already granted', async () => {
  resetStorage();
  taroTestApi.__setPlatformHandler('getSetting', () => ({
    authSetting: {
      'scope.camera': true,
    },
  }));
  taroTestApi.__setPlatformHandler('scanCode', () => ({
    result: 'https://sxyq27.online/silverlink/scan/?token=demo-key-v1.direct%2Btoken&source=card',
  }));

  await useScanEntry()();

  assert.equal(taroTestApi.__getPlatformCalls('authorize').length, 0);
  assert.equal(taroTestApi.__getPlatformCalls('openSetting').length, 0);
  assert.deepEqual(taroTestApi.__getPlatformCalls('scanCode')[0], {
    onlyFromCamera: true,
    scanType: ['qrCode'],
  });

  const navigationUrl = String(taroTestApi.__getPlatformCalls('navigateTo')[0].url);
  assert.equal(navigationUrl.startsWith(`${APP_ROUTES.scanLanding}?`), true);
  const params = new URLSearchParams(navigationUrl.split('?')[1]);
  assert.equal(params.get('qrToken'), 'demo-key-v1.direct+token');
  assert.equal(params.get('source'), 'card');
});

test('scan entry requests first-time camera authorization before scanning', async () => {
  resetStorage();
  taroTestApi.__setPlatformHandler('getSetting', () => ({ authSetting: {} }));
  taroTestApi.__setPlatformHandler('scanCode', () => ({
    result: 'demo-key-v1 first-token',
  }));

  await useScanEntry()();

  assert.deepEqual(taroTestApi.__getPlatformCalls('authorize')[0], {
    scope: 'scope.camera',
  });
  assert.equal(taroTestApi.__getPlatformCalls('openSetting').length, 0);
  assert.equal(taroTestApi.__getPlatformCalls('scanCode').length, 1);

  const navigationUrl = String(taroTestApi.__getPlatformCalls('navigateTo')[0].url);
  const params = new URLSearchParams(navigationUrl.split('?')[1]);
  assert.equal(params.get('qrToken'), 'demo-key-v1+first-token');
  assert.equal(params.get('source'), 'wx-scan');
});

test('scan entry opens settings after camera authorization is denied', async () => {
  resetStorage();
  taroTestApi.__setPlatformHandler('getSetting', () => ({ authSetting: {} }));
  taroTestApi.__setPlatformHandler('authorize', () => {
    throw { errMsg: 'authorize:fail auth deny' };
  });
  taroTestApi.__setPlatformHandler('openSetting', () => ({
    authSetting: {
      'scope.camera': true,
    },
  }));
  taroTestApi.__setPlatformHandler('scanCode', () => ({
    result: 'https://sxyq27.online/silverlink/scan/s/demo-key-v1.after-deny',
  }));

  await useScanEntry()();

  assert.equal(taroTestApi.__getPlatformCalls('showModal').length, 1);
  assert.equal(taroTestApi.__getPlatformCalls('openSetting').length, 1);
  assert.equal(taroTestApi.__getPlatformCalls('scanCode').length, 1);

  const navigationUrl = String(taroTestApi.__getPlatformCalls('navigateTo')[0].url);
  const params = new URLSearchParams(navigationUrl.split('?')[1]);
  assert.equal(params.get('qrToken'), 'demo-key-v1.after-deny');
});

test('scan entry ignores user-cancelled scan without surfacing an error', async () => {
  resetStorage();
  taroTestApi.__setPlatformHandler('getSetting', () => ({
    authSetting: {
      'scope.camera': true,
    },
  }));
  taroTestApi.__setPlatformHandler('scanCode', () => {
    throw { errMsg: 'scanCode:fail cancel' };
  });

  await useScanEntry()();

  assert.equal(taroTestApi.__getPlatformCalls('scanCode').length, 1);
  assert.equal(taroTestApi.__getPlatformCalls('showToast').length, 0);
  assert.equal(taroTestApi.__getPlatformCalls('navigateTo').length, 0);
});

test('scan entry reports invalid QR payloads without navigating', async () => {
  resetStorage();
  taroTestApi.__setPlatformHandler('getSetting', () => ({
    authSetting: {
      'scope.camera': true,
    },
  }));
  taroTestApi.__setPlatformHandler('scanCode', () => ({
    result: 'https://sxyq27.online/silverlink/scan/no-token',
  }));

  await useScanEntry()();

  assert.deepEqual(taroTestApi.__getPlatformCalls('showToast')[0], {
    title: ERROR_MESSAGES.invalidQr,
    icon: 'none',
  });
  assert.equal(taroTestApi.__getPlatformCalls('navigateTo').length, 0);
});

test('http client attaches auth, unwraps envelopes, caches GETs, and clears token on 401', async () => {
  resetStorage();
  saveAuthSession({
    token: 'token-abc',
    role: ROLE_TYPES.volunteer,
    accountId: 'vol-privacy',
    displayName: '隐私志愿者',
    loggedInAt: 1780680000000,
    cookieBacked: true,
  });
  saveCurrentElderSummary({
    id: 'elder-401',
    archiveNo: 'A401',
    name: '401老人',
    age: 80,
    gender: '男',
    residence: '401住址',
    bloodType: 'O',
    allergyHistory: '',
    emergencyContactName: '401联系人',
    emergencyContactPhone: '13816660002',
    emergencyContactRelation: '子女',
    lastUpdate: '2026-06-06',
    role: ROLE_TYPES.volunteer,
  });
  updateAppSession({ homeEntrySource: 'workbench', lastWorkbenchOpenedAt: 1780680000200 });
  persistLaunchContext(createLaunchContext({ token: '401-token' }));
  cacheVolunteerMedications('elder-401', [{ id: 'med-401', name: '401缓存药', dosage: '1片', usage: '口服', timing: '早', updatedAt: '' }]);
  let demoRequestCount = 0;
  taroTestApi.__setRequestHandler((option) => {
    if (String(option.url).includes('/unauthorized')) {
      return {
        statusCode: 401,
        data: { message: '登录失效' },
      };
    }
    if (String(option.url).includes('/cache-clear')) {
      return {
        statusCode: 500,
        data: { message: '服务异常' },
      };
    }
    demoRequestCount += 1;
    return {
      statusCode: 200,
      data: {
        code: 0,
        data: { value: demoRequestCount },
      },
    };
  });

  await withFrozenTime(5000, async () => {
    assert.deepEqual(await httpClient.get<{ value: number }>('/api/demo', { cacheTtl: 1000, useQueue: false }), { value: 1 });
    assert.deepEqual(await httpClient.get<{ value: number }>('/api/demo', { cacheTtl: 1000, useQueue: false }), { value: 1 });
  });

  assert.equal(demoRequestCount, 1);
  assert.equal(requestPath(taroTestApi.__getRequests()[0]), '/api/demo');
  assert.equal(taroTestApi.__getRequests()[0].method, 'GET');
  assert.equal(taroTestApi.__getRequests()[0].enableCookie, true);
  const headers = taroTestApi.__getRequests()[0].header as Record<string, string>;
  assert.equal(headers.Authorization, 'Bearer token-abc');
  assert.equal(headers['Content-Type'], 'application/json');

  setStorageValue('api_cache__/api/cache-clear', { data: { value: 'stale' }, cachedAt: 0 });
  await withFrozenTime(7000, async () => {
    await assert.rejects(
      () => httpClient.get('/api/cache-clear', { cacheTtl: 1000, useQueue: false }),
      /请求失败，请稍后重试/,
    );
  });
  assert.equal(taroTestApi.__getStorageSnapshot().has('api_cache__/api/cache-clear'), false);

  await assert.rejects(() => httpClient.get('/api/unauthorized', { useQueue: false }), /登录失效/);
  assert.equal(getStorageValue(STORAGE_KEYS.authToken, ''), '');
  assert.equal(getAuthSession(), null);
  assert.equal(getStorageValue(STORAGE_KEYS.currentElderSummary, null), null);
  assert.equal(getStorageValue(STORAGE_KEYS.appSession, null), null);
  assert.equal(getStorageValue(STORAGE_KEYS.launchContext, null), null);
  assert.equal(getStorageValue('api_cache__/api/demo', null), null);
  assert.deepEqual(getCachedVolunteerMedications('elder-401'), []);
});

test('http client surfaces API errors and downloadFile contract', async () => {
  resetStorage();
  taroTestApi.__setRequestHandler((option) => {
    if (String(option.url).includes('/server-error')) {
      return {
        statusCode: 503,
        data: JSON.stringify({ message: '服务不可用' }),
      };
    }
    return {
      statusCode: 200,
      data: { code: 400, message: '业务错误' },
    };
  });
  await assert.rejects(() => httpClient.post('/api/error', { foo: 'bar' }, { useQueue: false }), /业务错误/);
  assert.deepEqual(taroTestApi.__getRequests()[0].data, { foo: 'bar' });
  assert.equal(taroTestApi.__getRequests()[0].method, 'POST');
  await assert.rejects(() => httpClient.get('/api/server-error', { useQueue: false }), /请求失败，请稍后重试/);

  taroTestApi.__setDownloadHandler((option) => ({
    statusCode: String(option.url).includes('bad') ? 500 : 200,
    tempFilePath: '/tmp/nameplate.pdf',
  }));
  assert.deepEqual(await httpClient.download('/api/nameplates/elder-1/pdf'), {
    tempFilePath: '/tmp/nameplate.pdf',
    statusCode: 200,
  });
  assert.equal(taroTestApi.__getDownloads()[0].url, `${API_BASE_URL}/api/nameplates/elder-1/pdf`);
  assert.equal((taroTestApi.__getDownloads()[0].header as Record<string, string>)['Content-Type'], 'application/json');
  assert.equal(taroTestApi.__getDownloads()[0].enableCookie, true);
  await assert.rejects(() => httpClient.download('/api/bad'), /请求失败，请稍后重试/);
});

test('http client localizes Kazakh keys and keeps unknown-key server messages', async () => {
  resetStorage();
  i18nRuntime.setLocale('kk-Arab-CN');
  taroTestApi.__setRequestHandler((option) => {
    const url = String(option.url);
    if (url.includes('/known-key')) {
      return {
        statusCode: 401,
        data: { message: '账号或密码错误', messageKey: 'errors.loginFailed' },
      };
    }
    if (url.includes('/unknown-key')) {
      return {
        statusCode: 400,
        data: { message: '服务端自定义提示', messageKey: 'errors.unknownKey' },
      };
    }
    if (url.includes('/technical-server-error')) {
      return {
        statusCode: 500,
        data: { code: 500, message: 'Last unit does not have enough valid bits' },
      };
    }
    if (url.includes('/proxy-client-error')) {
      return {
        statusCode: 400,
        data: '<html>proxy request id=abc</html>',
      };
    }
    if (url.includes('/plain-technical-client-error')) {
      return {
        statusCode: 403,
        data: 'upstream connection reset',
      };
    }
    return {
      statusCode: 500,
      data: { message: '   ', messageKey: 'errors.unknownKey' },
    };
  });

  try {
    await assert.rejects(
      () => httpClient.get('/api/known-key', { useQueue: false }),
      /ەسەپتىك جازبا نەمەسە قۇپياسوز دۇرىس ەمەس/,
    );
    await assert.rejects(
      () => httpClient.get('/api/unknown-key', { useQueue: false }),
      /服务端自定义提示/,
    );
    let technicalError: unknown;
    try {
      await httpClient.get('/api/technical-server-error', { useQueue: false });
    } catch (error) {
      technicalError = error;
    }
    assert.ok(technicalError instanceof ApiMessageError);
    assert.equal(technicalError.messageKey, 'errors.requestFailed');
    assert.match(technicalError.message, new RegExp(i18nRuntime.t('errors.requestFailed')));
    await assert.rejects(
      () => httpClient.get('/api/proxy-client-error', { useQueue: false }),
      new RegExp(i18nRuntime.t('errors.requestFailed')),
    );
    await assert.rejects(
      () => httpClient.get('/api/plain-technical-client-error', { useQueue: false }),
      new RegExp(i18nRuntime.t('errors.requestFailed')),
    );
    i18nRuntime.setLocale('zh-CN');
    assert.equal(getErrorMessage(technicalError, i18nRuntime.t, 'errors.requestFailed'), '请求失败，请稍后重试');
    i18nRuntime.setLocale('kk-Arab-CN');
    await assert.rejects(
      () => httpClient.get('/api/empty-message', { useQueue: false }),
      /سۇراۋ ءساتسىز اياقتالدى, كەيىنىرەك قايتالاپ كورىڭىز/,
    );
  } finally {
    i18nRuntime.setLocale('zh-CN');
  }
});

test('localized error state hides raw platform errors and keeps stable API message keys', () => {
  i18nRuntime.setLocale('zh-CN');
  const platformError = normalizeLocalizedError(
    new Error('native platform internal failure'),
    i18nRuntime.t,
    'errors.linkCopyFailed',
  );
  assert.equal(platformError.messageKey, 'errors.linkCopyFailed');
  assert.equal(
    getErrorMessage(platformError, i18nRuntime.t, 'errors.requestFailed'),
    i18nRuntime.t('errors.linkCopyFailed'),
  );
  assert.doesNotMatch(
    getErrorMessage(platformError, i18nRuntime.t, 'errors.requestFailed'),
    /native platform internal failure/,
  );

  i18nRuntime.setLocale('ug-Arab-CN');
  assert.equal(
    getErrorMessage(platformError, i18nRuntime.t, 'errors.requestFailed'),
    i18nRuntime.t('errors.linkCopyFailed'),
  );
  i18nRuntime.setLocale('kk-Arab-CN');
  assert.equal(
    getErrorMessage(platformError, i18nRuntime.t, 'errors.requestFailed'),
    i18nRuntime.t('errors.linkCopyFailed'),
  );

  const serverBusinessError = new ApiMessageError('服务端自定义提示', 'errors.unknownKey');
  assert.equal(
    normalizeLocalizedError(serverBusinessError, i18nRuntime.t, 'errors.requestFailed'),
    serverBusinessError,
  );
  assert.equal(
    getErrorMessage(serverBusinessError, i18nRuntime.t, 'errors.requestFailed'),
    '服务端自定义提示',
  );
  i18nRuntime.setLocale('zh-CN');
});

test('scan services call backend paths and normalize verification payloads', async () => {
  resetStorage();
  const seen: Array<Record<string, unknown>> = [];
  taroTestApi.__setRequestHandler((option) => {
    seen.push(option);
    const url = String(option.url);
    if (url.endsWith('/api/scan/resolve')) {
      return {
        statusCode: 200,
        data: {
          data: {
            elderId: 'elder-1',
            archiveNo: 'A001',
            name: '老人一',
            age: '78',
            emergencyContactName: '联系人',
          },
        },
      };
    }
    if (url.endsWith('/api/scan/verification/start')) {
      return {
        statusCode: 200,
        data: {
          data: {
            sessionId: 'session-1',
            receiverPhone: '15200003755',
            receiverPhoneMasked: '152****3755',
            messageBody: 'SL CODE',
          },
        },
      };
    }
    if (url.includes('/api/scan/verification/status')) {
      return {
        statusCode: 200,
        data: {
          data: {
            sessionId: 'session-1',
            elderId: 'elder-1',
            status: 'VERIFIED',
            verified: true,
          },
        },
      };
    }
    if (url.endsWith('/api/scan/verification/identity')) {
      return {
        statusCode: 200,
        data: {
          data: {
            sessionId: 'identity-session',
            status: 'VERIFIED',
            verified: true,
          },
        },
      };
    }
    throw new Error(`unexpected url ${url}`);
  });

  assert.deepEqual(await resolveScanToken({ token: 'qr-token' }), {
    elderId: 'elder-1',
    archiveNo: 'A001',
    name: '老人一',
    gender: '',
    age: 78,
    residence: '',
    emergencyContactName: '联系人',
    emergencyPhoneMasked: '',
    emergencyPhoneDial: '',
    relationship: '',
    aboType: '',
    rhType: '',
    allergySummary: '',
  });
  assert.deepEqual(await startScanSmsVerification('elder-1', 'medications'), {
    sessionId: 'session-1',
    elderId: '',
    receiverPhone: '15200003755',
    receiverPhoneMasked: '152****3755',
    messageBody: 'SL CODE',
    messagePrefix: '',
    status: 'PENDING',
    expiresAt: '',
  });
  assert.deepEqual(await getScanVerificationStatus('session 1'), {
    sessionId: 'session-1',
    elderId: 'elder-1',
    status: 'VERIFIED',
    verified: true,
    verifiedAt: '',
    senderPhoneMasked: '',
  });
  assert.deepEqual(await verifyScanIdentity({
    elderId: 'elder-1',
    target: 'health',
    name: '访客',
    phone: '13816660001',
    idCard: '11010519491231002X',
  }), {
    sessionId: 'identity-session',
    elderId: '',
    status: 'VERIFIED',
    verified: true,
    verifiedAt: '',
    senderPhoneMasked: '',
  });

  assert.deepEqual(seen.map((item) => [item.method, String(item.url).replace('https://sxyq27.online/silverlink-api', '')]), [
    ['POST', '/api/scan/resolve'],
    ['POST', '/api/scan/verification/start'],
    ['GET', '/api/scan/verification/status?sessionId=session%201'],
    ['POST', '/api/scan/verification/identity'],
  ]);
  assert.deepEqual(seen.map((item) => item.data), [
    { token: 'qr-token' },
    { elderId: 'elder-1', target: 'medications' },
    undefined,
    {
      elderId: 'elder-1',
      target: 'health',
      name: '访客',
      phone: '13816660001',
      idCard: '11010519491231002X',
    },
  ]);
});

test('protected scan archive services build session-scoped URLs and normalize data', async () => {
  resetStorage();
  taroTestApi.__setRequestHandler((option) => {
    const url = String(option.url);
    if (url.includes('/api/scan/basic-info')) {
      return { statusCode: 200, data: { data: { id: 'elder-1', name: '老人一', emergencyContact: '联系人', age: '78' } } };
    }
    if (url.includes('/api/scan/archive')) {
      return { statusCode: 200, data: { data: { date: '2026-06-06', heightCm: '170', bmi: '22.4' } } };
    }
    if (url.includes('/api/scan/medications')) {
      return { statusCode: 200, data: { data: [{ name: '药品', dosage: '1片', usage: '口服', time: '早' }] } };
    }
    if (url.includes('/api/scan/scales')) {
      return { statusCode: 200, data: { data: [{ name: '量表', score: '12', answers: [{ question: 'Q1', value: '2' }] }] } };
    }
    throw new Error(`unexpected url ${url}`);
  });

  assert.equal((await fetchVerifiedBasicInfo('elder 1', 'session 1')).elderId, 'elder-1');
  assert.equal((await fetchArchive('elder 1', 'session 1')).heightCm, 170);
  assert.equal((await fetchMedications('elder 1', 'session 1'))[0].name, '药品');
  assert.equal((await fetchScales('elder 1', 'session 1'))[0].answers?.[0].value, 2);
  assert.deepEqual(taroTestApi.__getRequests().map((item) => [item.method, requestPath(item), item.data]), [
    ['GET', '/api/scan/basic-info?elderId=elder%201&sessionId=session%201', undefined],
    ['GET', '/api/scan/archive?elderId=elder%201&sessionId=session%201', undefined],
    ['GET', '/api/scan/medications?elderId=elder%201&sessionId=session%201', undefined],
    ['GET', '/api/scan/scales?elderId=elder%201&sessionId=session%201', undefined],
  ]);
});

test('workbench medication service uses volunteer GET, 405 cache fallback, no-cache fallback, and family path mapping', async () => {
  resetStorage();
  taroTestApi.__setRequestHandler((option) => {
    const url = String(option.url);
    if (url.includes('/api/volunteer/me/elders/elder-1/medications')) {
      return { statusCode: 200, data: { data: [{ id: 'vol-1', name: '志愿药', dosage: '2片', usage: '口服', timing: '早' }] } };
    }
    throw new Error(`unexpected url ${url}`);
  });

  assert.deepEqual(await fetchWorkbenchMedications(ROLE_TYPES.volunteer, 'elder-1'), [
    { id: 'vol-1', name: '志愿药', dosage: '2片', usage: '口服', timing: '早', updatedAt: '' },
  ]);
  assert.deepEqual(getStorageValue('sl_weapp_volunteer_medications__elder-1', []), [
    { id: 'vol-1', name: '志愿药', dosage: '2片', usage: '口服', timing: '早', updatedAt: '' },
  ]);
  assert.deepEqual(taroTestApi.__getRequests().map((item) => [item.method, requestPath(item)]), [
    ['GET', '/api/volunteer/me/elders/elder-1/medications'],
  ]);

  resetStorage();
  cacheVolunteerMedications('elder 1', [{ id: 'cached', name: '缓存药', dosage: '', usage: '', timing: '', updatedAt: '' }]);
  taroTestApi.__setRequestHandler((option) => {
    const url = String(option.url);
    if (url.includes('/api/volunteer/me/elders/elder%201/medications')) {
      return { statusCode: 405, data: { message: "Request method 'GET' is not supported" } };
    }
    if (url.includes('/api/volunteer/me/elders/elder-empty/medications')) {
      return { statusCode: 405, data: { message: "Request method 'GET' is not supported" } };
    }
    if (url.includes('/api/volunteer/me/elders/elder-fail/medications')) {
      return { statusCode: 500, data: { message: '药品读取失败' } };
    }
    if (url.includes('/api/family/elders/elder-1/medications')) {
      return { statusCode: 200, data: { data: [{ id: 'fam-1', name: '家属药', dosage: '1片', usage: '口服', timing: '晚' }] } };
    }
    throw new Error(`unexpected url ${url}`);
  });

  assert.equal((await fetchWorkbenchMedications(ROLE_TYPES.volunteer, 'elder 1'))[0].name, '缓存药');
  assert.deepEqual(await fetchWorkbenchMedications(ROLE_TYPES.volunteer, 'elder-empty'), []);
  await assert.rejects(
    () => fetchWorkbenchMedications(ROLE_TYPES.volunteer, 'elder-fail'),
    /请求失败，请稍后重试/,
  );
  assert.equal((await fetchWorkbenchMedications(ROLE_TYPES.family, 'elder-1'))[0].name, '家属药');
  assert.deepEqual(taroTestApi.__getRequests().map((item) => [item.method, requestPath(item)]), [
    ['GET', '/api/volunteer/me/elders/elder%201/medications'],
    ['GET', '/api/volunteer/me/elders/elder-empty/medications'],
    ['GET', '/api/volunteer/me/elders/elder-fail/medications'],
    ['GET', '/api/family/elders/elder-1/medications'],
  ]);
});

test('family medication writes match backend response shapes', async () => {
  resetStorage();
  taroTestApi.__setRequestHandler((option) => {
    const path = requestPath(option);
    if (option.method === 'POST' && path === '/api/family/elders/elder-1/medications') {
      return {
        statusCode: 200,
        data: {
          data: {
            id: 'med-created',
            name: '新药',
            dosage: '1片',
            usage: '口服',
            timing: '晚',
          },
        },
      };
    }
    if (option.method === 'PUT' && path === '/api/family/elders/elder-1/medications/med-created') {
      return { statusCode: 200, data: { data: null } };
    }
    if (option.method === 'DELETE' && path === '/api/family/elders/elder-1/medications/med-created') {
      return { statusCode: 200, data: { data: null } };
    }
    throw new Error(`unexpected ${option.method} ${path}`);
  });

  assert.deepEqual(await createFamilyMedication('elder-1', {
    name: ' 新药 ',
    dosage: ' 1片 ',
    usage: ' 口服 ',
    timing: ' 晚 ',
  }), {
    id: 'med-created',
    name: '新药',
    dosage: '1片',
    usage: '口服',
    timing: '晚',
    updatedAt: '',
  });

  assert.deepEqual(await updateFamilyMedication('elder-1', 'med-created', {
    name: ' 新药改 ',
    dosage: ' 2片 ',
    usage: ' 口服 ',
    timing: ' 早 ',
  }), {
    id: 'med-created',
    name: '新药改',
    dosage: '2片',
    usage: '口服',
    timing: '早',
    updatedAt: '',
  });

  await deleteFamilyMedication('elder-1', 'med-created');

  assert.deepEqual(taroTestApi.__getRequests().map((item) => [item.method, requestPath(item), item.data]), [
    ['POST', '/api/family/elders/elder-1/medications', {
      name: '新药',
      dosage: '1片',
      usage: '口服',
      timing: '晚',
    }],
    ['PUT', '/api/family/elders/elder-1/medications/med-created', {
      name: '新药改',
      dosage: '2片',
      usage: '口服',
      timing: '早',
    }],
    ['DELETE', '/api/family/elders/elder-1/medications/med-created', undefined],
  ]);
});

test('qrcode and nameplate helpers preserve public URL fallbacks and open PDF downloads', async () => {
  resetStorage();
  assert.equal(resolveQrDisplayUrl('token with space'), 'https://sxyq27.online/silverlink/scan/?token=token%20with%20space');
  assert.equal(resolveQrDisplayUrl('token', 'https://direct.example/qr'), 'https://direct.example/qr');
  assert.equal(resolveQrDisplayUrl('token', '', 'https://public.example/qr'), 'https://public.example/qr');
  assert.equal(resolveQrDisplayUrl('token', 'https://direct.example/qr', 'https://public.example/qr'), 'https://public.example/qr');
  assert.equal(resolveNameplateQrValue('https://sxyq27.online/qr'), 'https://sxyq27.online/qr');
  assert.equal(resolveNameplateQrValue('  https://sxyq27.online/qr  '), 'https://sxyq27.online/qr');
  assert.equal(resolveNameplateQrValue('raw-token'), 'https://sxyq27.online/silverlink/scan/?token=raw-token');
  assert.equal(resolveNameplateQrValue(''), '');

  const seen: Array<Record<string, unknown>> = [];
  taroTestApi.__setRequestHandler((option) => {
    seen.push(option);
    const path = requestPath(option);
    assert.equal(path.startsWith('/api/nameplates/elder-1/preview?blank='), true);
    return {
      statusCode: 200,
      data: {
        data: {
          elderId: 'elder-1',
          backQrUrl: path.endsWith('blank=true') ? '' : 'https://qr.example/public',
          backQrPayload: path.endsWith('blank=true') ? 'payload-token' : '',
          backQrImageBase64: 'data:image/png;base64,QUJD',
          blankTemplate: path.endsWith('blank=true'),
        },
      },
    };
  });
  const preview = await fetchNameplatePreview('elder-1');
  assert.equal(preview.backQrToken, 'https://qr.example/public');
  assert.equal(preview.backQrUrl, 'https://qr.example/public');
  assert.equal(preview.backQrPayload, 'https://qr.example/public');
  assert.equal(preview.backQrImageBase64, 'data:image/png;base64,QUJD');
  assert.equal(preview.blankTemplate, false);
  const blankPreview = await fetchNameplatePreview('elder-1', true);
  assert.equal(blankPreview.backQrToken, 'payload-token');
  assert.equal(blankPreview.backQrUrl, '');
  assert.equal(blankPreview.backQrPayload, 'payload-token');
  assert.equal(blankPreview.blankTemplate, true);
  assert.deepEqual(seen.map((item) => [item.method, requestPath(item)]), [
    ['GET', '/api/nameplates/elder-1/preview?blank=false'],
    ['GET', '/api/nameplates/elder-1/preview?blank=true'],
  ]);

  taroTestApi.__setDownloadHandler(() => ({
    statusCode: 200,
    tempFilePath: '/tmp/nameplate.pdf',
  }));
  await openNameplatePdf('elder-1');
  assert.equal(taroTestApi.__getDownloads().at(-1)?.url, `${API_BASE_URL}/api/nameplates/elder-1/pdf`);
  assert.deepEqual(taroTestApi.__getOpenDocuments()[0], {
    filePath: '/tmp/nameplate.pdf',
    showMenu: true,
    fileType: 'pdf',
  });
});

test('qrcode preview image helpers use miniapp filesystem and fall back to data URLs', async () => {
  resetStorage();
  const previousWx = (globalThis as { wx?: unknown }).wx;
  const writes: Array<Record<string, unknown>> = [];

  (globalThis as { wx?: unknown }).wx = {
    env: {
      USER_DATA_PATH: '/wx-user-data',
    },
    base64ToArrayBuffer(value: string) {
      return Buffer.from(value, 'base64');
    },
    getFileSystemManager() {
      return {
        writeFile(option: Record<string, unknown>) {
          writes.push(option);
          const success = option.success as (() => void) | undefined;
          success?.();
        },
      };
    },
  };

  try {
    const localImage = await resolveBase64PreviewImage('data:image/png;base64,QUJD', 'unit-preview');
    assert.equal(localImage.startsWith('/wx-user-data/unit-preview-'), true);
    assert.equal(writes.length, 1);
    assert.equal(String(writes[0].filePath).startsWith('/wx-user-data/unit-preview-'), true);
    assert.equal(Buffer.isBuffer(writes[0].data), true);

    const localQrImage = await resolveWorkbenchQrPreviewImage({
      token: 'fallback-token',
      url: '',
      publicUrl: '',
      qrImageBase64: 'QUJD',
      qrImageUrl: '',
    });
    assert.equal(localQrImage.startsWith('/wx-user-data/qr-preview-'), true);
  } finally {
    if (previousWx === undefined) {
      delete (globalThis as { wx?: unknown }).wx;
    } else {
      (globalThis as { wx?: unknown }).wx = previousWx;
    }
  }

  const fallbackImage = await resolveBase64PreviewImage('data:image/png;base64,QUJD', 'unit-preview');
  assert.equal(fallbackImage, 'data:image/png;base64,QUJD');
  assert.equal(await resolveQrPayloadPreviewImage('qr-payload'), 'data:image/png;base64,cXItcGF5bG9hZA==');
  assert.equal(await resolveWorkbenchQrPreviewImage({
    token: '',
    url: '',
    publicUrl: '',
    qrImageBase64: '',
    qrImageUrl: 'https://cdn.example/qr.png',
  }), '');
});

let passed = 0;
for (const item of tests) {
  try {
    await item.run();
    passed += 1;
    console.log(`ok ${passed} - ${item.name}`);
  } catch (error) {
    console.error(`not ok ${passed + 1} - ${item.name}`);
    throw error;
  }
}

console.log(`\n${passed}/${tests.length} unit checks passed`);
