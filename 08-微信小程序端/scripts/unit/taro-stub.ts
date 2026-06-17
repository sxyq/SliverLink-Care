const storage = new Map<string, unknown>();
const requests: Array<Record<string, unknown>> = [];
const downloads: Array<Record<string, unknown>> = [];
const openDocuments: Array<Record<string, unknown>> = [];
let requestHandler: ((option: Record<string, unknown>) => Promise<Record<string, unknown>> | Record<string, unknown>) | null = null;
let downloadHandler: ((option: Record<string, unknown>) => Promise<Record<string, unknown>> | Record<string, unknown>) | null = null;

type StorageKeyOption = { key: string };
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
type PlatformHandler = (option: Record<string, unknown>) => Promise<unknown> | unknown;

const platformCallNames: PlatformCallName[] = [
  'getSetting',
  'authorize',
  'openSetting',
  'scanCode',
  'navigateTo',
  'redirectTo',
  'showToast',
  'showModal',
  'setClipboardData',
  'makePhoneCall',
];
const platformCalls = platformCallNames.reduce(
  (acc, name) => ({ ...acc, [name]: [] }),
  {} as Record<PlatformCallName, Array<Record<string, unknown>>>,
);
const platformHandlers: Partial<Record<PlatformCallName, PlatformHandler>> = {};
let systemInfo: Record<string, unknown> = {
  platform: 'ios',
};

export function __resetStorage() {
  storage.clear();
  requests.length = 0;
  downloads.length = 0;
  openDocuments.length = 0;
  for (const name of platformCallNames) {
    platformCalls[name].length = 0;
    delete platformHandlers[name];
  }
  systemInfo = {
    platform: 'ios',
  };
  requestHandler = null;
  downloadHandler = null;
}

export function __getStorageSnapshot() {
  return new Map(storage);
}

export function __getRequests() {
  return [...requests];
}

export function __getDownloads() {
  return [...downloads];
}

export function __getOpenDocuments() {
  return [...openDocuments];
}

export function __getPlatformCalls(name: PlatformCallName) {
  return [...platformCalls[name]];
}

export function __setRequestHandler(handler: typeof requestHandler) {
  requestHandler = handler;
}

export function __setDownloadHandler(handler: typeof downloadHandler) {
  downloadHandler = handler;
}

export function __setPlatformHandler(name: PlatformCallName, handler: PlatformHandler | null) {
  if (handler) {
    platformHandlers[name] = handler;
  } else {
    delete platformHandlers[name];
  }
}

export function __setSystemInfo(nextSystemInfo: Record<string, unknown>) {
  systemInfo = {
    ...systemInfo,
    ...nextSystemInfo,
  };
}

async function runPlatformCall<T>(name: PlatformCallName, option: Record<string, unknown>, fallback: T): Promise<T> {
  platformCalls[name].push(option);
  const handler = platformHandlers[name];
  if (handler) {
    return (await handler(option)) as T;
  }
  return fallback;
}

export function getStorageSync<T = unknown>(key: string): T | '' {
  return storage.has(key) ? (storage.get(key) as T) : '';
}

export function setStorageSync<T = unknown>(key: string, value: T) {
  storage.set(key, value);
}

export function removeStorageSync(key: string) {
  storage.delete(key);
}

export function getStorageInfoSync() {
  return {
    keys: Array.from(storage.keys()),
  };
}

export async function getStorage<T = unknown>({ key }: StorageKeyOption): Promise<{ data: T }> {
  if (!storage.has(key)) {
    throw new Error(`storage key not found: ${key}`);
  }
  return {
    data: storage.get(key) as T,
  };
}

export async function setStorage<T = unknown>({ key, data }: StorageKeyOption & { data: T }) {
  storage.set(key, data);
}

export async function removeStorage({ key }: StorageKeyOption) {
  storage.delete(key);
}

export function getSystemInfoSync() {
  return systemInfo;
}

export async function getSetting() {
  return runPlatformCall('getSetting', {}, { authSetting: {} });
}

export async function authorize(option: Record<string, unknown>) {
  return runPlatformCall('authorize', option, {});
}

export async function openSetting() {
  return runPlatformCall('openSetting', {}, { authSetting: {} });
}

export async function scanCode(option: Record<string, unknown>) {
  return runPlatformCall('scanCode', option, { result: '' });
}

export async function navigateTo(option: Record<string, unknown>) {
  return runPlatformCall('navigateTo', option, {});
}

export async function redirectTo(option: Record<string, unknown>) {
  return runPlatformCall('redirectTo', option, {});
}

export async function showToast(option: Record<string, unknown>) {
  return runPlatformCall('showToast', option, {});
}

export async function setClipboardData(option: Record<string, unknown>) {
  return runPlatformCall('setClipboardData', option, {});
}

export async function showModal(option: Record<string, unknown>) {
  return runPlatformCall('showModal', option, {
    confirm: true,
    cancel: false,
  });
}

export async function makePhoneCall(option: Record<string, unknown>) {
  return runPlatformCall('makePhoneCall', option, {});
}

export async function request(option: Record<string, unknown>) {
  requests.push(option);
  if (requestHandler) {
    return requestHandler(option);
  }
  return {
    statusCode: 200,
    data: {},
  };
}

export async function downloadFile(option: Record<string, unknown>) {
  downloads.push(option);
  if (downloadHandler) {
    return downloadHandler(option);
  }
  return {
    statusCode: 200,
    tempFilePath: '/tmp/downloaded.pdf',
  };
}

export async function openDocument(option: Record<string, unknown>) {
  openDocuments.push(option);
  return {};
}

const Taro = {
  __resetStorage,
  __getStorageSnapshot,
  __getRequests,
  __getDownloads,
  __getOpenDocuments,
  __getPlatformCalls,
  __setRequestHandler,
  __setDownloadHandler,
  __setPlatformHandler,
  __setSystemInfo,
  getStorageSync,
  setStorageSync,
  removeStorageSync,
  getStorageInfoSync,
  getStorage,
  setStorage,
  removeStorage,
  getSystemInfoSync,
  getSetting,
  authorize,
  openSetting,
  scanCode,
  navigateTo,
  redirectTo,
  showToast,
  setClipboardData,
  showModal,
  makePhoneCall,
  request,
  downloadFile,
  openDocument,
};

export default Taro;
