import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { updateBasicInfo, sendSmsVerify, verifySmsCode } from '../api';
import type { AssignedElder, BasicInfo } from '../types';
import { FormSection } from '../components/FormSection';
import { PageHeader } from '../components/PageHeader';
import { SelectChips } from '../components/SelectChips';
import { SubmitBar } from '../components/SubmitBar';
import { TextInput } from '../components/TextInput';

interface BasicInfoFormPageProps {
  elder: AssignedElder;
  onBack: () => void;
}

const defaultBasicInfo: BasicInfo = {
  name: '',
  gender: '男',
  age: '',
  residence: '',
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      name: elder.name,
      gender: elder.gender === '女' ? '女' : '男',
      age: String(elder.age),
      residence: elder.residence || '',
      emergencyContactName: elder.emergencyContactName || '',
      emergencyContactPhone: elder.emergencyContactPhone || '',
      emergencyContactRelation: elder.emergencyContactRelation || '',
      aboBloodType: elder.aboType || '',
      rhBloodType: elder.rhType || '',
      allergyHistory: elder.allergySummary || '',
    });
  }, [elder]);

  function handleChange(field: keyof BasicInfo, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'emergencyContactPhone') {
      setShowSms(true);
      setSmsSent(false);
    }
  }

  async function handleSendSms() {
    if (!form.emergencyContactPhone) return;
    await sendSmsVerify(form.emergencyContactPhone);
    setSmsSent(true);
  }

  async function handleSubmit() {
    setSaving(true);
    try {
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
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sl-page sl-page-compact-form">
      <PageHeader title="基本信息编辑" onBack={onBack} />

      <FormSection title="基础信息">
        <div className="sl-form-grid">
          <TextInput label="姓名" value={form.name} onChange={(value) => handleChange('name', value)} />
          <label className="sl-label">
            <span className="sl-label-text">性别</span>
            <SelectChips options={['男', '女']} value={form.gender} onChange={(value) => handleChange('gender', value)} />
          </label>
          <TextInput label="年龄" type="number" value={form.age} onChange={(value) => handleChange('age', value)} />
          <TextInput label="居住地" value={form.residence} onChange={(value) => handleChange('residence', value)} />
          <TextInput label="ABO 血型" value={form.aboBloodType} onChange={(value) => handleChange('aboBloodType', value)} placeholder="如 A / B / AB / O" />
          <TextInput label="Rh 血型" value={form.rhBloodType} onChange={(value) => handleChange('rhBloodType', value)} placeholder="如 阳性 / 阴性" />
          <label className="sl-label sl-label-full">
            <span className="sl-label-text">过敏史</span>
            <textarea
              className="sl-textarea"
              value={form.allergyHistory}
              onChange={(event) => handleChange('allergyHistory', event.target.value)}
              placeholder="请输入过敏信息或既往不良反应"
              rows={2}
            />
          </label>
          <div className="sl-compact-subtitle sl-label-full">
            <ShieldAlert size={16} color="var(--sl-primary)" />
            <span>紧急联系人</span>
          </div>
          <TextInput label="联系人" value={form.emergencyContactName} onChange={(value) => handleChange('emergencyContactName', value)} />
          <TextInput label="与老人关系" value={form.emergencyContactRelation} onChange={(value) => handleChange('emergencyContactRelation', value)} />
          <div className="sl-label sl-label-full">
            <TextInput
              label="联系电话"
              type="tel"
              value={form.emergencyContactPhone}
              onChange={(value) => handleChange('emergencyContactPhone', value)}
            />
          </div>
          {showSms ? (
            <div className="sl-sms-panel sl-label-full">
            <div className="sl-sms-alert">
              <ShieldAlert size={14} />
              <span>联系人电话修改后需进行短信验真，确认信息归属准确。</span>
            </div>
            <div className="sl-sms-row">
              <input
                className="sl-input"
                placeholder="请输入短信验证码"
                value={smsCode}
                onChange={(event) => setSmsCode(event.target.value)}
              />
              <button type="button" className="sl-btn sl-btn-secondary sl-inline-btn" onClick={handleSendSms}>
                {smsSent ? '已发送' : '获取验证码'}
              </button>
            </div>
            </div>
          ) : null}
        </div>
      </FormSection>

      <SubmitBar onSubmit={() => void handleSubmit()} loading={saving} />
    </div>
  );
}
