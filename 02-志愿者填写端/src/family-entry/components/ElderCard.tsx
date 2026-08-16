import type { ElderInfo } from '../types';
import { User } from 'lucide-react';
import { useI18n } from '../../i18n';

interface ElderCardProps {
  elder: ElderInfo;
  onClick?: (elder: ElderInfo) => void;
}

function maskArchiveNo(no: string): string {
  if (no.length <= 8) return no;
  return no.slice(0, 5) + '****' + no.slice(-3);
}

export default function ElderCard({ elder, onClick }: ElderCardProps) {
  const { t } = useI18n();
  return (
    <div
      className="card card-clickable"
      onClick={() => onClick?.(elder)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'var(--sl-chip-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <User size={22} color="var(--sl-primary)" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--sl-text)' }}>
            <span className="sl-auto-data" dir="auto">{elder.name}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--sl-text-secondary)', marginTop: 4 }}>
            {elder.gender === '男' ? t('common.male') : elder.gender === '女' ? t('common.female') : elder.gender} · {t('common.yearsOld', { age: elder.age })} · <span className="sl-ltr-data">{maskArchiveNo(elder.archiveNo)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
