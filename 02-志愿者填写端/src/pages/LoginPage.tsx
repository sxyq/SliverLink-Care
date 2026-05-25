import React, { useState } from 'react';
import { KeyRound, LockKeyhole, Phone, User, UserRoundCheck } from 'lucide-react';
import { loginVolunteer, previewVolunteerInvitation, registerVolunteer } from '../api/volunteerApi';
import { useAuth } from '../app/AuthProvider';
import type { InvitationPreview } from '../family-entry/types';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    invitationCode: '',
    name: '',
    account: '',
    phone: '',
    password: '',
  });
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null);
  const [inviteChecking, setInviteChecking] = useState(false);

  async function handleLogin() {
    setError('');
    setLoading(true);
    try {
      const res = await loginVolunteer(account, password);
      if (res.ok) {
        login(res.token, {
          account: account.trim(),
          name: res.name?.trim() || account.trim(),
        });
      } else {
        setError('账号或密码错误');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setError(message || '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckInvitation() {
    const code = registerForm.invitationCode.trim().toUpperCase();
    if (!code) {
      setError('请输入邀请码');
      setInvitation(null);
      return;
    }
    setError('');
    setInviteChecking(true);
    try {
      const result = await previewVolunteerInvitation(code);
      setInvitation(result);
      setRegisterForm((prev) => ({ ...prev, invitationCode: code }));
    } catch (inviteError) {
      setInvitation(null);
      setError(inviteError instanceof Error ? inviteError.message : '邀请码校验失败');
    } finally {
      setInviteChecking(false);
    }
  }

  async function handleRegister() {
    const invitationCode = registerForm.invitationCode.trim().toUpperCase();
    const name = registerForm.name.trim();
    const nextAccount = registerForm.account.trim();
    const nextPassword = registerForm.password.trim();

    if (!invitationCode) {
      setError('请输入邀请码');
      return;
    }
    if (!name || !nextAccount || !nextPassword) {
      setError('请完整填写邀请码、姓名、账号和密码');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await registerVolunteer({
        invitationCode,
        name,
        account: nextAccount,
        phone: registerForm.phone.trim(),
        password: nextPassword,
      });
      if (res.ok) {
        login(res.token, {
          account: nextAccount,
          name: res.name?.trim() || name,
        });
      } else {
        setError('注册失败，请稍后重试');
      }
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sl-login-page">
      <section className="sl-login-shell">
        <div className="sl-login-content">
          <div className="sl-login-hero">
            <div className="sl-login-brand">
              <div className="sl-login-icon">
                <UserRoundCheck size={48} />
              </div>
              <h1>智联名牌</h1>
              <p>用 心 守 护  温 暖 相 伴</p>
            </div>
          </div>

          <section className="sl-login-panel">
            <div className="sl-login-mode-tabs" role="tablist" aria-label="登录或注册">
              <button
                type="button"
                className={mode === 'login' ? 'is-active' : ''}
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
              >
                志愿者登录
              </button>
              <button
                type="button"
                className={mode === 'register' ? 'is-active' : ''}
                onClick={() => {
                  setMode('register');
                  setError('');
                }}
              >
                邀请码注册
              </button>
            </div>
            <div className="sl-login-fields">
              {mode === 'login' ? (
                <>
                  <h2 className="sl-login-title">志愿者登录</h2>
                  <label className="sl-label">
                    <span className="sl-label-text">账号</span>
                    <div className="sl-input-wrap">
                      <User size={18} className="sl-login-input-icon" />
                      <input
                        className="sl-input sl-login-input"
                        placeholder="请输入账号"
                        value={account}
                        onChange={(e) => setAccount(e.target.value)}
                      />
                    </div>
                  </label>

                  <label className="sl-label">
                    <span className="sl-label-text">密码</span>
                    <div className="sl-input-wrap">
                      <LockKeyhole size={18} className="sl-login-input-icon" />
                      <input
                        className="sl-input sl-login-input"
                        type="password"
                        placeholder="请输入密码"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </label>
                </>
              ) : (
                <>
                  <h2 className="sl-login-title">输入邀请码注册</h2>
                  <p className="sl-login-hint">请输入管理员发放的邀请码，注册后会自动关联到对应老人档案。</p>

                  <label className="sl-label">
                    <span className="sl-label-text">邀请码</span>
                    <div className="sl-input-wrap">
                      <KeyRound size={18} className="sl-login-input-icon" />
                      <input
                        className="sl-input sl-login-input"
                        placeholder="请输入邀请码"
                        value={registerForm.invitationCode}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, invitationCode: e.target.value }))}
                      />
                    </div>
                  </label>

                  <button className="sl-btn sl-btn-secondary" type="button" onClick={handleCheckInvitation} disabled={inviteChecking}>
                    {inviteChecking ? '校验中…' : '验证邀请码'}
                  </button>

                  {invitation ? (
                    <div className="sl-login-preview">
                      <strong>邀请码可用</strong>
                      <span>关联老人：{invitation.elderName}，{invitation.elderAge} 岁</span>
                      <span>档案编号：{invitation.elderArchiveNo}</span>
                      <span>有效期至：{invitation.expiresAt}</span>
                    </div>
                  ) : null}

                  <label className="sl-label">
                    <span className="sl-label-text">姓名</span>
                    <div className="sl-input-wrap">
                      <User size={18} className="sl-login-input-icon" />
                      <input
                        className="sl-input sl-login-input"
                        placeholder="请输入姓名"
                        value={registerForm.name}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                  </label>

                  <label className="sl-label">
                    <span className="sl-label-text">账号</span>
                    <div className="sl-input-wrap">
                      <User size={18} className="sl-login-input-icon" />
                      <input
                        className="sl-input sl-login-input"
                        placeholder="请设置登录账号"
                        value={registerForm.account}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, account: e.target.value }))}
                      />
                    </div>
                  </label>

                  <label className="sl-label">
                    <span className="sl-label-text">手机号</span>
                    <div className="sl-input-wrap">
                      <Phone size={18} className="sl-login-input-icon" />
                      <input
                        className="sl-input sl-login-input"
                        placeholder="选填，用于后续联系"
                        value={registerForm.phone}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                  </label>

                  <label className="sl-label">
                    <span className="sl-label-text">密码</span>
                    <div className="sl-input-wrap">
                      <LockKeyhole size={18} className="sl-login-input-icon" />
                      <input
                        className="sl-input sl-login-input"
                        type="password"
                        placeholder="请设置登录密码"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                      />
                    </div>
                  </label>
                </>
              )}

              {error ? <p className="sl-login-error">{error}</p> : null}

              <button className="sl-btn sl-btn-primary" onClick={mode === 'login' ? handleLogin : handleRegister} disabled={loading}>
                {loading ? (mode === 'login' ? '登录中…' : '注册中…') : (mode === 'login' ? '登录' : '注册并进入')}
              </button>
            </div>
          </section>

          <div className="sl-attribution">重庆医科大学护理学院 银龄守护团队</div>
        </div>
      </section>
    </div>
  );
};
