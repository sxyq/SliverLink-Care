import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sharedRoot = path.resolve(projectRoot, '../shared/i18n');
const outdir = path.join(projectRoot, '.local/i18n-previews');
const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';

await fsp.rm(outdir, { recursive: true, force: true });
await fsp.mkdir(outdir, { recursive: true });

const { build } = await import('esbuild');
const messagesOut = path.join(outdir, `messages-${Date.now()}.mjs`);
await build({
  entryPoints: [path.join(sharedRoot, 'messages.ts')],
  outfile: messagesOut,
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  logLevel: 'silent',
});
const { messages, LOCALE_META, SUPPORTED_LOCALES } = await import(pathToFileURL(messagesOut).href);

function t(locale, key, params) {
  let value = key.split('.').reduce((current, part) => (current && typeof current === 'object' ? current[part] : undefined), messages[locale]);
  if (typeof value !== 'string') value = key;
  if (params) value = value.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`));
  return value;
}

const elder = {
  name: '王重碧',
  archiveNo: 'A1784358850441',
  age: 79,
  genderKey: 'common.female',
  residence: '重庆市沙坪坝区',
  contact: '刘主谋',
  relation: '夫妻',
  phone: '13668025130',
};

function pageShell(locale, title, body) {
  const direction = LOCALE_META[locale].direction;
  const langLabel = LOCALE_META[locale].label;
  return `<!doctype html>
<html lang="${locale}" dir="${direction}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title} · ${locale}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "PingFang SC", "Noto Sans Yi", "Noto Sans Arabic", "Microsoft YaHei", sans-serif;
    background: #e8eef1;
    color: #16313a;
  }
  .phone {
    width: 430px;
    margin: 16px auto;
    background: #f4f7f8;
    border-radius: 28px;
    overflow: hidden;
    box-shadow: 0 12px 40px rgba(16, 49, 58, 0.18);
    min-height: 900px;
  }
  .bar {
    background: linear-gradient(135deg, #0f7b86, #1aa6a0);
    color: #fff;
    padding: 28px 20px 22px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .bar h1 { margin: 0; font-size: 22px; font-weight: 700; text-align: center; flex: 1; }
  .pill {
    border: 1px solid rgba(255,255,255,0.45);
    background: rgba(255,255,255,0.12);
    color: #fff;
    border-radius: 999px;
    padding: 8px 12px;
    font-size: 14px;
  }
  .content { padding: 16px; }
  .card {
    background: #fff;
    border-radius: 16px;
    padding: 16px;
    margin-bottom: 12px;
    box-shadow: 0 4px 14px rgba(15, 55, 65, 0.06);
  }
  .hero {
    background: linear-gradient(160deg, #0f7b86, #1d9c98);
    color: #fff;
    border-radius: 18px;
    padding: 18px;
    margin-bottom: 14px;
  }
  .hero h2 { margin: 0 0 8px; font-size: 28px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
  .cell {
    background: rgba(255,255,255,0.14);
    border-radius: 12px;
    padding: 12px;
    min-height: 78px;
  }
  .label { opacity: 0.85; font-size: 13px; margin-bottom: 6px; }
  .value { font-size: 16px; font-weight: 600; word-break: break-word; }
  .ltr { direction: ltr; unicode-bidi: isolate; text-align: start; }
  .tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .tile {
    background: #fff;
    border-radius: 16px;
    padding: 16px;
    min-height: 96px;
    box-shadow: 0 4px 14px rgba(15, 55, 65, 0.06);
  }
  .tile h3 { margin: 0 0 8px; font-size: 18px; color: #0f5f68; }
  .tile p { margin: 0; color: #6a858c; font-size: 13px; }
  .footer { text-align: center; color: #7b969c; font-size: 12px; padding: 8px 0 20px; }
  .field-label { font-size: 14px; color: #3d5d64; margin-bottom: 6px; }
  .field-input {
    border: 1px solid #d5e2e5;
    border-radius: 12px;
    padding: 12px 14px;
    margin-bottom: 12px;
    background: #fff;
    color: #8aa0a6;
    direction: ltr;
    text-align: start;
  }
  .btn {
    display: block;
    width: 100%;
    border: 0;
    border-radius: 999px;
    padding: 14px;
    background: #0f7b86;
    color: #fff;
    font-size: 16px;
    margin-top: 8px;
  }
  .tabs { display: flex; gap: 8px; margin-bottom: 12px; }
  .tab {
    flex: 1;
    text-align: center;
    padding: 10px;
    border-radius: 999px;
    background: #e7f2f3;
    color: #0f5f68;
    font-weight: 600;
  }
</style>
</head>
<body>
  <div class="phone">
    ${body}
    <div class="footer">${t(locale, 'common.attribution')}</div>
  </div>
</body>
</html>`;
}

function homeHtml(locale) {
  const body = `
  <div class="bar">
    <span class="pill">${t(locale, 'common.switchTo')}${LOCALE_META[locale].label}</span>
    <h1>${t(locale, 'common.brandTitle')}</h1>
    <span class="pill">${LOCALE_META[locale].label}</span>
  </div>
  <div class="content">
    <div class="card">
      <div style="font-size:28px;font-weight:800;margin-bottom:6px;">SL</div>
      <div style="font-size:24px;font-weight:800;color:#0f5f68;">${t(locale, 'common.brandTitle')}</div>
      <div style="color:#6a858c;margin-top:6px;">${t(locale, 'common.brandSubtitle')}</div>
    </div>
    <div class="tabs">
      <div class="tab">${t(locale, 'auth.volunteerLogin')}</div>
      <div class="tab">${t(locale, 'auth.invitationRegister')}</div>
    </div>
    <div class="card">
      <div class="field-label">${t(locale, 'common.account')}</div>
      <div class="field-input">${t(locale, 'auth.inputAccount')}</div>
      <div class="field-label">${t(locale, 'common.password')}</div>
      <div class="field-input">${t(locale, 'auth.inputLoginPassword')}</div>
      <button class="btn">${t(locale, 'auth.login')}</button>
    </div>
    <div class="card" style="display:flex;gap:12px;align-items:center;">
      <div style="width:42px;height:42px;border-radius:12px;background:#0f7b86;color:#fff;display:flex;align-items:center;justify-content:center;">▣</div>
      <div>
        <div style="font-weight:700;">${t(locale, 'auth.scanView')}</div>
        <div style="color:#6a858c;font-size:13px;">${t(locale, 'auth.scanElderInfo')}</div>
      </div>
    </div>
  </div>`;
  return pageShell(locale, t(locale, 'common.brandTitle'), body);
}

function elderDetailHtml(locale) {
  const male = t(locale, 'common.female');
  const years = t(locale, 'common.yearsOld', { age: elder.age });
  const body = `
  <div class="bar">
    <span class="pill">←</span>
    <h1>${t(locale, 'workbench.elderDetail')}</h1>
    <span class="pill">✎ ${t(locale, 'common.edit')}</span>
  </div>
  <div class="content">
    <div class="hero">
      <h2>${elder.name}</h2>
      <div><span>${t(locale, 'common.archiveNumber')}</span> <span class="ltr">${elder.archiveNo}</span> <span>${male}</span> <span>${years}</span></div>
      <div class="grid">
        <div class="cell">
          <div class="label">${t(locale, 'scan.addressInfo')}</div>
          <div class="value">${elder.residence}</div>
        </div>
        <div class="cell">
          <div class="label">${t(locale, 'workbench.emergencyContact')}（${t(locale, 'common.relationship')}）</div>
          <div class="value">${elder.contact}（${elder.relation}）</div>
        </div>
        <div class="cell">
          <div class="label">${t(locale, 'common.contactPhone')}</div>
          <div class="value ltr">${elder.phone}</div>
        </div>
        <div class="cell">
          <div class="label">${t(locale, 'common.bloodType')} / ${t(locale, 'common.allergyHistory')}</div>
          <div class="value">-</div>
        </div>
      </div>
    </div>
    <div class="tiles">
      <div class="tile"><h3>${t(locale, 'workbench.basicInfo')}</h3><p>${t(locale, 'workbench.archiveData')}</p></div>
      <div class="tile"><h3>${t(locale, 'workbench.medication')}</h3><p>${t(locale, 'workbench.medicationRecords')}</p></div>
      <div class="tile"><h3>${t(locale, 'workbench.scale')}</h3><p>PHQ / GAD / UCLA</p></div>
      <div class="tile"><h3>${t(locale, 'workbench.qrManagement')}</h3><p>${t(locale, 'workbench.scanNameplate')}</p></div>
    </div>
  </div>`;
  return pageShell(locale, t(locale, 'workbench.elderDetail'), body);
}

const pages = [];
for (const locale of SUPPORTED_LOCALES) {
  const homePath = path.join(outdir, `home-${locale}.html`);
  const detailPath = path.join(outdir, `elder-detail-${locale}.html`);
  await fsp.writeFile(homePath, homeHtml(locale), 'utf8');
  await fsp.writeFile(detailPath, elderDetailHtml(locale), 'utf8');
  pages.push({ locale, page: 'home', file: homePath });
  pages.push({ locale, page: 'elder-detail', file: detailPath });
}

const shots = [];
for (const item of pages) {
  const png = path.join(outdir, `${item.page}-${item.locale}.png`);
  await execFileAsync(EDGE, [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--window-size=520,1000',
    `--screenshot=${png}`,
    `file://${item.file}`,
  ], { timeout: 60000 });
  const stat = await fsp.stat(png);
  assert.ok(stat.size > 5000, `screenshot too small: ${png}`);
  shots.push({ ...item, png, bytes: stat.size });
}

console.log('preview screenshots:');
for (const shot of shots) {
  console.log(`- ${shot.locale} ${shot.page}: ${path.relative(projectRoot, shot.png)} (${shot.bytes} bytes)`);
}
console.log('done');
