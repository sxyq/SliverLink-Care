import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { useI18n } from '../i18n';

interface VerificationBadgeProps {
  state: 'need' | 'verified';
}

export function VerificationBadge({ state }: VerificationBadgeProps) {
  const { t } = useI18n();
  if (state === 'verified') {
    return (
      <div className="sl-badge verified">
        <ShieldCheck size={16} />
        <span>{t('verification.passedLabel')}</span>
      </div>
    );
  }
  return (
    <div className="sl-badge need">
      <LockKeyhole size={16} />
      <span>{t('verification.needLabel')}</span>
    </div>
  );
}
