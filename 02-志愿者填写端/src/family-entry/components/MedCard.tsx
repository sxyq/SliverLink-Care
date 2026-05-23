import type { Medication } from '../types';
import { Pill, Edit2, Trash2 } from 'lucide-react';

interface MedCardProps {
  medication: Medication;
  onEdit?: (med: Medication) => void;
  onDelete?: (med: Medication) => void;
}

export default function MedCard({ medication, onEdit, onDelete }: MedCardProps) {
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: '#E8F4F6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Pill size={18} color="var(--sl-primary)" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--sl-text)' }}>
              {medication.name}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              {onEdit && (
                <button
                  onClick={() => onEdit(medication)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--sl-primary)' }}
                >
                  <Edit2 size={15} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(medication)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--sl-danger)' }}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--sl-text-secondary)', marginTop: 4 }}>
            剂量：{medication.dosage} · 用法：{medication.usage}
          </div>
          <div style={{ fontSize: 13, color: 'var(--sl-text-secondary)', marginTop: 2 }}>
            时间：{medication.timing}
          </div>
          <div style={{ fontSize: 12, color: 'var(--sl-text-secondary)', marginTop: 4 }}>
            更新于 {medication.updatedAt}
          </div>
        </div>
      </div>
    </div>
  );
}
