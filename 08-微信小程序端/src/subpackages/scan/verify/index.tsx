import { useEffect, useMemo, useState } from 'react';
import { Button, Input, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';

import { APP_ROUTES, ERROR_MESSAGES } from '@/app/app.constants';
import { getScanVerificationStatus, startScanSmsVerification, verifyScanIdentity } from '@/services/scan/scanAuthService';
import { parseQueryParams } from '@/utils/routeParams';

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

function formatSmsReceiverLabel(maskedPhone: string) {
  return maskedPhone || '后台指定号码';
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
  return (
    <View className='sl-page-header-bar'>
      <View className='sl-page-header-action'>
        <View className='sl-page-header-icon' onClick={() => Taro.navigateBack({ delta: 1 }).catch(() => Taro.redirectTo({ url: APP_ROUTES.home }))}>
          首页
        </View>
      </View>
      <View className='sl-page-header-copy'>
        <View className='sl-page-header-copy__title'>渝护银龄名牌</View>
      </View>
      <View className='sl-page-header-action'>
        <View className='sl-page-header-icon scan-verify-header-toggle' onClick={props.onToggleMode}>
          {props.mode === 'sms' ? '证件登记' : '短信验证'}
        </View>
      </View>
    </View>
  );
}

export default function ScanVerifyPage() {
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

  const [errorText, setErrorText] = useState('');
  const [successText, setSuccessText] = useState('');

  const missingParams = !elderId;

  useEffect(() => {
    setErrorText('');
    setSuccessText('');
  }, [mode]);

  useEffect(() => {
    if (mode !== 'sms' || missingParams || smsSessionId || smsLoading) {
      return;
    }

    void handleStartSmsVerification();
  }, [mode, missingParams, smsLoading, smsSessionId]);

  const identityError = useMemo(() => {
    if (!identityName.trim()) {
      return '请输入登记人姓名';
    }
    if (!/^1\d{10}$/.test(normalizePhone(identityPhone))) {
      return '请输入 11 位手机号';
    }
    if (!isValidIdCard(normalizeIdCard(identityIdCard))) {
      return '请输入有效的身份证号';
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
      setErrorText('缺少老人标识，请返回重新扫码');
      return;
    }

    if (identityError) {
      setErrorText(identityError);
      return;
    }

    try {
      setSubmittingIdentity(true);
      setErrorText('');
      setSuccessText('');

      const result = await verifyScanIdentity({
        elderId,
        target,
        name: identityName.trim(),
        phone: normalizePhone(identityPhone),
        idCard: normalizeIdCard(identityIdCard),
      });

      if (!result.verified || !result.sessionId) {
        setErrorText('身份登记未通过，请核对后重试');
        return;
      }

      if (result.elderId && result.elderId !== elderId) {
        setErrorText('验证会话与当前老人不一致，请返回重新扫码');
        return;
      }

      setSuccessText('验证成功，正在进入健康档案...');
      await navigateToArchive(result.elderId || elderId, result.sessionId);
    } catch (error) {
      setErrorText((error as Error)?.message || ERROR_MESSAGES.requestFailed);
    } finally {
      setSubmittingIdentity(false);
    }
  }

  async function handleStartSmsVerification() {
    if (missingParams) {
      setErrorText('缺少老人标识，请返回重新扫码');
      return;
    }

    try {
      setSmsLoading(true);
      setErrorText('');
      setSuccessText('');
      const session = await startScanSmsVerification(elderId, target);
      setSmsSessionId(session.sessionId);
      setSmsReceiverPhone(session.receiverPhone);
      setSmsReceiverPhoneMasked(session.receiverPhoneMasked);
      setSmsMessageBody(session.messageBody);
      setSuccessText('短信验证会话已创建，请由绑定手机发送验证短信后再检查状态');
    } catch (error) {
      setErrorText((error as Error)?.message || ERROR_MESSAGES.requestFailed);
    } finally {
      setSmsLoading(false);
    }
  }

  async function handleCheckSmsStatus() {
    if (!smsSessionId) {
      setErrorText('请先创建短信验证会话');
      return;
    }

    try {
      setSmsChecking(true);
      setErrorText('');
      setSuccessText('');
      const status = await getScanVerificationStatus(smsSessionId);

      if (status.verified) {
        if (status.elderId && status.elderId !== elderId) {
          setErrorText('验证会话与当前老人不一致，请返回重新扫码');
          return;
        }
        setSuccessText('短信验证成功，正在进入健康档案...');
        await navigateToArchive(status.elderId || elderId, status.sessionId);
        return;
      }

      if (status.status === 'EXPIRED') {
        setErrorText('当前短信验证已过期，请重新创建会话');
        return;
      }

      setErrorText('暂未收到验证完成状态，请发送短信后稍后再试');
    } catch (error) {
      setErrorText((error as Error)?.message || ERROR_MESSAGES.requestFailed);
    } finally {
      setSmsChecking(false);
    }
  }

  async function handleOpenSmsComposer() {
    if (!smsReceiverPhone || !smsMessageBody) {
      setErrorText('请先生成短信内容');
      return;
    }

    try {
      setErrorText('');
      setSuccessText('');
      await Taro.setClipboardData({ data: smsMessageBody });

      if (process.env.TARO_ENV === 'h5' && typeof window !== 'undefined') {
        window.location.href = buildSmsLink(smsReceiverPhone, smsMessageBody);
        setSuccessText('已打开系统短信；如果没有自动填充，请直接粘贴已复制的短信内容。');
        return;
      }

      const result = await Taro.showModal({
        title: '短信内容已复制',
        content: `当前环境暂不支持直接拉起系统短信，请手动打开短信并发送到 ${formatSmsReceiverLabel(smsReceiverPhoneMasked)}。`,
        confirmText: '我知道了',
        showCancel: false,
      });

      if (result.confirm) {
        setSuccessText('短信内容已复制，请打开系统短信后粘贴发送。');
      }
    } catch (error) {
      setErrorText((error as Error)?.message || '打开短信失败，请稍后重试');
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
                <Text className='scan-verify-heading__title'>{mode === 'identity' ? '身份登记' : '短信验证'}</Text>
                <Text className='scan-verify-heading__badge'>盾</Text>
              </View>

              <View className='sl-card scan-verify-hero-card'>
                <View className='scan-verify-hero-card__icon'>锁</View>
                <View className='scan-verify-hero-card__copy'>
                  {mode === 'identity' ? (
                    <>
                      <Text>登记姓名、手机号与身份证号后，</Text>
                      <Text>即可查看完整健康信息</Text>
                    </>
                  ) : (
                    <>
                      <Text>为保护老人隐私，</Text>
                      <Text>请使用当前手机完成验证</Text>
                    </>
                  )}
                </View>
              </View>

              <View className='sl-card scan-verify-panel'>
                {missingParams ? <View className='sl-error-card'>缺少老人标识，请返回扫码落地页重新进入。</View> : null}
                {errorText ? <View className='sl-error-card'>{errorText}</View> : null}
                {successText ? <View className='sl-permission-banner'>{successText}</View> : null}

                {mode === 'identity' ? (
                  <View className='scan-verify-form'>
                    <View className='sl-form-grid'>
                      <View className='sl-form-field sl-form-field--full'>
                        <Text className='sl-form-label'>访问人姓名</Text>
                        <Input className='sl-form-input' value={identityName} placeholder='请输入姓名' onInput={(e) => setIdentityName(e.detail.value)} />
                      </View>
                      <View className='sl-form-field sl-form-field--full'>
                        <Text className='sl-form-label'>访问人手机号</Text>
                        <Input
                          className='sl-form-input'
                          type='number'
                          maxlength={11}
                          value={identityPhone}
                          placeholder='请输入 11 位手机号'
                          onInput={(e) => setIdentityPhone(e.detail.value)}
                        />
                      </View>
                      <View className='sl-form-field sl-form-field--full'>
                        <Text className='sl-form-label'>访问人身份证号</Text>
                        <Input
                          className='sl-form-input'
                          value={identityIdCard}
                          maxlength={18}
                          placeholder='请输入身份证号'
                          onInput={(e) => setIdentityIdCard(e.detail.value)}
                        />
                      </View>
                    </View>
                    <Text className='scan-verify-form__hint'>登记后将记录验证方式、来源 IP 与身份信息，用于访问审计与后台统计。</Text>
                    <View className='scan-verify-actions'>
                      <Button className='sl-primary-button' loading={submittingIdentity} onClick={handleIdentitySubmit}>
                        {submittingIdentity ? '登记中...' : '登记信息并查看'}
                      </Button>
                    </View>
                  </View>
                ) : (
                  <View className='scan-verify-form'>
                    <View className='scan-verify-step-list'>
                      <View className='scan-verify-step-item'>1. 打开系统短信</View>
                      <View className='scan-verify-step-item'>2. 向后台指定号码发送下方短信内容</View>
                      <View className='scan-verify-step-item'>3. 返回本页检查验证结果</View>
                    </View>
                    {smsReceiverPhoneMasked ? (
                      <View className='sl-form-grid'>
                        <View className='sl-form-field sl-form-field--full'>
                          <Text className='sl-form-label'>后台指定接收手机号</Text>
                          <View className='scan-verify-data-card'>{smsReceiverPhoneMasked}</View>
                        </View>
                        <View className='sl-form-field sl-form-field--full'>
                          <Text className='sl-form-label'>短信内容</Text>
                          <View className='scan-verify-data-card scan-verify-data-card--message'>{smsMessageBody || '已生成'}</View>
                        </View>
                      </View>
                    ) : null}
                    <View className='scan-verify-actions'>
                      <Button className='sl-primary-button' onClick={handleOpenSmsComposer} disabled={smsLoading || !smsSessionId || !smsMessageBody}>
                        一键跳转短信
                      </Button>
                      <Button className='sl-primary-button' loading={smsLoading} onClick={handleStartSmsVerification}>
                        {smsSessionId ? '重新生成短信内容' : '打开短信前先生成短信内容'}
                      </Button>
                      <Button className='sl-secondary-button' loading={smsChecking} onClick={handleCheckSmsStatus}>
                        {smsChecking ? '检查中...' : '我已发送，检查结果'}
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
