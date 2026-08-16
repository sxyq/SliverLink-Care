import { useEffect, useMemo, useState } from 'react';
import { Button, Input, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';

import { APP_ROUTES } from '@/app/app.constants';
import { useLocalizedError } from '@/hooks/useLocalizedError';
import { getScanVerificationStatus, startScanSmsVerification, verifyScanIdentity } from '@/services/scan/scanAuthService';
import { parseQueryParams } from '@/utils/routeParams';
import { useI18n } from '@/i18n';
import { I18nPageShell } from '@/components/layout/I18nPageShell';

import './index.scss';

type VerifyMode = 'identity' | 'sms';

function buildSmsLink(phone: string, body: string) {
  const systemInfo = Taro.getSystemInfoSync();
  const isIos = systemInfo.platform === 'ios';
  const separator = isIos ? '&' : '?';
  return `sms:${phone}${separator}body=${encodeURIComponent(body)}`;
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '');
}

function normalizeIdCard(idCard: string) {
  return idCard.trim().toUpperCase();
}

function formatSmsReceiverLabel(maskedPhone: string, fallback: string) {
  return maskedPhone || fallback;
}

function isValidIdCard(idCard: string) {
  if (!/^(\d{15}|\d{17}[0-9X])$/.test(idCard)) {
    return false;
  }

  if (idCard.length === 15) {
    return true;
  }

  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  const sum = idCard
    .slice(0, 17)
    .split('')
    .reduce((acc, current, index) => acc + Number(current) * weights[index], 0);

  return checkCodes[sum % 11] === idCard[17];
}

function buildArchiveUrl(elderId: string, sessionId: string) {
  return `${APP_ROUTES.scanArchive}?elderId=${encodeURIComponent(elderId)}&sessionId=${encodeURIComponent(sessionId)}`;
}

function ScanVerifyHeader(props: {
  mode: VerifyMode;
  onToggleMode: () => void;
}) {
  const { t } = useI18n();
  return (
    <View className='sl-page-header-bar'>
      <View className='sl-page-header-action'>
        <View className='sl-page-header-icon' onClick={() => Taro.navigateBack({ delta: 1 }).catch(() => Taro.redirectTo({ url: APP_ROUTES.home }))}>
          {t('common.home')}
        </View>
      </View>
      <View className='sl-page-header-copy'>
        <View className='sl-page-header-copy__title'>{t('common.brandTitle')}</View>
      </View>
      <View className='sl-page-header-action'>
        <View className='sl-page-header-icon scan-verify-header-toggle' onClick={props.onToggleMode}>
          {props.mode === 'sms' ? t('verification.idRegistration') : t('verification.sms')}
        </View>
      </View>
    </View>
  );
}

function ScanVerifyPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = parseQueryParams(router.params || {});
  const elderId = params.elderId || '';
  const target = 'health';

  const [mode, setMode] = useState<VerifyMode>('sms');
  const [identityName, setIdentityName] = useState('');
  const [identityPhone, setIdentityPhone] = useState('');
  const [identityIdCard, setIdentityIdCard] = useState('');
  const [submittingIdentity, setSubmittingIdentity] = useState(false);

  const [smsLoading, setSmsLoading] = useState(false);
  const [smsChecking, setSmsChecking] = useState(false);
  const [smsSessionId, setSmsSessionId] = useState('');
  const [smsReceiverPhone, setSmsReceiverPhone] = useState('');
  const [smsReceiverPhoneMasked, setSmsReceiverPhoneMasked] = useState('');
  const [smsMessageBody, setSmsMessageBody] = useState('');

  const { clearError, errorText, setError, setErrorKey } = useLocalizedError(t);
  const [successText, setSuccessText] = useState('');

  const missingParams = !elderId;

  useEffect(() => {
    clearError();
    setSuccessText('');
  }, [mode]);

  useEffect(() => {
    if (mode !== 'sms' || missingParams || smsSessionId || smsLoading) {
      return;
    }

    void handleStartSmsVerification();
  }, [mode, missingParams, smsLoading, smsSessionId]);

  const identityErrorKey = useMemo(() => {
    if (!identityName.trim()) {
      return 'errors.nameRequired';
    }
    if (!/^1\d{10}$/.test(normalizePhone(identityPhone))) {
      return 'errors.phone11';
    }
    if (!isValidIdCard(normalizeIdCard(identityIdCard))) {
      return 'errors.idCardInvalid';
    }
    return '';
  }, [identityIdCard, identityName, identityPhone]);

  async function navigateToArchive(nextElderId: string, sessionId: string) {
    await Taro.redirectTo({
      url: buildArchiveUrl(nextElderId, sessionId),
    });
  }

  async function handleIdentitySubmit() {
    if (missingParams) {
      setErrorKey('errors.missingElder');
      return;
    }

    if (identityErrorKey) {
      setErrorKey(identityErrorKey);
      return;
    }

    try {
      setSubmittingIdentity(true);
      clearError();
      setSuccessText('');

      const result = await verifyScanIdentity({
        elderId,
        target,
        name: identityName.trim(),
        phone: normalizePhone(identityPhone),
        idCard: normalizeIdCard(identityIdCard),
      });

      if (!result.verified || !result.sessionId) {
        setErrorKey('errors.identityFailed');
        return;
      }

      if (result.elderId && result.elderId !== elderId) {
        setErrorKey('errors.verificationMismatch');
        return;
      }

      setSuccessText(t('verification.identitySuccess'));
      await navigateToArchive(result.elderId || elderId, result.sessionId);
    } catch (error) {
      setError(error, 'errors.requestFailed');
    } finally {
      setSubmittingIdentity(false);
    }
  }

  async function handleStartSmsVerification() {
    if (missingParams) {
      setErrorKey('errors.missingElder');
      return;
    }

    try {
      setSmsLoading(true);
      clearError();
      setSuccessText('');
      const session = await startScanSmsVerification(elderId, target);
      setSmsSessionId(session.sessionId);
      setSmsReceiverPhone(session.receiverPhone);
      setSmsReceiverPhoneMasked(session.receiverPhoneMasked);
      setSmsMessageBody(session.messageBody);
      setSuccessText(t('verification.smsSessionCreated'));
    } catch (error) {
      setError(error, 'errors.requestFailed');
    } finally {
      setSmsLoading(false);
    }
  }

  async function handleCheckSmsStatus() {
    if (!smsSessionId) {
      setErrorKey('errors.verificationCreateFailed');
      return;
    }

    try {
      setSmsChecking(true);
      clearError();
      setSuccessText('');
      const status = await getScanVerificationStatus(smsSessionId);

      if (status.verified) {
        if (status.elderId && status.elderId !== elderId) {
          setErrorKey('errors.verificationMismatch');
          return;
        }
        setSuccessText(t('verification.smsVerificationSuccess'));
        await navigateToArchive(status.elderId || elderId, status.sessionId);
        return;
      }

      if (status.status === 'EXPIRED') {
        setErrorKey('errors.verificationExpired');
        return;
      }

      setErrorKey('errors.verificationNotReceived');
    } catch (error) {
      setError(error, 'errors.verificationCheckFailed');
    } finally {
      setSmsChecking(false);
    }
  }

  async function handleOpenSmsComposer() {
    if (!smsReceiverPhone || !smsMessageBody) {
      setErrorKey('verification.generatingSms');
      return;
    }

    try {
      clearError();
      setSuccessText('');
      await Taro.setClipboardData({ data: smsMessageBody });

      if (process.env.TARO_ENV === 'h5' && typeof window !== 'undefined') {
        window.location.href = buildSmsLink(smsReceiverPhone, smsMessageBody);
        setSuccessText(t('verification.smsCopiedInstruction'));
        return;
      }

      const result = await Taro.showModal({
        title: t('verification.messageCopied'),
        content: t('verification.smsCopyUnavailable', { phone: formatSmsReceiverLabel(smsReceiverPhoneMasked, t('errors.noPhone')) }),
        confirmText: t('common.confirm'),
        showCancel: false,
      });

      if (result.confirm) {
        setSuccessText(t('verification.smsCopiedInstruction'));
      }
    } catch (error) {
      setError(error, 'errors.openSmsFailed');
    }
  }

  return (
    <View className='sl-stage sl-stage--scan'>
      <View className='sl-app-shell'>
        <View className='sl-phone-shell'>
          <View className='sl-phone-content'>
            <View className='sl-page scan-verify-page'>
              <ScanVerifyHeader mode={mode} onToggleMode={() => setMode((current) => (current === 'sms' ? 'identity' : 'sms'))} />

              <View className='sl-section-heading'>
                <Text className='scan-verify-heading__title'>{mode === 'identity' ? t('verification.identity') : t('verification.sms')}</Text>
                <Text className='scan-verify-heading__badge'>✓</Text>
              </View>

              <View className='sl-card scan-verify-hero-card'>
                <View className='scan-verify-hero-card__icon'>⌑</View>
                <View className='scan-verify-hero-card__copy'>
                  {mode === 'identity' ? (
                    <>
                      <Text>{t('verification.identityLine1')}</Text>
                      <Text>{t('verification.identityLine2')}</Text>
                    </>
                  ) : (
                    <>
                      <Text>{t('verification.protectPrivacyLine1')}</Text>
                      <Text>{t('verification.protectPrivacyLine2')}</Text>
                    </>
                  )}
                </View>
              </View>

              <View className='sl-card scan-verify-panel'>
                {missingParams ? <View className='sl-error-card'>{t('errors.missingElder')}</View> : null}
                {errorText ? <View className='sl-error-card'>{errorText}</View> : null}
                {successText ? <View className='sl-permission-banner'>{successText}</View> : null}

                {mode === 'identity' ? (
                  <View className='scan-verify-form'>
                    <View className='sl-form-grid'>
                      <View className='sl-form-field sl-form-field--full'>
                        <Text className='sl-form-label'>{t('verification.visitorName')}</Text>
                        <Input className='sl-form-input sl-auto-data' value={identityName} placeholder={t('verification.realNamePlaceholder')} onInput={(e) => setIdentityName(e.detail.value)} />
                      </View>
                      <View className='sl-form-field sl-form-field--full'>
                          <Text className='sl-form-label'>{t('verification.visitorPhone')}</Text>
                        <Input
                          className='sl-form-input sl-ltr-data'
                          type='number'
                          maxlength={11}
                          value={identityPhone}
                          placeholder={t('verification.phone11Placeholder')}
                          onInput={(e) => setIdentityPhone(e.detail.value)}
                        />
                      </View>
                      <View className='sl-form-field sl-form-field--full'>
                          <Text className='sl-form-label'>{t('verification.visitorIdCard')}</Text>
                        <Input
                          className='sl-form-input sl-ltr-data'
                          value={identityIdCard}
                          maxlength={18}
                          placeholder={t('verification.idCardPlaceholder')}
                          onInput={(e) => setIdentityIdCard(e.detail.value)}
                        />
                      </View>
                    </View>
                    <Text className='scan-verify-form__hint'>{t('verification.identityAuditHint')}</Text>
                    <View className='scan-verify-actions'>
                      <Button className='sl-primary-button' loading={submittingIdentity} onClick={handleIdentitySubmit}>
                        {submittingIdentity ? t('verification.registering') : t('verification.registerAndView')}
                      </Button>
                    </View>
                  </View>
                ) : (
                  <View className='scan-verify-form'>
                    <View className='scan-verify-step-list'>
                      <View className='scan-verify-step-item'>1. {t('verification.stepOpenSms')}</View>
                      <View className='scan-verify-step-item'>2. {t('verification.stepSendSms')}</View>
                      <View className='scan-verify-step-item'>3. {t('verification.stepCheckResult')}</View>
                    </View>
                    {smsReceiverPhoneMasked ? (
                      <View className='sl-form-grid'>
                        <View className='sl-form-field sl-form-field--full'>
                          <Text className='sl-form-label'>{t('verification.receiverPhone')}</Text>
                          <View className='scan-verify-data-card sl-ltr-data'>{smsReceiverPhoneMasked}</View>
                        </View>
                        <View className='sl-form-field sl-form-field--full'>
                          <Text className='sl-form-label'>{t('verification.messageBody')}</Text>
                          <View className='scan-verify-data-card scan-verify-data-card--message sl-ltr-data'>{smsMessageBody || t('common.generatedPending')}</View>
                        </View>
                      </View>
                    ) : null}
                    <View className='scan-verify-actions'>
                      <Button className='sl-primary-button' onClick={handleOpenSmsComposer} disabled={smsLoading || !smsSessionId || !smsMessageBody}>
                        {t('verification.openSmsComposer')}
                      </Button>
                      <Button className='sl-primary-button' loading={smsLoading} onClick={handleStartSmsVerification}>
                        {smsSessionId ? t('verification.regenerateMessage') : t('verification.generateMessageFirst')}
                      </Button>
                      <Button className='sl-secondary-button' loading={smsChecking} onClick={handleCheckSmsStatus}>
                        {smsChecking ? t('verification.checking') : t('verification.sentCheckResult')}
                      </Button>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function ScanVerifyPageEntry() {
  return (
    <I18nPageShell navigationTitleKey='common.accessVerification'>
      <ScanVerifyPage />
    </I18nPageShell>
  );
}
