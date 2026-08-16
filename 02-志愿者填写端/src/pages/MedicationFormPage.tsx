import { useMemo, useState } from 'react';
import { MedicationEditorPage } from '@shared/MedicationEditorPage';
import type { CareMedicationRecord } from '@shared/types';
import { saveMedications } from '../api';
import type { AssignedElder, Medication } from '../types';
import { useI18n } from '../i18n';

interface MedicationFormPageProps {
  elder: AssignedElder;
  onBack: () => void;
}

function createSeedMedications(): Medication[] {
  return [
    { id: 'm1', name: '阿司匹林肠溶片', dosage: '100mg', usage: '口服', timing: '每日1次，早餐后' },
    { id: 'm2', name: '硝苯地平缓释片', dosage: '30mg', usage: '口服', timing: '每日1次，早晨' },
    { id: 'm3', name: '二甲双胍片', dosage: '500mg', usage: '口服', timing: '每日2次，早晚餐后' },
  ];
}

export function MedicationFormPage({ elder, onBack }: MedicationFormPageProps) {
  const { t } = useI18n();
  const [medications] = useState<Medication[]>(createSeedMedications());

  const items = useMemo<CareMedicationRecord[]>(
    () =>
      medications.map((item) => ({
        id: item.id,
        name: item.name,
        dosage: item.dosage,
        usage: item.usage,
        timing: item.timing,
      })),
    [medications],
  );

  return (
    <MedicationEditorPage
      title={`${elder.name} ${t('workbench.medicationRecords')}`}
      medications={items}
      onBack={onBack}
      saveLabel={t('workbench.submitSave')}
      onSaveBatch={async (records) => {
        try {
          await saveMedications(elder.id, records);
          alert(t('errors.medicationSaved'));
          onBack();
        } catch (e) {
          alert(t('errors.saveFailed'));
        }
      }}
    />
  );
}
