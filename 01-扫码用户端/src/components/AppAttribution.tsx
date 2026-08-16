import { useI18n } from '../i18n';

export function AppAttribution() {
  const { t } = useI18n();
  return <div className="sl-attribution">{t('common.attribution')}</div>;
}
