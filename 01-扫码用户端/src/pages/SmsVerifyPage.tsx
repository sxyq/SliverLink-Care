import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Copy, LockKeyhole, MessageSquareShare, RefreshCw, ShieldCheck } from 'lucide-react';
import { ActionButton } from '../components/ActionButton';
import {
  confirmRelayVerificationSent,
  getRelayVerificationStatus,
  startRelayVerification,
} from '../api/smsApi';
import { useSecurity } from '../app/SecurityProvider';
import { useVerificationStore } from '../features/verification/verificationStore';
import type { SmsRelayVerificationSession } from '../types/verification';

function buildSmsLink(phone: string, body: string) {
  const isiOS = /iPhone|iPad|iPod/i.test(window.navigator.userAgent);
  const separator = isiOS ? '&' : '?';
  return `sms:${phone}${separator}body=${encodeURIComponent(body)}`;
}

export function SmsVerifyPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const target = params.get('target') || 'health';
  const { verify: setGlobalVerified } = useSecurity();
  const { startAuthTimer } = useVerificationStore();

  const [session, setSession] = useState<SmsRelayVerificationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [sentHint, setSentHint] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const next = await startRelayVerification(target);
        if (mounted) setSession(next);
      } catch {
        if (mounted) setError('无法创建验证会话，请稍后重试');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [target]);

  const smsLink = useMemo(() => {
    if (!session) return '#';
    return buildSmsLink(session.receiverPhone, session.messageBody);
  }, [session]);

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError('复制失败，请手动选择短信内容');
    }
  }

  async function handleOpenSms() {
    if (!session) return;
    setSentHint(true);
    window.location.href = smsLink;
  }

  async function handleCheckStatus() {
    if (!session) return;
    setChecking(true);
    setError('');

    try {
      if (session.localDev) {
        await confirmRelayVerificationSent(session.sessionId);
      }

      const status = await getRelayVerificationStatus(session.sessionId);
      if (status.verified) {
        setGlobalVerified();
        startAuthTimer();
        navigate('/');
        return;
      }

      if (status.status === 'EXPIRED') {
        setError('本次验证已过期，请重新发起验证');
        return;
      }

      setError('暂未收到验证短信，请发送后再检查');
    } catch {
      setError('检查验证结果失败，请稍后重试');
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="sl-page">
      <header className="sl-hero slim">
        <div>
          <h1>身份验证</h1>
          <p>请使用本机短信完成详细信息查看验证</p>
        </div>
        <ShieldCheck size={32} />
      </header>

      <section className="sl-card">
        <div className="sl-verify-icon">
          <LockKeyhole size={40} />
        </div>

        <p className="sl-verify-hint">如需查看详细信息，请使用当前手机向指定号码发送验证短信。</p>

        {loading && <p className="sl-verify-hint">正在生成验证短信内容...</p>}

        {!loading && session && (
          <>
            <div className="sl-verify-steps">
              <div className="sl-verify-step">1. 打开系统短信</div>
              <div className="sl-verify-step">2. 向指定号码发送短信内容</div>
              <div className="sl-verify-step">3. 返回本页检查验证结果</div>
            </div>

            <div className="sl-verify-block">
              <div className="sl-verify-block-label">接收号码</div>
              <div className="sl-verify-block-value">{session.receiverPhone}</div>
            </div>

            <div className="sl-verify-block">
              <div className="sl-verify-block-label">短信内容</div>
              <div className="sl-verify-block-value monospace">{session.messageBody}</div>
            </div>

            <div className="sl-verify-dual-actions">
              <ActionButton icon={MessageSquareShare} variant="secondary" onClick={handleOpenSms}>
                打开短信
              </ActionButton>
              <ActionButton icon={Copy} variant="primary" onClick={() => handleCopy(session.messageBody)}>
                复制内容
              </ActionButton>
            </div>

            {sentHint && (
              <p className="sl-verify-note">如果没有自动打开短信，请复制短信内容后手动发送到上方号码。</p>
            )}

            <div className="sl-status-chip pending">当前状态：等待短信回传</div>
          </>
        )}

        {error && <p className="sl-error">{error}</p>}

        <ActionButton icon={RefreshCw} variant="primary" onClick={handleCheckStatus} disabled={loading || checking || !session}>
          {checking ? '检查中...' : '我已发送，检查结果'}
        </ActionButton>
      </section>
    </div>
  );
}
