import type { ElderInfo } from '../types';
import { User } from 'lucide-react';

interface ElderCardProps {
  elder: ElderInfo;
  onClick?: (elder: ElderInfo) => void;
}

function maskArchiveNo(no: string): string {
  if (no.length <= 8) return no;
  return no.slice(0, 5) + '****' + no.slice(-3);
}

export default function ElderCard({ elder, onClick }: ElderCardProps) {
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
            {elder.name}
          </div>
          <div style={{ fontSize: 13, color: 'var(--sl-text-secondary)', marginTop: 4 }}>
            {elder.gender} · {elder.age}岁 · {maskArchiveNo(elder.archiveNo)}
          </div>
        </div>
      </div>
    </div>
  );
}
