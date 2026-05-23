export type VerificationState = 'none' | 'pending' | 'verified';

export interface SmsRelayVerificationSession {
  sessionId: string;
  receiverPhone: string;
  receiverPhoneMasked: string;
  messageBody: string;
  messagePrefix: string;
  status: 'PENDING' | 'VERIFIED' | 'EXPIRED';
  expiresAt?: string;
  localDev?: boolean;
}

export interface SmsRelayVerificationStatus {
  sessionId: string;
  status: 'PENDING' | 'VERIFIED' | 'EXPIRED';
  verified: boolean;
  verifiedAt?: string;
  senderPhoneMasked?: string;
  localDev?: boolean;
}
