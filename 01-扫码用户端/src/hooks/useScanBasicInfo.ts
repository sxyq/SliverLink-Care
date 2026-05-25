import { useEffect, useState } from 'react';
import { clearResolvedScanContext, fetchBasicInfo } from '../api/scanApi';
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
      setError('二维码参数缺失');
      return;
    }
    setData(null);
    setError(null);
    setLoading(true);
    fetchBasicInfo(qrToken)
      .then(setData)
      .catch(() => setError('二维码无效或已过期'))
      .finally(() => setLoading(false));
  }, [qrToken]);

  return { data, loading, error };
}
