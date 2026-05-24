import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { loginAdmin } from '../api/adminApi';

export function AdminLoginPage({ onLogin }: { onLogin: (role: string) => void }) {
  const [account, setAccount] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin() {
    setError('');
    setSubmitting(true);
    try {
      const result = await loginAdmin(account.trim(), password.trim());
      if (result.ok) {
        onLogin(result.role || '系统管理员');
      } else {
        setError('登录失败，请检查账号或密码');
      }
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : '登录请求失败，请检查本地接口配置');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <ShieldCheck size={40} color="#115f72" />
        </div>
        <h1>智联名牌管理后台</h1>
        <input
          placeholder="账号"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
        />
        <input
          placeholder="密码"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p style={{ color: '#c2410c', fontSize: 13, margin: 0 }}>{error}</p>
        )}
        <button onClick={handleLogin} disabled={submitting}>
          {submitting ? '登录中...' : '账号密码登录'}
        </button>
      </section>
    </main>
  );
}
