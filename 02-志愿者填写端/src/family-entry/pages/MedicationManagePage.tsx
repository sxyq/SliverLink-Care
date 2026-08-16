import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MedicationEditorPage } from '@shared/MedicationEditorPage';
import type { CareMedicationRecord } from '@shared/types';
import { addMedication, deleteMedication, getMedications, updateMedication } from '../api/medicationApi';
import type { Medication } from '../types';
import { useI18n } from '../../i18n';

export default function MedicationManagePage() {
  const { elderId } = useParams<{ elderId: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMedications = () => {
    if (!elderId) {
      setMedications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getMedications(elderId)
      .then(setMedications)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMedications();
  }, [elderId]);

  const items = useMemo<CareMedicationRecord[]>(
    () =>
      medications.map((item) => ({
        id: item.id,
        name: item.name,
        dosage: item.dosage,
        usage: item.usage,
        timing: item.timing,
        updatedAt: item.updatedAt,
      })),
    [medications],
  );

  return (
    <div className="page-container">
      <MedicationEditorPage
        title={t('workbench.medicationInfoManage')}
        loading={loading}
        medications={items}
        onBack={() => navigate(-1)}
        onCreate={async (item) => {
          if (!elderId) return;
          await addMedication(elderId, item);
          loadMedications();
        }}
        onUpdate={async (medicationId, item) => {
          if (!elderId) return;
          await updateMedication(elderId, medicationId, item);
          loadMedications();
        }}
        onDelete={async (medicationId) => {
          if (!elderId) return;
          await deleteMedication(elderId, medicationId);
          loadMedications();
        }}
      />
    </div>
  );
}
