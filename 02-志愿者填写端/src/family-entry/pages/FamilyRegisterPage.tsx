import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import TopBar from '../components/TopBar';

const RELATIONSHIPS = ['配偶', '子女', '兄弟姐妹', '其他'];

export default function FamilyRegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const code = (location.state as { code?: string })?.code || '';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors['name'] = '请输入姓名';
    if (!phone.trim()) {
      newErrors['phone'] = '请输入手机号';
    } else if (!/^1[3-9]\d{9}$/.test(phone)) {
      newErrors['phone'] = '手机号格式不正确';
    }
    if (!relationship) newErrors['relationship'] = '请选择与老人关系';
    if (!password) {
      newErrors['password'] = '请输入密码';
    } else if (password.length < 6) {
      newErrors['password'] = '密码至少6位';
    }
    if (password !== confirmPassword) {
      newErrors['confirmPassword'] = '两次密码不一致';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    navigate('/verify', { state: { code, name, phone, relationship, password } });
  };

  return (
    <div>
      <TopBar title="家属协管账号注册" />
      <div className="page-container">
        <div className="card">
          <div className="form-group">
            <label className="form-label">姓名</label>
            <input
              className={`form-input${errors['name'] ? ' error' : ''}`}
              placeholder="请输入您的姓名"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {errors['name'] && <div className="form-error">{errors['name']}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">手机号</label>
            <input
              className={`form-input${errors['phone'] ? ' error' : ''}`}
              placeholder="请输入手机号"
              type="tel"
              maxLength={11}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {errors['phone'] && <div className="form-error">{errors['phone']}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">与老人关系</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {RELATIONSHIPS.map((rel) => (
                <span
                  key={rel}
                  className={`chip${relationship === rel ? ' active' : ''}`}
                  onClick={() => setRelationship(rel)}
                >
                  {rel}
                </span>
              ))}
            </div>
            {errors['relationship'] && <div className="form-error">{errors['relationship']}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">密码</label>
            <input
              className={`form-input${errors['password'] ? ' error' : ''}`}
              placeholder="请设置登录密码（至少6位）"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {errors['password'] && <div className="form-error">{errors['password']}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">确认密码</label>
            <input
              className={`form-input${errors['confirmPassword'] ? ' error' : ''}`}
              placeholder="请再次输入密码"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {errors['confirmPassword'] && <div className="form-error">{errors['confirmPassword']}</div>}
          </div>
        </div>

        <button className="btn btn-primary btn-block mt-16" onClick={handleSubmit}>
          下一步：短信验证
        </button>
      </div>
    </div>
  );
}
