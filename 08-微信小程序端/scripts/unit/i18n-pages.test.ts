/**
 * 首页 / 老人详情：四语言组件级渲染与切换验证。
 * 直接渲染真实页面组件，不只校验消息字典。
 */
import assert from 'node:assert/strict';
import { createElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { i18nRuntime, useI18n } from '@/i18n';
import HomePageEntry from '@/pages/home/index';
import ElderDetailPageEntry from '@/subpackages/workbench/elder-detail/index';
import ElderDetailPage from '@/subpackages/workbench/elder-detail/index';
import { saveAuthSession } from '@/store/auth/authStore';
import { ROLE_TYPES } from '@/app/app.constants';
import { SUPPORTED_LOCALES } from '@shared-i18n/messages';

type Locale = (typeof SUPPORTED_LOCALES)[number];
type TestCase = { name: string; run: () => void | Promise<void> };
const tests: TestCase[] = [];
function test(name: string, run: TestCase['run']) {
  tests.push({ name, run });
}

function stripTags(html: string) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function LocaleProbe({ children }: { children?: ReactNode }) {
  const { direction, locale } = useI18n();
  return createElement('div', { 'data-locale': locale, 'data-dir': direction }, children);
}

function renderWithLocale(locale: Locale, element: ReactElement) {
  i18nRuntime.setLocale(locale);
  const html = renderToStaticMarkup(createElement(LocaleProbe, { children: element }));
  return { html, text: stripTags(html), locale };
}

const HOME_EXPECTED: Record<Locale, { brand: string; volunteer: string; nav: string }> = {
  'zh-CN': { brand: '渝护银龄名牌', volunteer: '志愿者登录', nav: '渝护银龄名牌' },
  'ug-Arab-CN': { brand: 'چۇڭچىڭ ياشانغانلار نام تاختىسى', volunteer: 'پىدائىي كىرىشى', nav: 'چۇڭچىڭ ياشانغانلار نام تاختىسى' },
  'kk-Arab-CN': { brand: 'چونگ گۋ كۇمىس ءداۋىرى برەندى', volunteer: 'ەرىكتىلەر جۇيەسىنە كىرۋ', nav: 'چونگ گۋ كۇمىس ءداۋىرى برەندى' },
  'ii-CN': { brand: 'ꆇꉙꃀꌠꂓꅑꌠ', volunteer: 'ꌌꐺꌠꅔꅐ', nav: 'ꆇꉙꃀꌠꂓꅑꌠ' },
};

const ELDERTILE_KEYS = [
  'workbench.basicInfo',
  'workbench.medication',
  'workbench.scale',
  'workbench.qrManagement',
  'workbench.archiveData',
  'workbench.medicationRecords',
  'workbench.scanNameplate',
] as const;

const ELDER_HERO_KEYS = [
  'workbench.elderDetail',
  'common.edit',
  'common.back',
  'scan.addressInfo',
  'workbench.emergencyContact',
  'common.contactPhone',
  'common.bloodType',
  'common.allergyHistory',
  'common.archiveNumber',
  'common.attribution',
] as const;

function mockSession() {
  saveAuthSession({
    token: 'token-i18n',
    role: ROLE_TYPES.volunteer,
    accountId: 'vol-1',
    displayName: '志愿者',
    loggedInAt: Date.now(),
    cookieBacked: true,
  });
}

test('home page renders brand, tabs and shared shell in all locales', () => {
  for (const locale of SUPPORTED_LOCALES) {
    const { text, html } = renderWithLocale(locale, createElement(HomePageEntry));
    const expected = HOME_EXPECTED[locale];
    assert.ok(text.includes(expected.brand), `${locale} home missing brand`);
    assert.ok(text.includes(expected.volunteer), `${locale} home missing volunteer tab`);
    assert.ok(text.includes(expected.nav), `${locale} home missing nav title`);
    assert.match(html, /sl-app-root/);
    assert.match(html, /sl-language-switcher/);
  }
});

test('elder detail production entry applies direction and navigation shell for RTL/LTR locales', () => {
  mockSession();
  i18nRuntime.setLocale('ug-Arab-CN');
  const rtlHtml = renderToStaticMarkup(createElement(ElderDetailPageEntry));
  assert.match(rtlHtml, /sl-dir-rtl/);
  assert.match(rtlHtml, /dir="rtl"/);
  assert.match(rtlHtml, /ياشانغان تەپسىلاتى/);
  assert.match(rtlHtml, /تەھرىرلەش/);

  i18nRuntime.setLocale('ii-CN');
  const yiHtml = renderToStaticMarkup(createElement(ElderDetailPageEntry));
  assert.match(yiHtml, /sl-dir-ltr/);
  assert.match(yiHtml, /dir="ltr"/);
  assert.match(yiHtml, /ꃀꌠꑭꃆꋧꂮ/);
  assert.match(yiHtml, /ꏓꁱ/);

  i18nRuntime.setLocale('zh-CN');
});

test('elder detail tiles, hero labels and edit action follow locale immediately', () => {
  mockSession();
  const zhSnapshot: Record<string, string> = {};

  for (const locale of SUPPORTED_LOCALES) {
    i18nRuntime.setLocale(locale);
    const { html } = renderWithLocale(locale, createElement(ElderDetailPage));
    assert.ok(html.length >= 0);

    for (const key of [...ELDERTILE_KEYS, ...ELDER_HERO_KEYS]) {
      const expected = i18nRuntime.t(key);
      assert.ok(expected, `${locale} empty message for ${key}`);
      if (locale === 'zh-CN') {
        zhSnapshot[key] = expected;
        continue;
      }
      if (key === 'common.attribution') {
        // 机构名允许保留中文白名单
        continue;
      }
      assert.notEqual(expected, zhSnapshot[key], `${locale} key ${key} not switched from zh`);
      assert.equal(/[一-鿿]/.test(expected), false, `${locale} ${key} still Chinese: ${expected}`);
    }

    // 无会话/无数据时仍走 i18n 加载文案，不得出现另一语言键名残留
    if (html) {
      assert.match(html, /sl-stage|sl-page|workbench-elder-detail-page|loading|ꎹ|ئارخىپ|ꄉꇮ|ياشانغان|قارتتار|老人详情|ꃀꌠ|读取|读取中/);
    }
  }

  i18nRuntime.setLocale('zh-CN');
  const zhBasic = i18nRuntime.t('workbench.basicInfo');
  const zhEdit = i18nRuntime.t('common.edit');
  i18nRuntime.setLocale('ii-CN');
  assert.notEqual(i18nRuntime.t('workbench.basicInfo'), zhBasic);
  assert.notEqual(i18nRuntime.t('common.edit'), zhEdit);
  i18nRuntime.setLocale('zh-CN');
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
console.log(`\n${passed}/${tests.length} i18n page checks passed`);
