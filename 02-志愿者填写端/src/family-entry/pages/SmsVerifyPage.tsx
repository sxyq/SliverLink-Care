import { useEffect, useSyncExternalStore } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import TopBar from '../components/TopBar';
import SmsVerifyInput from '../components/SmsVerifyInput';
import { sendSmsCode, verifySmsCode } from '../api/smsApi';
import { registerWithInvitation, sendInvitationSms } from '../api/invitationApi';
import {
  getVerificationState,
  initVerification,
  resetCountdown,
  switchToBackup,
  setVerified,
  subscribe,
} from '../features/verification/verificationStore';

export default function SmsVerifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    code?: string;
    name?: string;
    phone?: string;
    relationship?: string;
    password?: string;
    backupPhone?: string;
  } | null;

  const vState = useSyncExternalStore(subscribe, getVerificationState);
  const isInvitationRegister = !!(state?.code && state.name && state.phone && state.relationship && state.password);

  useEffect(() => {
    if (!state?.phone || (state?.code === undefined && state?.backupPhone === undefined)) {
      navigate('/login', { replace: true });
    }
  }, [navigate, state]);

  const sendCurrentSms = async (phone: string) => {
    const result = isInvitationRegister && state?.code
      ? await sendInvitationSms(state.code, phone)
      : await sendSmsCode(phone);
    if (!result.success) {
      alert(result.message || '验证码发送失败');
    }
  };

  useEffect(() => {
    const phone = state?.phone || '';
    const backupPhone = state?.backupPhone || undefined;
    if (phone) {
      initVerification(phone, backupPhone);
      sendCurrentSms(phone);
    }
  }, []);

  const handleResend = async () => {
    if (!vState.canResend) return;
    await sendCurrentSms(vState.phone);
    resetCountdown();
  };

  const handleSwitchBackup = async () => {
    const nextPhone = vState.backupPhone || vState.phone;
    switchToBackup();
    await sendCurrentSms(nextPhone);
  };

  const handleComplete = async (code: string) => {
    if (isInvitationRegister && state) {
      const regResult = await registerWithInvitation({
        code: state.code!,
        name: state.name!,
        phone: vState.phone || state.phone!,
        relationship: state.relationship!,
        password: state.password!,
        smsCode: code,
      });
      if (regResult.success) {
        setVerified(true);
        navigate('/', { replace: true });
      } else {
        alert(regResult.message);
      }
      return;
    }

    const result = await verifySmsCode(vState.phone, code);
    if (result.success) {
      setVerified(true);
      navigate('/login', { replace: true });
    } else {
      alert(result.message);
    }
  };

  return (
    <div>
      <TopBar title="短信验证" />
      <div className="page-container">
        <div style={{ textAlign: 'center', marginBottom: 32, marginTop: 20 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: '#FFF3E0',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}>
            <ShieldAlert size={24} color="var(--sl-warn)" />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>短信验真</h2>
          <p className="text-secondary mt-8">
            验证码已发送至 <span style={{ fontWeight: 500, color: 'var(--sl-text)' }}>{vState.maskedPhone}</span>
          </p>
        </div>

        <SmsVerifyInput onComplete={handleComplete} />

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          {vState.canResend ? (
            <button className="btn btn-outline btn-sm" onClick={handleResend}>
              重新发送
            </button>
          ) : (
            <span className="text-secondary" style={{ fontSize: 13 }}>
              {vState.countdown} 秒后可重新发送
            </span>
          )}
        </div>

        {vState.backupPhone && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            {vState.canSwitchBackup ? (
              <button className="btn btn-outline btn-sm" onClick={handleSwitchBackup}>
                切换备用手机号
              </button>
            ) : (
              <span className="text-secondary" style={{ fontSize: 12 }}>
                主手机号收不到验证码，{vState.backupCountdown} 秒后可切换备用手机号
              </span>
            )}
          </div>
        )}

        <div className="info-banner mt-24">
          <ShieldAlert size={16} />
          <span>邀请码注册后会绑定到当前家属账号；单个家属账号最多可绑定 4 位老人。</span>
        </div>
      </div>
    </div>
  );
}
