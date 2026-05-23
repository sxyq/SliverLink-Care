import { LockKeyhole, ShieldCheck } from 'lucide-react';

interface VerificationBadgeProps {
  state: 'need' | 'verified';
}

export function VerificationBadge({ state }: VerificationBadgeProps) {
  if (state === 'verified') {
    return (
      <div className="sl-badge verified">
        <ShieldCheck size={16} />
        <span>已通过短信验证</span>
      </div>
    );
  }
  return (
    <div className="sl-badge need">
      <LockKeyhole size={16} />
      <span>需短信验证后查看</span>
    </div>
  );
}
