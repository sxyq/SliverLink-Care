/**
 * 日志导出 CSV 逻辑
 */

import { exportToCsv } from '../../utils/exportCsv';
import type { AuditLog } from '../../types';

export function exportAuditLogs(rows: AuditLog[], filename?: string) {
  const data = rows.map((log) => ({
    操作时间: log.time,
    操作人: log.operator,
    操作类型: log.action,
    操作对象: log.target,
    来源IP: log.ip,
    结果: log.result,
  }));

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  exportToCsv(filename || `audit-logs-${dateStr}.csv`, data);
}
