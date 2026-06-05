import { useEffect, useState } from 'react';
import { fetchHealthRecord, fetchMedications, fetchScaleSummaries, fetchVerifiedBasicInfo } from '../api/scanApi';
import type { ElderBasicInfo, HealthRecord, Medication, ScaleSummary } from '../types';

export function useProtectedArchive(verified: boolean, sessionId: string, elderId?: string) {
  const [verifiedBasicInfo, setVerifiedBasicInfo] = useState<ElderBasicInfo | null>(null);
  const [healthRecord, setHealthRecord] = useState<HealthRecord | null>(null);
  const [medications, setMedications] = useState<Medication[] | null>(null);
  const [scaleSummaries, setScaleSummaries] = useState<ScaleSummary[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!verified || !sessionId || !elderId) {
      setVerifiedBasicInfo(null);
      setHealthRecord(null);
      setMedications(null);
      setScaleSummaries(null);
      setLoading(false);
      return;
    }

    setVerifiedBasicInfo(null);
    setHealthRecord(null);
    setMedications(null);
    setScaleSummaries(null);

    setLoading(true);
    let cancelled = false;
    Promise.all([
      fetchVerifiedBasicInfo(sessionId, elderId),
      fetchHealthRecord(sessionId, elderId),
      fetchMedications(sessionId, elderId),
      fetchScaleSummaries(sessionId, elderId),
    ])
      .then(([basic, h, m, s]) => {
        if (cancelled) return;
        if (basic.id !== elderId) {
          setVerifiedBasicInfo(null);
          setHealthRecord(null);
          setMedications(null);
          setScaleSummaries(null);
          return;
        }
        setVerifiedBasicInfo(basic);
        setHealthRecord(h);
        setMedications(m);
        setScaleSummaries(s);
      })
      .catch(() => {
        if (cancelled) return;
        setVerifiedBasicInfo(null);
        setHealthRecord(null);
        setMedications(null);
        setScaleSummaries(null);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [elderId, sessionId, verified]);

  return { verifiedBasicInfo, healthRecord, medications, scaleSummaries, loading };
}
