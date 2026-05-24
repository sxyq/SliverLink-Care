import { useEffect, useMemo, useState } from 'react';
import { Copy, IdCard, LockKeyhole, MessageSquareShare, Phone, RefreshCw, ShieldCheck, User } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ActionButton } from '../components/ActionButton';
import { BottomTabBar } from '../components/BottomTabBar';
import { PageTopBar } from '../components/PageTopBar';
import { confirmRelayVerificationSent, getRelayVerificationStatus, startRelayVerification, verifyIdentityAccess } from '../api/smsApi';
import { useSecurity } from '../app/SecurityProvider';
import { DEV_FIXED_SMS_CODE } from '../config/env';
import { useVerificationStore } from '../features/verification/verificationStore';
import type { IdentityVerificationPayload, SmsVerificationSession } from '../types/verification';

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

function buildIdentityError(form: IdentityVerificationPayload) {
  const name = form.name.trim();
  const phone = normalizeIdentityPhone(form.phone);
  const idCard = normalizeIdCard(form.idCard);

  if (!name) {
    return '请输入姓名';
  }
  if (!/^\d{13}$/.test(phone)) {
    return '请输入 13 位数字手机号';
  }
  if (!isValidIdCard(idCard)) {
    return '请输入符合规范的身份证号';
  }
  return '';
}

export function SmsVerifyPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const target = params.get('target') || 'health';
  const { verify: setGlobalVerified, clearVerification } = useSecurity();
  const { startAuthTimer } = useVerificationStore();

  const [mode, setMode] = useState<VerifyMode>('sms');
  const [session, setSession] = useState<SmsVerificationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [submittingIdentity, setSubmittingIdentity] = useState(false);
  const [error, setError] = useState('');
  const [sentHint, setSentHint] = useState(false);
  const [demoTapCount, setDemoTapCount] = useState(0);
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
          setError('无法创建验证会话，请稍后重试');
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
      setError('复制失败，请手动选择短信内容');
    }
  }

  function handleOpenSms() {
    if (!session?.messageBody) return;
    setSentHint(true);
    window.location.href = smsLink;
  }

  function handleDemoBypassTap() {
    if (!DEV_FIXED_SMS_CODE) return;

    setDemoTapCount((current) => {
      const nextCount = current + 1;
      if (nextCount < 5) return nextCount;

      const demoSessionId = `local-relay-demo-${Date.now()}`;
      setError('');
      setGlobalVerified(demoSessionId);
      startAuthTimer();
      navigate('/health');
      return 0;
    });
  }

  async function handleCheckStatus() {
    if (!session) return;
    setChecking(true);
    setError('');

    try {
      if (DEV_FIXED_SMS_CODE) {
        await confirmRelayVerificationSent(session.sessionId);
      }

      const status = await getRelayVerificationStatus(session.sessionId);
      if (status.verified) {
        setGlobalVerified(session.sessionId);
        startAuthTimer();
        navigate('/health');
        return;
      }

      if (status.status === 'EXPIRED') {
        setError('本次验证已过期，请重新发起验证');
        return;
      }

      setError('暂未收到验证结果，请发送短信后再检查');
    } catch {
      setError('检查验证结果失败，请稍后重试');
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

    const nextError = buildIdentityError(nextPayload);
    if (nextError) {
      setError(nextError);
      return;
    }

    setSubmittingIdentity(true);
    setError('');

    try {
      const status = await verifyIdentityAccess(target, nextPayload);
      if (!status.verified) {
        setError('身份信息校验未通过，请稍后重试');
        return;
      }
      setGlobalVerified(status.sessionId);
      startAuthTimer();
      navigate('/health');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '提交身份信息失败，请稍后重试');
    } finally {
      setSubmittingIdentity(false);
    }
  }

  return (
    <div className="sl-page sl-verify-page sl-has-bottom-nav">
      <PageTopBar
        title="智联名牌"
        leading="home"
        trailingLabel={mode === 'sms' ? '证件登记' : '短信验证'}
        trailingAriaLabel={mode === 'sms' ? '切换到证件登记验证' : '切换到短信验证'}
        onTrailingClick={() => setMode((current) => (current === 'sms' ? 'identity' : 'sms'))}
      />

      <section className="sl-section-heading">
        <h2>{mode === 'sms' ? '短信验证' : '身份登记'}</h2>
        <span className="sl-section-heading-badge">
          <ShieldCheck size={18} />
        </span>
      </section>

      <section className="sl-panel sl-verify-hero-card">
        <div
          className="sl-verify-hero-icon"
          onClick={handleDemoBypassTap}
          role={DEV_FIXED_SMS_CODE ? 'button' : undefined}
          tabIndex={DEV_FIXED_SMS_CODE ? 0 : undefined}
          onKeyDown={(event) => {
            if (!DEV_FIXED_SMS_CODE) return;
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
              <p>为保护老人隐私，</p>
              <p>请使用当前手机完成验证</p>
            </>
          ) : (
            <>
              <p>登记姓名、手机号与身份证号后，</p>
              <p>即可查看完整健康信息</p>
            </>
          )}
        </div>
      </section>

      <section className="sl-verify-form-block">
        {mode === 'sms' ? (
          <>
            {loading ? <p className="sl-form-hint">正在生成验证短信内容...</p> : null}

            {!loading && session ? (
              <>
                <div className="sl-verify-step-list">
                  <div className="sl-verify-step-item">1. 打开系统短信</div>
                  <div className="sl-verify-step-item">2. 向后台指定号码发送下方短信内容</div>
                  <div className="sl-verify-step-item">3. 返回本页检查验证结果</div>
                </div>

                <div className="sl-verify-data-card">
                  <label className="sl-form-label">后台指定接收手机号</label>
                  <div className="sl-phone-number">{session.receiverPhone}</div>
                </div>

                <div className="sl-verify-data-card">
                  <label className="sl-form-label">短信内容</label>
                  <div className="sl-message-body">{session.messageBody || '未生成短信内容'}</div>
                </div>

                <div className="sl-verify-actions">
                  <ActionButton icon={MessageSquareShare} variant="outline" onClick={handleOpenSms}>
                    打开短信
                  </ActionButton>
                  <ActionButton
                    icon={Copy}
                    variant="secondary"
                    onClick={() => handleCopy(session.messageBody || '')}
                    disabled={!session.messageBody}
                  >
                    复制内容
                  </ActionButton>
                </div>

                {sentHint ? (
                  <p className="sl-form-hint">如果没有自动打开短信，请复制短信内容后手动发送到上方号码。</p>
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
              {checking ? '检查中...' : '我已发送，检查结果'}
            </ActionButton>
          </>
        ) : (
          <>
            <div className="sl-verify-data-card sl-identity-card">
              <label className="sl-form-label">访问人姓名</label>
              <div className="sl-input-wrap">
                <User size={16} />
                <input
                  className="sl-code-input sl-identity-input"
                  placeholder="请输入真实姓名"
                  value={identityForm.name}
                  onChange={(event) => setIdentityForm((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
            </div>

            <div className="sl-verify-data-card sl-identity-card">
              <label className="sl-form-label">访问人手机号</label>
              <div className="sl-input-wrap">
                <Phone size={16} />
                <input
                  className="sl-code-input sl-identity-input"
                  placeholder="请输入 13 位数字手机号"
                  inputMode="numeric"
                  value={identityForm.phone}
                  onChange={(event) => setIdentityForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </div>
            </div>

            <div className="sl-verify-data-card sl-identity-card">
              <label className="sl-form-label">访问人身份证号</label>
              <div className="sl-input-wrap">
                <IdCard size={16} />
                <input
                  className="sl-code-input sl-identity-input"
                  placeholder="请输入符合规范的身份证号"
                  value={identityForm.idCard}
                  onChange={(event) => setIdentityForm((current) => ({ ...current, idCard: event.target.value }))}
                />
              </div>
            </div>

            <p className="sl-form-hint">登记后将记录验证方式、来源 IP 与身份信息，用于访问审计与后台统计。</p>
            {error ? <p className="sl-error">{error}</p> : null}

            <ActionButton icon={ShieldCheck} variant="primary" onClick={handleIdentitySubmit} disabled={submittingIdentity}>
              {submittingIdentity ? '登记中...' : '登记信息并查看'}
            </ActionButton>
          </>
        )}
      </section>

      <BottomTabBar />
    </div>
  );
}
