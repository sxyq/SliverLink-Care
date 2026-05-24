import React, { useState } from 'react';
import { LockKeyhole, User, UserRoundCheck } from 'lucide-react';
import { loginVolunteer } from '../api/volunteerApi';
import { useAuth } from '../app/AuthProvider';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
            <h2 className="sl-login-title">志愿者登录</h2>
            <div className="sl-login-fields">
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

              {error ? <p className="sl-login-error">{error}</p> : null}

              <button className="sl-btn sl-btn-primary" onClick={handleLogin} disabled={loading}>
                {loading ? '登录中…' : '登录'}
              </button>
            </div>
          </section>

          <div className="sl-attribution">重庆医科大学护理学院 银龄守护团队</div>
        </div>
      </section>
    </div>
  );
};
