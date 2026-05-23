import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserRoundCheck } from 'lucide-react';
import { familyLogin } from '../api/familyAuthApi';

export default function FamilyLoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!phone.trim() || !password) {
      setError('请输入手机号和密码');
      return;
    }
    setLoading(true);
    try {
      const result = await familyLogin({ phone, password });
      if (result.success) {
        navigate('/', { replace: true });
      } else {
        setError(result.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ paddingTop: 60 }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'var(--sl-chip-bg)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}>
          <UserRoundCheck size={32} color="var(--sl-primary)" />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--sl-text)' }}>家属协管登录</h1>
        <p className="text-secondary mt-8">登录后可管理已绑定老人的联系人、用药和二维码信息</p>
      </div>

      <div className="card">
        <div className="form-group">
          <label className="form-label">手机号</label>
          <input
            className="form-input"
            placeholder="请输入手机号"
            type="tel"
            maxLength={11}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">密码</label>
          <input
            className="form-input"
            placeholder="请输入密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
        </div>

        {error && (
          <div style={{ color: 'var(--sl-danger)', fontSize: 13, marginBottom: 12 }}>{error}</div>
        )}

        <button
          className="btn btn-primary btn-block"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? '登录中...' : '登录'}
        </button>
      </div>

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Link to="/invite/INVITE001" style={{ fontSize: 13, color: 'var(--sl-primary)' }}>
          通过邀请码注册
        </Link>
      </div>
    </div>
  );
}
