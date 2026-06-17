import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const expectedRouteKeys = [
  'home',
  'login',
  'authRoleRedirect',
  'workbenchElderList',
  'workbenchElderDetail',
  'workbenchBasic',
  'workbenchMedication',
  'workbenchScale',
  'workbenchQrCode',
  'scanLanding',
  'scanVerify',
  'scanArchive',
  'scanMedications',
  'scanScales',
  'scanNameplate',
];

const routeQueryRequirements = [
  { routeKey: 'scanVerify', params: ['elderId'] },
  { routeKey: 'scanArchive', params: ['elderId', 'sessionId'] },
  { routeKey: 'scanMedications', params: ['elderId', 'sessionId'] },
  { routeKey: 'scanScales', params: ['elderId', 'sessionId'] },
  { routeKey: 'scanNameplate', params: ['elderId'] },
  { routeKey: 'workbenchElderDetail', params: ['elderId'] },
  { routeKey: 'workbenchBasic', params: ['elderId'] },
  { routeKey: 'workbenchMedication', params: ['elderId'] },
  { routeKey: 'workbenchScale', params: ['elderId'] },
  { routeKey: 'workbenchQrCode', params: ['elderId'] },
];

const contractSnippets = [
  {
    label: 'scan entry preserves qrToken and source before landing',
    file: 'src/hooks/useScanEntry.ts',
    snippets: ["searchParams.set('qrToken', params.qrToken)", "searchParams.set('source', params.source || 'wx-scan')", 'APP_ROUTES.scanLanding'],
  },
  {
    label: 'app launch preserves scan launch query before landing',
    file: 'src/hooks/useAppLaunch.ts',
    snippets: ['params.qrToken', 'params.elderId', 'params.archiveNo', 'params.source', 'APP_ROUTES.scanLanding'],
  },
  {
    label: 'scan landing enters verification with elderId',
    file: 'src/subpackages/scan/landing/index.tsx',
    snippets: ['APP_ROUTES.scanVerify', '?elderId=${encodeURIComponent(nextElderId)}', 'source=${encodeURIComponent'],
  },
  {
    label: 'scan verification enters protected archive with elderId and sessionId',
    file: 'src/subpackages/scan/verify/index.tsx',
    snippets: ['APP_ROUTES.scanArchive', '?elderId=${encodeURIComponent(elderId)}&sessionId=${encodeURIComponent(sessionId)}'],
  },
  {
    label: 'scan archive opens protected medication and scale pages with elderId/sessionId',
    file: 'src/subpackages/scan/archive/index.tsx',
    snippets: [
      'buildProtectedUrl(APP_ROUTES.scanMedications, elderId, sessionId)',
      'buildProtectedUrl(APP_ROUTES.scanScales, elderId, sessionId)',
      '?elderId=${encodeURIComponent(elderId)}&sessionId=${encodeURIComponent(sessionId)}',
    ],
  },
  {
    label: 'scan medications keeps protected context and can return to verification',
    file: 'src/subpackages/scan/medications/index.tsx',
    snippets: [
      'fetchMedications(elderId, sessionId)',
      'APP_ROUTES.scanArchive',
      'APP_ROUTES.scanScales',
      'APP_ROUTES.scanVerify',
      '?elderId=${encodeURIComponent(elderId)}&sessionId=${encodeURIComponent(sessionId)}',
    ],
  },
  {
    label: 'scan scales keeps protected context and can return to verification',
    file: 'src/subpackages/scan/scales/index.tsx',
    snippets: [
      'fetchScales(elderId, sessionId)',
      'APP_ROUTES.scanArchive',
      'APP_ROUTES.scanMedications',
      'APP_ROUTES.scanVerify',
      '?elderId=${encodeURIComponent(elderId)}&sessionId=${encodeURIComponent(sessionId)}',
    ],
  },
  {
    label: 'workbench list opens details with elderId',
    file: 'src/subpackages/workbench/elder-list/index.tsx',
    snippets: ['APP_ROUTES.workbenchElderDetail', '?elderId=${encodeURIComponent(item.id)}', '?elderId=${encodeURIComponent(result.id)}'],
  },
  {
    label: 'workbench detail opens child pages with elderId',
    file: 'src/subpackages/workbench/elder-detail/index.tsx',
    snippets: ['handleOpenPage(APP_ROUTES.workbenchBasic)', 'handleOpenPage(APP_ROUTES.workbenchMedication)', '?elderId=${encodeURIComponent(elderId)}'],
  },
  {
    label: 'workbench bottom navigation preserves elderId',
    file: 'src/components/workbench/BottomNavGrid.tsx',
    snippets: ['url: `${route}?elderId=${encodeURIComponent(elderId)}`'],
  },
  {
    label: 'workbench qrcode opens nameplate preview with elderId',
    file: 'src/subpackages/workbench/qrcode/index.tsx',
    snippets: ['APP_ROUTES.scanNameplate', '?elderId=${encodeURIComponent(elderId)}'],
  },
  {
    label: 'nameplate back fallback preserves elderId',
    file: 'src/subpackages/scan/nameplate/index.tsx',
    snippets: ['APP_ROUTES.workbenchElderDetail', '?elderId=${encodeURIComponent(elderId)}'],
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

function parseQuotedItems(source) {
  return Array.from(source.matchAll(/['"]([^'"]+)['"]/g), (match) => match[1]);
}

function parseAppRoutes(source) {
  const routesBlock = source.match(/APP_ROUTES\s*=\s*\{([\s\S]*?)\}\s*as const/);
  assert.ok(routesBlock, 'APP_ROUTES block is missing');

  return Object.fromEntries(
    Array.from(routesBlock[1].matchAll(/([A-Za-z0-9_]+):\s*'([^']+)'/g), (match) => [match[1], match[2]]),
  );
}

function parseRegisteredPages(source) {
  const topPagesBlock = source.match(/pages:\s*\[([\s\S]*?)\]/);
  assert.ok(topPagesBlock, 'top-level pages block is missing');

  const pages = parseQuotedItems(topPagesBlock[1]);
  const subpackageMatcher = /root:\s*'([^']+)'[\s\S]*?pages:\s*\[([\s\S]*?)\]/g;
  for (const match of source.matchAll(subpackageMatcher)) {
    const root = match[1];
    for (const page of parseQuotedItems(match[2])) {
      pages.push(`${root}/${page}`);
    }
  }

  return pages;
}

function parseTabBarPages(source) {
  const tabBarBlock = source.match(/tabBar:\s*\{([\s\S]*?)\n\s*\}/);
  if (!tabBarBlock) {
    return [];
  }
  return Array.from(tabBarBlock[1].matchAll(/pagePath:\s*['"]([^'"]+)['"]/g), (match) => match[1]);
}

function normalizeRoute(routePath) {
  return routePath.replace(/^\//, '');
}

function sourcePathForPage(pagePath) {
  const absoluteBase = path.join(projectRoot, 'src', pagePath);
  return {
    component: `${absoluteBase}.tsx`,
    config: `${absoluteBase}.config.ts`,
  };
}

function assertSameSet(actual, expected, label) {
  assert.deepEqual([...actual].sort(), [...expected].sort(), `${label} drifted`);
}

function findLine(source, offset) {
  return source.slice(0, offset).split('\n').length;
}

function assertContainsAll(source, snippets, label) {
  for (const snippet of snippets) {
    assert.ok(source.includes(snippet), `${label} missing snippet: ${snippet}`);
  }
}

function inspectSwitchTabUsage(relativePath, source, routes, tabBarPages) {
  const tabBarSet = new Set(tabBarPages);
  const matches = Array.from(source.matchAll(/Taro\.switchTab\s*\(\s*\{\s*url:\s*([^}\n]+?)\s*\}/g));

  for (const match of matches) {
    const expression = match[1].trim();
    const routeKey = expression.match(/APP_ROUTES\.([A-Za-z0-9_]+)/)?.[1];
    assert.ok(routeKey, `${relativePath}:${findLine(source, match.index || 0)} switchTab target must use APP_ROUTES`);
    assert.ok(routes[routeKey], `${relativePath}:${findLine(source, match.index || 0)} switchTab target unknown route: ${routeKey}`);
    assert.ok(
      tabBarSet.has(normalizeRoute(routes[routeKey])),
      `${relativePath}:${findLine(source, match.index || 0)} switchTab target is not registered in tabBar: ${routeKey}`,
    );
  }

  return matches.length;
}

function assertNoBareProtectedRoute(relativePath, source) {
  const protectedKeys = new Set(routeQueryRequirements.map((item) => item.routeKey));
  const matches = Array.from(source.matchAll(/url:\s*APP_ROUTES\.([A-Za-z0-9_]+)\b/g));

  for (const match of matches) {
    const routeKey = match[1];
    assert.ok(
      !protectedKeys.has(routeKey),
      `${relativePath}:${findLine(source, match.index || 0)} must include query params when navigating to ${routeKey}`,
    );
  }
}

const constantsSource = await readText('src/app/app.constants.ts');
const appConfigSource = await readText('src/app/app.config.ts');
const routes = parseAppRoutes(constantsSource);
const registeredPages = parseRegisteredPages(appConfigSource);
const tabBarPages = parseTabBarPages(appConfigSource);

assert.deepEqual(Object.keys(routes), expectedRouteKeys, 'APP_ROUTES order/keys drifted');
assertSameSet(Object.values(routes).map(normalizeRoute), registeredPages, 'APP_ROUTES and app.config registered pages');

for (const pagePath of registeredPages) {
  const sourcePath = sourcePathForPage(pagePath);
  assert.ok(fs.existsSync(sourcePath.component), `registered page missing component: ${path.relative(projectRoot, sourcePath.component)}`);
  assert.ok(fs.existsSync(sourcePath.config), `registered page missing config: ${path.relative(projectRoot, sourcePath.config)}`);
}

const sourceFiles = (await collectFiles(path.join(projectRoot, 'src')))
  .filter((filePath) => /\.(?:ts|tsx)$/.test(filePath));

let routeReferenceCount = 0;
let switchTabUsageCount = 0;
for (const filePath of sourceFiles) {
  const relativePath = path.relative(projectRoot, filePath).replaceAll(path.sep, '/');
  const source = await fsp.readFile(filePath, 'utf8');
  const references = Array.from(source.matchAll(/APP_ROUTES\.([A-Za-z0-9_]+)/g));
  routeReferenceCount += references.length;

  for (const reference of references) {
    assert.ok(routes[reference[1]], `${relativePath}:${findLine(source, reference.index || 0)} references unknown APP_ROUTES.${reference[1]}`);
  }

  switchTabUsageCount += inspectSwitchTabUsage(relativePath, source, routes, tabBarPages);
  assertNoBareProtectedRoute(relativePath, source);
}

for (const requirement of routeQueryRequirements) {
  assert.ok(routes[requirement.routeKey], `query requirement references unknown route: ${requirement.routeKey}`);
  for (const param of requirement.params) {
    assert.ok(['elderId', 'sessionId'].includes(param), `unsupported protected query param: ${param}`);
  }
}

for (const contract of contractSnippets) {
  const source = await readText(contract.file);
  assertContainsAll(source, contract.snippets, contract.label);
}

const devtoolsConditions = JSON.parse(await readText('project.config.json')).condition?.miniprogram?.list || [];
for (const condition of devtoolsConditions) {
  assert.ok(registeredPages.includes(condition.path), `DevTools condition points to unregistered page: ${condition.name}`);
  const matchingRequirement = routeQueryRequirements.find((item) => normalizeRoute(routes[item.routeKey]) === condition.path);
  if (matchingRequirement) {
    for (const param of matchingRequirement.params) {
      assert.match(String(condition.query || ''), new RegExp(`${param}=`), `DevTools condition ${condition.name} must include ${param}`);
    }
  }
}

console.log('route contract checks passed');
console.log(`routeConstants: ${Object.keys(routes).length}`);
console.log(`registeredPages: ${registeredPages.length}`);
console.log(`sourceRouteReferences: ${routeReferenceCount}`);
console.log(`queryContracts: ${routeQueryRequirements.length}`);
console.log(`navigationContracts: ${contractSnippets.length}`);
console.log(`switchTabUsages: ${switchTabUsageCount}`);
