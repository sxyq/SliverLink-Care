import { useEffect, useState } from 'react';
import { fetchHealthRecord, fetchMedications, fetchScaleSummaries } from '../api/scanApi';
import type { HealthRecord, Medication, ScaleSummary } from '../types';

export function useProtectedArchive(verified: boolean) {
  const [healthRecord, setHealthRecord] = useState<HealthRecord | null>(null);
  const [medications, setMedications] = useState<Medication[] | null>(null);
  const [scaleSummaries, setScaleSummaries] = useState<ScaleSummary[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!verified) return;
    setLoading(true);
    Promise.all([fetchHealthRecord(), fetchMedications(), fetchScaleSummaries()])
      .then(([h, m, s]) => {
        setHealthRecord(h);
        setMedications(m);
        setScaleSummaries(s);
      })
      .finally(() => setLoading(false));
  }, [verified]);

  return { healthRecord, medications, scaleSummaries, loading };
}
