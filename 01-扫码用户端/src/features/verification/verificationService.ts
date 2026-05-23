import {
  confirmRelayVerificationSent,
  getRelayVerificationStatus,
  startRelayVerification,
} from '../../api/smsApi';
import { reportAudit } from '../../api/auditApi';
import type { SmsRelayVerificationSession, SmsRelayVerificationStatus } from '../../types/verification';

export interface VerificationService {
  startSession(target: string): Promise<SmsRelayVerificationSession>;
  confirmSent(sessionId: string): Promise<void>;
  checkStatus(sessionId: string, scope?: string): Promise<SmsRelayVerificationStatus>;
}

export function createVerificationService(): VerificationService {
  return {
    async startSession(target: string): Promise<SmsRelayVerificationSession> {
      const result = await startRelayVerification(target);
      reportAudit({ action: 'sms_relay_start', target: result.receiverPhoneMasked || result.receiverPhone }).catch(() => {});
      return result;
    },

    async confirmSent(sessionId: string): Promise<void> {
      await confirmRelayVerificationSent(sessionId);
      reportAudit({ action: 'sms_relay_open' }).catch(() => {});
    },

    async checkStatus(sessionId: string, scope?: string): Promise<SmsRelayVerificationStatus> {
      const result = await getRelayVerificationStatus(sessionId);
      reportAudit({
        action: result.verified ? 'sms_relay_verify_success' : 'sms_relay_verify_pending',
        detail: scope || 'health',
      }).catch(() => {});
      return result;
    },
  };
}
