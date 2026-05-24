export type VerificationState = 'none' | 'pending' | 'verified';

export interface SmsVerificationSession {
  sessionId: string;
  receiverPhone: string;
  receiverPhoneMasked: string;
  messageBody?: string;
  messagePrefix?: string;
  status: 'PENDING' | 'VERIFIED' | 'EXPIRED';
  expiresAt?: string;
  localDev?: boolean;
}

export interface SmsVerificationStatus {
  sessionId: string;
  status: 'PENDING' | 'VERIFIED' | 'EXPIRED';
  verified: boolean;
  verifiedAt?: string;
  senderPhoneMasked?: string;
  localDev?: boolean;
}

export interface IdentityVerificationPayload {
  name: string;
  phone: string;
  idCard: string;
}
