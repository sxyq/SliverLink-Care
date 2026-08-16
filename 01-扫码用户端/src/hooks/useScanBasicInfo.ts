import { useEffect, useState } from 'react';
import { clearResolvedScanContext, fetchBasicInfo } from '../api/scanApi';
import { i18nRuntime } from '../i18n';
import type { ElderBasicInfo } from '../types';

export function useScanBasicInfo(qrToken: string | null) {
  const [data, setData] = useState<ElderBasicInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!qrToken) {
      clearResolvedScanContext();
      setData(null);
      setLoading(false);
      setError(i18nRuntime.t('errors.qrTokenMissing'));
      return;
    }
    setData(null);
    setError(null);
    setLoading(true);
    fetchBasicInfo(qrToken)
      .then(setData)
      .catch(() => setError(i18nRuntime.t('errors.qrInvalidOrExpired')))
      .finally(() => setLoading(false));
  }, [qrToken]);

  return { data, loading, error };
}
