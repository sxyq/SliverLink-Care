import { i18nRuntime } from '@/i18n';

export function formatDateLabel(value?: string) {
  if (!value) {
    return i18nRuntime.t('common.noRecords');
  }

  if (value.length >= 10) {
    return value.slice(0, 10);
  }

  return value;
}

export function formatDateTimeLabel(value?: string) {
  if (!value) {
    return i18nRuntime.t('common.noRecords');
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

export function formatPhoneLabel(value?: string) {
  if (!value) {
    return i18nRuntime.t('common.unfilled');
  }

  const normalized = value.replace(/\s+/g, '');
  if (/^1\d{10}$/.test(normalized)) {
    return `${normalized.slice(0, 3)} ${normalized.slice(3, 7)} ${normalized.slice(7)}`;
  }

  return value;
}

export function formatArchiveNoLabel(value?: string) {
  return value || i18nRuntime.t('common.unassigned');
}

export function formatAgeLabel(value?: string | number) {
  if (value == null || value === '' || Number(value) <= 0) {
    return i18nRuntime.t('common.unfilled');
  }

  return i18nRuntime.t('common.yearsOld', { age: Number(value) });
}

export function formatScoreLabel(value?: string | number) {
  if (value == null || value === '') {
    return i18nRuntime.t('common.unrated');
  }

  return `${Number(value)} ${i18nRuntime.t('common.points')}`;
}
