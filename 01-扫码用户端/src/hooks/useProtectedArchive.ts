import { useEffect, useState } from 'react';
import { DEV_FIXED_SMS_CODE } from '../config/env';
import { fetchHealthRecord, fetchMedications, fetchScaleSummaries, fetchVerifiedBasicInfo } from '../api/scanApi';
import { getDesignPreviewArchive, getDesignPreviewBasicInfo } from '../dev/designPreview';
import type { ElderBasicInfo, HealthRecord, Medication, ScaleSummary } from '../types';

export function useProtectedArchive(verified: boolean, sessionId: string) {
  const [verifiedBasicInfo, setVerifiedBasicInfo] = useState<ElderBasicInfo | null>(null);
  const [healthRecord, setHealthRecord] = useState<HealthRecord | null>(null);
  const [medications, setMedications] = useState<Medication[] | null>(null);
  const [scaleSummaries, setScaleSummaries] = useState<ScaleSummary[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!verified || !sessionId) {
      setVerifiedBasicInfo(null);
      setHealthRecord(null);
      setMedications(null);
      setScaleSummaries(null);
      setLoading(false);
      return;
    }

    if (DEV_FIXED_SMS_CODE && (sessionId.startsWith('local-relay-') || sessionId.startsWith('local-identity-'))) {
      setVerifiedBasicInfo(getDesignPreviewBasicInfo());
      const previewArchive = getDesignPreviewArchive();
      setHealthRecord(previewArchive.healthRecord);
      setMedications(previewArchive.medications);
      setScaleSummaries(previewArchive.scaleSummaries);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      fetchVerifiedBasicInfo(sessionId),
      fetchHealthRecord(sessionId),
      fetchMedications(sessionId),
      fetchScaleSummaries(sessionId),
    ])
      .then(([basic, h, m, s]) => {
        setVerifiedBasicInfo(basic);
        setHealthRecord(h);
        setMedications(m);
        setScaleSummaries(s);
      })
      .finally(() => setLoading(false));
  }, [sessionId, verified]);

  return { verifiedBasicInfo, healthRecord, medications, scaleSummaries, loading };
}
