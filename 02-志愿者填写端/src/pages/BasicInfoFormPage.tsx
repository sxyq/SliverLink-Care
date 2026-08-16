import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { updateBasicInfo, sendSmsVerify, verifySmsCode } from '../api';
import type { AssignedElder, BasicInfo } from '../types';
import { FormSection } from '../components/FormSection';
import { PageHeader } from '../components/PageHeader';
import { SelectChips } from '../components/SelectChips';
import { SubmitBar } from '../components/SubmitBar';
import { TextInput } from '../components/TextInput';
import { useI18n } from '../i18n';

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
  const { t } = useI18n();
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
    try {
      await sendSmsVerify(form.emergencyContactPhone);
      setSmsSent(true);
    } catch (e) {
      alert(t('errors.sendSmsFailed'));
    }
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      if (showSms && smsCode) {
        const verify = await verifySmsCode(form.emergencyContactPhone, smsCode);
        if (!verify.ok) {
          alert(t('errors.smsCodeInvalid'));
          return;
        }
      }
      await updateBasicInfo(elder.id, form);
      alert(t('errors.basicInfoSaved'));
      onBack();
    } catch (e) {
      alert(t('errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sl-page sl-basic-info-page">
      <PageHeader title={t('workbench.basicInfoEdit')} onBack={onBack} />

      <FormSection
        title={t('workbench.basicInfo')}
        hint={t('workbench.basicInfoHint')}
        className="sl-basic-info-section"
      >
        <div className="sl-form-grid">
          <TextInput label={t('common.name')} value={form.name} onChange={(value) => handleChange('name', value)} />
          <label className="sl-label">
            <span className="sl-label-text">{t('common.gender')}</span>
            <SelectChips
              options={['男', '女']}
              value={form.gender}
              onChange={(value) => handleChange('gender', value)}
              getLabel={(value) => value === '男' ? t('common.male') : t('common.female')}
            />
          </label>
          <TextInput label={t('common.age')} type="number" value={form.age} onChange={(value) => handleChange('age', value)} placeholder={t('workbench.agePlaceholder')} />
          <TextInput label={t('common.address')} value={form.residence} onChange={(value) => handleChange('residence', value)} placeholder={t('workbench.residencePlaceholder')} />
          <TextInput label={t('scan.aboType')} value={form.aboBloodType} onChange={(value) => handleChange('aboBloodType', value)} placeholder="A / B / AB / O" />
          <TextInput label={t('scan.rhType')} value={form.rhBloodType} onChange={(value) => handleChange('rhBloodType', value)} placeholder="+ / -" />
          <label className="sl-label sl-label-full">
            <span className="sl-label-text">{t('common.allergyHistory')}</span>
            <textarea
              className="sl-textarea"
              value={form.allergyHistory}
              onChange={(event) => handleChange('allergyHistory', event.target.value)}
              placeholder={t('workbench.allergyPlaceholder')}
              rows={2}
            />
          </label>
          <div className="sl-compact-subtitle sl-label-full">
            <ShieldAlert size={16} color="var(--sl-primary)" />
            <span>{t('scan.emergencyContact')}</span>
          </div>
          <TextInput label={t('common.contact')} value={form.emergencyContactName} onChange={(value) => handleChange('emergencyContactName', value)} placeholder={t('workbench.contactNamePlaceholder')} />
          <TextInput label={t('common.relationship')} value={form.emergencyContactRelation} onChange={(value) => handleChange('emergencyContactRelation', value)} placeholder={t('workbench.relationshipPlaceholder')} />
          <div className="sl-label sl-label-full">
            <TextInput
              label={t('common.contactPhone')}
              type="tel"
              value={form.emergencyContactPhone}
              onChange={(value) => handleChange('emergencyContactPhone', value)}
            />
          </div>
          {showSms ? (
            <div className="sl-sms-panel sl-label-full">
              <div className="sl-sms-alert">
                <ShieldAlert size={14} />
                <span>{t('workbench.emergencyContactNote')}</span>
              </div>
              <div className="sl-sms-row">
                <input
                  className="sl-input sl-ltr-data"
                  dir="ltr"
                  placeholder={t('workbench.inputSmsCode')}
                  value={smsCode}
                  onChange={(event) => setSmsCode(event.target.value)}
                />
                <button type="button" className="sl-btn sl-btn-secondary sl-inline-btn" onClick={handleSendSms}>
                  {smsSent ? t('common.sent') : t('common.getCode')}
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
