import { useMemo, useState } from 'react';
import { saveHealthRecord } from '../api';
import { calculateBMI } from '../utils/bmi';
import type { AssignedElder, HealthFormState } from '../types';
import { FormSection } from '../components/FormSection';
import { PageHeader } from '../components/PageHeader';
import { SelectChips } from '../components/SelectChips';
import { SubmitBar } from '../components/SubmitBar';
import { TextInput } from '../components/TextInput';

interface HealthRecordFormPageProps {
  elder: AssignedElder;
  onBack: () => void;
}

const defaultForm: HealthFormState = {
  heightCm: '',
  weightKg: '',
  waistCm: '',
  healthSelfAssessment: '',
  selfCareAssessment: '',
  cognitiveScreening: '',
  emotionScreening: '',
};

const healthOptions = ['很好', '较好', '一般', '较差', '很差'];
const selfCareOptions = ['完全自理', '部分自理', '不能自理'];
const cognitiveOptions = ['正常', '可疑', '异常'];
const emotionOptions = ['无明显异常', '轻度', '中度', '重度'];

export function HealthRecordFormPage({ elder, onBack }: HealthRecordFormPageProps) {
  const [form, setForm] = useState<HealthFormState>(defaultForm);
  const [saving, setSaving] = useState(false);

  const bmi = useMemo(() => calculateBMI(form.heightCm, form.weightKg), [form.heightCm, form.weightKg]);

  function handleChange(field: keyof HealthFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      await saveHealthRecord(elder.id, form);
      alert('健康档案已保存');
      onBack();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sl-page">
      <PageHeader title="健康档案填写" subtitle={elder.name} onBack={onBack} />

      <FormSection title="健康指标">
        <div className="sl-metric-grid">
          <div className="sl-metric-row">
            <span className="sl-label-text">身高</span>
            <TextInput label="" type="number" value={form.heightCm} onChange={(value) => handleChange('heightCm', value)} suffix="cm" />
          </div>
          <div className="sl-metric-row">
            <span className="sl-label-text">体重</span>
            <TextInput label="" type="number" value={form.weightKg} onChange={(value) => handleChange('weightKg', value)} suffix="kg" />
          </div>
          <div className="sl-metric-row">
            <span className="sl-label-text">腰围</span>
            <TextInput label="" type="number" value={form.waistCm} onChange={(value) => handleChange('waistCm', value)} suffix="cm" />
          </div>
          <div className="sl-metric-row">
            <span className="sl-label-text">BMI</span>
            <TextInput label="" value={bmi} onChange={() => undefined} readOnly />
          </div>
        </div>
      </FormSection>

      <FormSection title="自评健康状况">
        <SelectChips options={healthOptions} value={form.healthSelfAssessment} onChange={(value) => handleChange('healthSelfAssessment', value)} />
      </FormSection>

      <FormSection title="生活自理能力">
        <SelectChips options={selfCareOptions} value={form.selfCareAssessment} onChange={(value) => handleChange('selfCareAssessment', value)} />
      </FormSection>

      <FormSection title="认知功能筛查（近 1 个月）">
        <SelectChips options={cognitiveOptions} value={form.cognitiveScreening} onChange={(value) => handleChange('cognitiveScreening', value)} />
      </FormSection>

      <FormSection title="情绪状态筛查（近 2 周）">
        <SelectChips options={emotionOptions} value={form.emotionScreening} onChange={(value) => handleChange('emotionScreening', value)} />
      </FormSection>

      <SubmitBar onSubmit={() => void handleSubmit()} loading={saving} />
    </div>
  );
}
