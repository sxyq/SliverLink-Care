import { useEffect, useState } from 'react';
import { fetchDashboard } from '../api/adminApi';
import type { DashboardMetric, ElderRow, AuditLog } from '../types';

export function useDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
  const [elders, setElders] = useState<ElderRow[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard().then((data) => {
      setMetrics(data.dashboardMetrics);
      setElders(data.elderRows);
      setLogs(data.auditLogs);
      setLoading(false);
    });
  }, []);

  return { metrics, elders, logs, loading };
}
