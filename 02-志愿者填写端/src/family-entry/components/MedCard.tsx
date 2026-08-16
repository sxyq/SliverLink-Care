import type { Medication } from '../types';
import { Pill, Edit2, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n';

interface MedCardProps {
  medication: Medication;
  onEdit?: (med: Medication) => void;
  onDelete?: (med: Medication) => void;
}

export default function MedCard({ medication, onEdit, onDelete }: MedCardProps) {
  const { t } = useI18n();
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
            <span className="sl-auto-data" dir="auto" style={{ fontSize: 15, fontWeight: 600, color: 'var(--sl-text)' }}>
              {medication.name}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              {onEdit && (
                  <button
                    type="button"
                    aria-label={t('workbench.editMedication')}
                  onClick={() => onEdit(medication)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--sl-primary)' }}
                >
                  <Edit2 size={15} />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  aria-label={t('workbench.deleteMedication')}
                  onClick={() => onDelete(medication)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--sl-danger)' }}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--sl-text-secondary)', marginTop: 4 }}>
            <span>{t('workbench.dosage')}：</span>
            <span className="sl-ltr-data" dir="ltr">{medication.dosage}</span>
            <span aria-hidden="true"> · </span>
            <span>{t('workbench.usage')}：</span>
            <span className="sl-auto-data" dir="auto">{medication.usage}</span>
          </div>
          <div className="sl-auto-data" dir="auto" style={{ fontSize: 13, color: 'var(--sl-text-secondary)', marginTop: 2 }}>
            {t('workbench.medicationTime')}：{medication.timing}
          </div>
          <div style={{ fontSize: 12, color: 'var(--sl-text-secondary)', marginTop: 4 }}>
            <span>{t('common.updatedAt')} </span>
            <span className="sl-ltr-data" dir="ltr">{medication.updatedAt}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
