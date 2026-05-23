import React, { useState } from 'react';
import { UserRoundCheck } from 'lucide-react';
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
        login(res.token);
      } else {
        setError('账号或密码错误');
      }
    } catch (e) {
      setError('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sl-login-page">
      <section className="sl-login-card">
        <div className="sl-login-brand">
          <div className="sl-login-icon">
            <UserRoundCheck size={40} />
          </div>
          <h1>智联名牌</h1>
          <p>用心守护 温暖相伴</p>
        </div>
        <div className="sl-login-fields">
          <label className="sl-login-label">
            <span>账号</span>
            <input
              className="sl-input"
              placeholder="请输入账号"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            />
          </label>
          <label className="sl-login-label">
            <span>密码</span>
            <input
              className="sl-input"
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <p className="sl-login-error">{error}</p>}
          <button className="sl-btn sl-btn-primary" onClick={handleLogin} disabled={loading}>
            {loading ? '登录中…' : '登录'}
          </button>
          <p className="sl-login-hint">仅显示本人负责的社区老人</p>
        </div>
      </section>
    </div>
  );
};
