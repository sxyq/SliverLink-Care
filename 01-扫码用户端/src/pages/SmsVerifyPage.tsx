import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, IdCard, LockKeyhole, MessageSquareShare, Phone, RefreshCw, ShieldCheck, User } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ActionButton } from '../components/ActionButton';
import { BottomTabBar } from '../components/BottomTabBar';
import { PageTopBar } from '../components/PageTopBar';
import { confirmRelayVerificationSent, getRelayVerificationStatus, startRelayVerification, verifyIdentityAccess } from '../api/smsApi';
import { useSecurity } from '../app/SecurityProvider';
import { ALLOW_LOCAL_VERIFICATION_FALLBACK } from '../config/env';
import { useVerificationStore } from '../features/verification/verificationStore';
import { getResolvedElderId } from '../api/scanApi';
import type { IdentityVerificationPayload, SmsVerificationSession } from '../types/verification';
import { useI18n } from '../i18n';

type VerifyMode = 'sms' | 'identity';

function buildSmsLink(phone: string, body: string) {
  const isiOS = /iPhone|iPad|iPod/i.test(window.navigator.userAgent);
  const separator = isiOS ? '&' : '?';
  return `sms:${phone}${separator}body=${encodeURIComponent(body)}`;
}

function normalizeIdentityPhone(phone: string) {
  return phone.replace(/\D/g, '');
}

function normalizeIdCard(idCard: string) {
  return idCard.trim().toUpperCase();
}

function isValidIdCard(idCard: string) {
  if (!/^(\d{15}|\d{17}[0-9X])$/.test(idCard)) {
    return false;
  }

  if (idCard.length === 15) {
    return true;
  }

  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checksums = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  let total = 0;

  for (let i = 0; i < 17; i += 1) {
    total += Number(idCard[i]) * weights[i];
  }

  return checksums[total % 11] === idCard[17];
}

function buildIdentityError(form: IdentityVerificationPayload, translate: (key: string) => string) {
  const name = form.name.trim();
  const phone = normalizeIdentityPhone(form.phone);
  const idCard = normalizeIdCard(form.idCard);

  if (!name) {
    return translate('errors.nameRequired');
  }
  if (!/^1\d{10}$/.test(phone)) {
    return translate('errors.phone11');
  }
  if (!isValidIdCard(idCard)) {
    return translate('errors.idCardInvalid');
  }
  return '';
}

export function SmsVerifyPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const target = params.get('target') || 'health';
  const { verify: setGlobalVerified, clearVerification } = useSecurity();
  const { startAuthTimer } = useVerificationStore();
  const { t } = useI18n();

  const [mode, setMode] = useState<VerifyMode>('sms');
  const [session, setSession] = useState<SmsVerificationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [submittingIdentity, setSubmittingIdentity] = useState(false);
  const [error, setError] = useState('');
  const [sentHint, setSentHint] = useState(false);
  const demoTapCountRef = useRef(0);
  const [identityForm, setIdentityForm] = useState<IdentityVerificationPayload>({
    name: '',
    phone: '',
    idCard: '',
  });

  useEffect(() => {
    clearVerification();
  }, [clearVerification]);

  useEffect(() => {
    setError('');
    setSentHint(false);

    if (mode !== 'sms') {
      setSession(null);
      setLoading(false);
      return;
    }

    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const next = await startRelayVerification(target);
        if (mounted) {
          setSession(next);
        }
      } catch {
        if (mounted) {
          setError(t('errors.verificationCreateFailed'));
          setSession(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [mode, target]);

  const smsLink = useMemo(() => {
    if (!session?.messageBody) return '#';
    return buildSmsLink(session.receiverPhone, session.messageBody);
  }, [session]);

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError(t('errors.copyFailed'));
    }
  }

  function handleOpenSms() {
    if (!session?.messageBody) return;
    setSentHint(true);
    window.location.href = smsLink;
  }

  function handleDemoBypassTap() {
    if (!ALLOW_LOCAL_VERIFICATION_FALLBACK) return;

    const nextCount = demoTapCountRef.current + 1;
    demoTapCountRef.current = nextCount < 5 ? nextCount : 0;
    if (nextCount < 5) return;

    const demoSessionId = `local-relay-demo-${Date.now()}`;
    setError('');
    setGlobalVerified(demoSessionId, getResolvedElderId());
    startAuthTimer();
    navigate('/health');
  }

  async function handleCheckStatus() {
    if (!session) return;
    setChecking(true);
    setError('');

    try {
      if (ALLOW_LOCAL_VERIFICATION_FALLBACK) {
        await confirmRelayVerificationSent(session.sessionId);
      }
      const status = await getRelayVerificationStatus(session.sessionId);
      if (status.verified) {
        const currentElderId = getResolvedElderId();
        const verifiedElderId = status.elderId || session.elderId || currentElderId;
        if (verifiedElderId && currentElderId && verifiedElderId !== currentElderId) {
          setError(t('errors.verificationMismatch'));
          return;
        }
        setGlobalVerified(session.sessionId, verifiedElderId);
        startAuthTimer();
        navigate('/health');
        return;
      }

      if (status.status === 'EXPIRED') {
        setError(t('errors.verificationExpired'));
        return;
      }

      setError(t('errors.verificationNotReceived'));
    } catch {
      setError(t('errors.verificationCheckFailed'));
    } finally {
      setChecking(false);
    }
  }

  async function handleIdentitySubmit() {
    const nextPayload = {
      name: identityForm.name.trim(),
      phone: normalizeIdentityPhone(identityForm.phone),
      idCard: normalizeIdCard(identityForm.idCard),
    };
    setIdentityForm(nextPayload);

    const nextError = buildIdentityError(nextPayload, t);
    if (nextError) {
      setError(nextError);
      return;
    }

    setSubmittingIdentity(true);
    setError('');

    try {
      const status = await verifyIdentityAccess(target, nextPayload);
      if (!status.verified) {
        setError(t('errors.identityFailed'));
        return;
      }
      const currentElderId = getResolvedElderId();
      if (status.elderId && currentElderId && status.elderId !== currentElderId) {
        setError(t('errors.verificationMismatch'));
        return;
      }
      setGlobalVerified(status.sessionId, status.elderId || currentElderId);
      startAuthTimer();
      navigate('/health');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('errors.identitySubmitFailed'));
    } finally {
      setSubmittingIdentity(false);
    }
  }

  return (
    <div className="sl-page sl-verify-page sl-has-bottom-nav">
      <PageTopBar
        title={t('common.appName')}
        leading="home"
        trailingLabel={mode === 'sms' ? t('verification.idRegistration') : t('verification.sms')}
        trailingAriaLabel={mode === 'sms' ? t('verification.switchToIdentity') : t('verification.switchToSms')}
        onTrailingClick={() => setMode((current) => (current === 'sms' ? 'identity' : 'sms'))}
      />

      <section className="sl-section-heading">
        <h2>{mode === 'sms' ? t('verification.sms') : t('verification.identity')}</h2>
        <span className="sl-section-heading-badge">
          <ShieldCheck size={18} />
        </span>
      </section>

      <section className="sl-panel sl-verify-hero-card">
        <div
          className="sl-verify-hero-icon"
          onClick={handleDemoBypassTap}
          role={ALLOW_LOCAL_VERIFICATION_FALLBACK ? 'button' : undefined}
          tabIndex={ALLOW_LOCAL_VERIFICATION_FALLBACK ? 0 : undefined}
          onKeyDown={(event) => {
            if (!ALLOW_LOCAL_VERIFICATION_FALLBACK) return;
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleDemoBypassTap();
            }
          }}
        >
          <LockKeyhole size={34} />
        </div>
        <div className="sl-verify-hero-copy">
          {mode === 'sms' ? (
            <>
              <p>{t('verification.protectPrivacyLine1')}</p>
              <p>{t('verification.protectPrivacyLine2')}</p>
            </>
          ) : (
            <>
              <p>{t('verification.identityLine1')}</p>
              <p>{t('verification.identityLine2')}</p>
            </>
          )}
        </div>
      </section>

      <section className="sl-verify-form-block">
        {mode === 'sms' ? (
          <>
            {loading ? <p className="sl-form-hint">{t('verification.generatingSms')}</p> : null}

            {!loading && session ? (
              <>
                <div className="sl-verify-step-list">
                  <div className="sl-verify-step-item">1. {t('verification.stepOpenSms')}</div>
                  <div className="sl-verify-step-item">2. {t('verification.stepSendSms')}</div>
                  <div className="sl-verify-step-item">3. {t('verification.stepCheckResult')}</div>
                </div>

                <div className="sl-verify-data-card">
                  <label className="sl-form-label">{t('verification.receiverPhone')}</label>
                  <div className="sl-phone-number sl-ltr-data">{session.receiverPhone}</div>
                </div>

                <div className="sl-verify-data-card">
                  <label className="sl-form-label">{t('verification.messageBody')}</label>
                  <div className="sl-message-body sl-ltr-data">{session.messageBody || t('verification.noMessageBody')}</div>
                </div>

                <div className="sl-verify-actions">
                  <ActionButton icon={MessageSquareShare} variant="outline" onClick={handleOpenSms}>
                    {t('verification.openSms')}
                  </ActionButton>
                  <ActionButton
                    icon={Copy}
                    variant="secondary"
                    onClick={() => handleCopy(session.messageBody || '')}
                    disabled={!session.messageBody}
                  >
                    {t('verification.copyContent')}
                  </ActionButton>
                </div>

                {sentHint ? (
                  <p className="sl-form-hint">{t('verification.sentHint')}</p>
                ) : null}
              </>
            ) : null}

            {error ? <p className="sl-error">{error}</p> : null}

            <ActionButton
              icon={RefreshCw}
              variant="primary"
              onClick={handleCheckStatus}
              disabled={loading || checking || !session}
            >
              {checking ? t('verification.checking') : t('verification.sentCheckResult')}
            </ActionButton>
          </>
        ) : (
          <>
            <div className="sl-verify-data-card sl-identity-card">
              <label className="sl-form-label">{t('verification.visitorName')}</label>
              <div className="sl-input-wrap">
                <User size={16} />
                <input
                  className="sl-code-input sl-identity-input sl-auto-data"
                  dir="auto"
                  placeholder={t('verification.realNamePlaceholder')}
                  value={identityForm.name}
                  onChange={(event) => setIdentityForm((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
            </div>

            <div className="sl-verify-data-card sl-identity-card">
              <label className="sl-form-label">{t('verification.visitorPhone')}</label>
              <div className="sl-input-wrap">
                <Phone size={16} />
                <input
                  className="sl-code-input sl-identity-input sl-ltr-data"
                  dir="ltr"
                  placeholder={t('verification.phone11Placeholder')}
                  inputMode="numeric"
                  maxLength={11}
                  value={identityForm.phone}
                  onChange={(event) => setIdentityForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </div>
            </div>

            <div className="sl-verify-data-card sl-identity-card">
              <label className="sl-form-label">{t('verification.visitorIdCard')}</label>
              <div className="sl-input-wrap">
                <IdCard size={16} />
                <input
                  className="sl-code-input sl-identity-input sl-ltr-data"
                  dir="ltr"
                  placeholder={t('verification.idCardPlaceholder')}
                  value={identityForm.idCard}
                  onChange={(event) => setIdentityForm((current) => ({ ...current, idCard: event.target.value }))}
                />
              </div>
            </div>

            <p className="sl-form-hint">{t('verification.identityAuditHint')}</p>
            {error ? <p className="sl-error">{error}</p> : null}

            <ActionButton icon={ShieldCheck} variant="primary" onClick={handleIdentitySubmit} disabled={submittingIdentity}>
              {submittingIdentity ? t('verification.registering') : t('verification.registerAndView')}
            </ActionButton>
          </>
        )}
      </section>

      <BottomTabBar />
    </div>
  );
}
