import { AlertTriangle } from 'lucide-react';
import { useI18n } from '../i18n';

type NotFoundPageVariant = 'missing-token' | 'invalid-qr';

interface NotFoundPageProps {
  variant?: NotFoundPageVariant;
}

const pageCopy: Record<NotFoundPageVariant, { titleKey: string; descriptionKey?: string; hintKey: string }> = {
  'missing-token': {
    titleKey: 'errors.scanQr',
    hintKey: 'errors.scanAgainFromCamera',
  },
  'invalid-qr': {
    titleKey: 'errors.qrExpired',
    descriptionKey: 'errors.qrInvalidDescription',
    hintKey: 'errors.qrInvalidHint',
  },
};

export function NotFoundPage({ variant = 'invalid-qr' }: NotFoundPageProps) {
  const copy = pageCopy[variant];
  const { t } = useI18n();

  return (
    <div className="sl-page center">
      <div className="sl-empty">
        <AlertTriangle size={48} />
        <h2>{t(copy.titleKey)}</h2>
        {copy.descriptionKey ? <p>{t(copy.descriptionKey)}</p> : null}
        <p>{t(copy.hintKey)}</p>
      </div>
    </div>
  );
}
