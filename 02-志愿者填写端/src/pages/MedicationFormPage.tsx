import { useMemo, useState } from 'react';
import { MedicationEditorPage } from '@shared/MedicationEditorPage';
import type { CareMedicationRecord } from '@shared/types';
import { saveMedications } from '../api';
import type { AssignedElder, Medication } from '../types';

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
      title={`${elder.name} 的用药记录`}
      medications={items}
      onBack={onBack}
      saveLabel="提交保存"
      onSaveBatch={async (records) => {
        await saveMedications(elder.id, records);
        alert('用药记录已保存');
        onBack();
      }}
    />
  );
}
