import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const expectedTaroMethods = [
  'authorize',
  'base64ToArrayBuffer',
  'downloadFile',
  'env',
  'getFileSystemManager',
  'getLaunchOptionsSync',
  'getMenuButtonBoundingClientRect',
  'getSetting',
  'getStorage',
  'getStorageInfoSync',
  'getStorageSync',
  'getSystemInfoSync',
  'makePhoneCall',
  'navigateBack',
  'navigateTo',
  'openDocument',
  'openSetting',
  'redirectTo',
  'removeStorage',
  'removeStorageSync',
  'request',
  'scanCode',
  'setClipboardData',
  'setStorage',
  'setStorageSync',
  'showModal',
  'showToast',
];

const methodContractSnippets = [
  {
    label: 'camera scan requires permission, camera-only scan, QR scan type and invalid QR fallback',
    file: 'src/hooks/useScanEntry.ts',
    snippets: [
      "const CAMERA_SCOPE = 'scope.camera'",
      'await Taro.authorize({ scope: CAMERA_SCOPE })',
      'await Taro.openSetting()',
      "Taro.scanCode({ onlyFromCamera: true, scanType: ['qrCode'] })",
      "await Taro.showToast({ title: ERROR_MESSAGES.invalidQr, icon: 'none' })",
      "errMsg.includes('not supported') || errMsg.includes('fail')",
    ],
  },
  {
    label: 'SMS composer copies message before H5 sms link and keeps Mini Program modal fallback',
    file: 'src/subpackages/scan/verify/index.tsx',
    snippets: [
      'await Taro.setClipboardData({ data: smsMessageBody })',
      "process.env.TARO_ENV === 'h5' && typeof window !== 'undefined'",
      'window.location.href = buildSmsLink(smsReceiverPhone, smsMessageBody)',
      "title: '短信内容已复制'",
      'showCancel: false',
      "setErrorText('请先生成短信内容')",
    ],
  },
  {
    label: 'SMS link uses iOS and non-iOS separator rules',
    file: 'src/subpackages/scan/verify/index.tsx',
    snippets: [
      "const isIos = systemInfo.platform === 'ios'",
      "const separator = isIos ? '&' : '?'",
      'body=${encodeURIComponent(body)}',
    ],
  },
  {
    label: 'emergency phone call is guarded by empty-phone toast',
    file: 'src/subpackages/scan/landing/index.tsx',
    snippets: [
      "if (!phone) {",
      "Taro.showToast({ title: '暂未提供联系电话', icon: 'none' })",
      'Taro.makePhoneCall({ phoneNumber: phone })',
    ],
  },
  {
    label: 'workbench QR copy uses resolved public access link and clipboard feedback',
    file: 'src/subpackages/workbench/qrcode/index.tsx',
    snippets: [
      'resolveQrDisplayUrl(info.token, info.url, info.publicUrl)',
      'await Taro.setClipboardData({',
      'data: accessLink',
      "setMessageText('二维码访问链接已复制。')",
    ],
  },
  {
    label: 'PDF download keeps cookie-backed download and pdf openDocument contract',
    file: 'src/services/api/httpClient.ts',
    snippets: [
      'Taro.downloadFile({',
      'header: buildHeaders()',
      'timeout: 20000',
      'enableCookie: true',
      'if (result.statusCode >= 400)',
    ],
  },
  {
    label: 'nameplate PDF opens as PDF with share menu after download',
    file: 'src/services/workbench/qrcodeService.ts',
    snippets: [
      'const file = await httpClient.download(`/api/nameplates/${encodeURIComponent(elderId)}/pdf`)',
      'await Taro.openDocument({',
      'filePath: file.tempFilePath',
      'showMenu: true',
      "fileType: 'pdf'",
    ],
  },
  {
    label: 'QR/nameplate preview images prefer miniapp filesystem and fall back to data URLs',
    file: 'src/services/workbench/qrcodeService.ts',
    snippets: [
      'wxApi?.getFileSystemManager?.() || Taro.getFileSystemManager?.()',
      'wxApi?.env?.USER_DATA_PATH',
      'wxApi?.base64ToArrayBuffer || Taro.base64ToArrayBuffer',
      "encoding: 'base64'",
      "return `data:image/png;base64,${normalized}`",
    ],
  },
  {
    label: 'custom header safe-area computation tolerates missing menu button geometry',
    file: 'src/components/workbench/WorkbenchHeader.tsx',
    snippets: [
      'const systemInfo = Taro.getSystemInfoSync()',
      "typeof Taro.getMenuButtonBoundingClientRect === 'function'",
      'return fallback',
      "'--sl-nav-total-height'",
    ],
  },
];

async function readText(relativePath) {
  return fsp.readFile(path.join(projectRoot, relativePath), 'utf8');
}

async function collectFiles(directory) {
  const entries = await fsp.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectFiles(fullPath);
    }
    return [fullPath];
  }));
  return nested.flat();
}

function assertContainsAll(source, snippets, label) {
  for (const snippet of snippets) {
    assert.ok(source.includes(snippet), `${label} missing snippet: ${snippet}`);
  }
}

const sourceFiles = (await collectFiles(path.join(projectRoot, 'src')))
  .filter((filePath) => /\.(?:ts|tsx)$/.test(filePath));

const taroMethodSet = new Set();
for (const filePath of sourceFiles) {
  const source = await fsp.readFile(filePath, 'utf8');
  for (const match of source.matchAll(/Taro\.([A-Za-z0-9_]+)/g)) {
    taroMethodSet.add(match[1]);
  }
}

assert.deepEqual([...taroMethodSet].sort(), expectedTaroMethods, 'Taro platform method surface drifted');

for (const contract of methodContractSnippets) {
  const source = await readText(contract.file);
  assertContainsAll(source, contract.snippets, contract.label);
}

const verifySource = await readText('src/subpackages/scan/verify/index.tsx');
const windowReferences = Array.from(verifySource.matchAll(/window\./g));
assert.equal(windowReferences.length, 1, 'SMS composer should keep the only window.* access behind the H5 guard');

const qrcodeSource = await readText('src/services/workbench/qrcodeService.ts');
assert.ok(!qrcodeSource.includes('saveImageToPhotosAlbum'), 'QR/nameplate preview should not write to the photo album without explicit user action');

console.log('platform contract checks passed');
console.log(`taroMethods: ${taroMethodSet.size}`);
console.log(`platformContracts: ${methodContractSnippets.length}`);
console.log(`windowReferences: ${windowReferences.length}`);
