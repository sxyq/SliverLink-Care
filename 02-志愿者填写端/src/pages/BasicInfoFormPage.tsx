import { useEffect, useState } from 'react';
import { ArrowLeft, Save, ShieldAlert } from 'lucide-react';
import { updateBasicInfo, sendSmsVerify, verifySmsCode } from '../api';
import type { AssignedElder, BasicInfo } from '../types';

interface BasicInfoFormPageProps {
  elder: AssignedElder;
  onBack: () => void;
}

const defaultBasicInfo: BasicInfo = {
  name: '',
  gender: '男',
  age: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelation: '',
  aboBloodType: '',
  rhBloodType: '',
  allergyHistory: '',
};

export function BasicInfoFormPage({ elder, onBack }: BasicInfoFormPageProps) {
  const [form, setForm] = useState<BasicInfo>(defaultBasicInfo);
  const [showSms, setShowSms] = useState(false);
  const [smsCode, setSmsCode] = useState('');
  const [smsSent, setSmsSent] = useState(false);

  useEffect(() => {
    setForm({
      name: elder.name,
      gender: elder.gender === '女' ? '女' : '男',
      age: String(elder.age),
      emergencyContactName: elder.emergencyContactName || '',
      emergencyContactPhone: elder.emergencyContactPhone || '',
      emergencyContactRelation: elder.emergencyContactRelation || '',
      aboBloodType: elder.aboType || '',
      rhBloodType: elder.rhType || '',
      allergyHistory: elder.allergySummary || '',
    });
  }, [elder]);

  function handleChange(field: keyof BasicInfo, value: string) {
    setForm((prev: BasicInfo) => ({ ...prev, [field]: value }));
    if (field === 'emergencyContactPhone') {
      setShowSms(true);
    }
  }

  async function handleSendSms() {
    if (!form.emergencyContactPhone) return;
    await sendSmsVerify(form.emergencyContactPhone);
    setSmsSent(true);
  }

  async function handleSubmit() {
    if (showSms && smsCode) {
      const verify = await verifySmsCode(form.emergencyContactPhone, smsCode);
      if (!verify.ok) {
        alert('验证码错误');
        return;
      }
    }
    await updateBasicInfo(elder.id, form);
    alert('基本信息已保存');
    onBack();
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="chip" onClick={onBack} style={{ color: '#fff', background: 'rgba(255,255,255,0.2)', border: 'none' }}>
          <ArrowLeft size={16} />
        </button>
        <h1 style={{ margin: 0, fontSize: 16 }}>基本信息编辑</h1>
        <div style={{ width: 40 }} />
      </header>

      <section className="card">
        <div className="section-title">
          <h2>基本信息</h2>
        </div>
        <div className="form-grid">
          <label>
            姓名
            <input value={form.name} onChange={(e) => handleChange('name', e.target.value)} />
          </label>
          <label>
            性别
            <div className="choice-row" style={{ margin: 0 }}>
              {(['男', '女'] as const).map((g) => (
                <button
                  key={g}
                  className={form.gender === g ? 'chip selected' : 'chip'}
                  onClick={() => handleChange('gender', g)}
                >
                  {g}
                </button>
              ))}
            </div>
          </label>
          <label>
            年龄
            <input type="number" value={form.age} onChange={(e) => handleChange('age', e.target.value)} />
          </label>
          <label>
            ABO 血型
            <select value={form.aboBloodType} onChange={(e) => handleChange('aboBloodType', e.target.value)}>
              <option value="">请选择</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="AB">AB</option>
              <option value="O">O</option>
            </select>
          </label>
          <label>
            Rh 血型
            <select value={form.rhBloodType} onChange={(e) => handleChange('rhBloodType', e.target.value)}>
              <option value="">请选择</option>
              <option value="Rh阳性">Rh阳性</option>
              <option value="Rh阴性">Rh阴性</option>
            </select>
          </label>
        </div>
        <label style={{ marginTop: 12 }}>
          过敏史
          <textarea value={form.allergyHistory} onChange={(e) => handleChange('allergyHistory', e.target.value)} />
        </label>
      </section>

      <section className="card">
        <div className="section-title">
          <h2>紧急联系人</h2>
        </div>
        <div className="form-grid">
          <label>
            联系人
            <input value={form.emergencyContactName} onChange={(e) => handleChange('emergencyContactName', e.target.value)} />
          </label>
          <label>
            与老人关系
            <input value={form.emergencyContactRelation} onChange={(e) => handleChange('emergencyContactRelation', e.target.value)} />
          </label>
        </div>
        <label style={{ marginTop: 12 }}>
          联系电话
          <input type="tel" value={form.emergencyContactPhone} onChange={(e) => handleChange('emergencyContactPhone', e.target.value)} />
        </label>
        {showSms && (
          <div className="sms-hint">
            <ShieldAlert size={14} />
            <span>修改身份信息或紧急联系人需短信验真</span>
          </div>
        )}
        {showSms && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input
              placeholder="请输入验证码"
              value={smsCode}
              onChange={(e) => setSmsCode(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="chip" onClick={handleSendSms}>
              {smsSent ? '已发送' : '获取验证码'}
            </button>
          </div>
        )}
      </section>

      <div className="submit-bar">
        <button className="btn-primary" onClick={handleSubmit}>
          <Save size={18} />
          提交保存
        </button>
      </div>
    </div>
  );
}
