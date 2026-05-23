import { ENDPOINTS } from '../config/endpoints';
import { httpClient } from './httpClient';

export interface AuditPayload {
  action: string;
  target?: string;
  detail?: string;
}

export async function reportAudit(payload: AuditPayload): Promise<{ ok: boolean }> {
  return httpClient<{ ok: boolean }>(ENDPOINTS.auditReport, {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      ts: Date.now(),
      ua: navigator.userAgent,
    }),
  });
}
