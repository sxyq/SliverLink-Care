import { useMemo, useState } from 'react';
import { saveHealthRecord } from '../api';
import { calculateBMI } from '../utils/bmi';
import type { AssignedElder, HealthFormState } from '../types';
import { FormSection } from '../components/FormSection';
import { PageHeader } from '../components/PageHeader';
import { SelectChips } from '../components/SelectChips';
import { SubmitBar } from '../components/SubmitBar';
import { TextInput } from '../components/TextInput';
import { useI18n } from '../i18n';

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
  const { t } = useI18n();
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
      alert(t('errors.healthRecordSaved'));
      onBack();
    } catch (e) {
      alert(t('errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sl-page">
      <PageHeader title={t('workbench.healthRecordForm')} subtitle={elder.name} onBack={onBack} />

      <FormSection title={t('workbench.healthIndicators')}>
        <div className="sl-metric-grid">
          <div className="sl-metric-row">
            <span className="sl-label-text">{t('scan.height')}</span>
            <TextInput label="" type="number" value={form.heightCm} onChange={(value) => handleChange('heightCm', value)} suffix="cm" />
          </div>
          <div className="sl-metric-row">
            <span className="sl-label-text">{t('scan.weight')}</span>
            <TextInput label="" type="number" value={form.weightKg} onChange={(value) => handleChange('weightKg', value)} suffix="kg" />
          </div>
          <div className="sl-metric-row">
            <span className="sl-label-text">{t('workbench.waist')}</span>
            <TextInput label="" type="number" value={form.waistCm} onChange={(value) => handleChange('waistCm', value)} suffix="cm" />
          </div>
          <div className="sl-metric-row">
            <span className="sl-label-text">BMI</span>
            <TextInput label="" type="number" value={bmi} onChange={() => undefined} readOnly />
          </div>
        </div>
      </FormSection>

      <FormSection title={t('workbench.selfRatedHealth')}>
        <SelectChips
          options={healthOptions}
          value={form.healthSelfAssessment}
          onChange={(value) => handleChange('healthSelfAssessment', value)}
          getLabel={(value) => ({ 很好: t('workbench.veryGood'), 较好: t('workbench.good'), 一般: t('workbench.average'), 较差: t('workbench.poor'), 很差: t('workbench.veryPoor') } as Record<string, string>)[value] || value}
        />
      </FormSection>

      <FormSection title={t('workbench.selfCareAbility')}>
        <SelectChips
          options={selfCareOptions}
          value={form.selfCareAssessment}
          onChange={(value) => handleChange('selfCareAssessment', value)}
          getLabel={(value) => ({ 完全自理: t('workbench.fullyIndependent'), 部分自理: t('workbench.partlyIndependent'), 不能自理: t('workbench.dependent') } as Record<string, string>)[value] || value}
        />
      </FormSection>

      <FormSection title={t('workbench.cognitiveScreening')}>
        <SelectChips
          options={cognitiveOptions}
          value={form.cognitiveScreening}
          onChange={(value) => handleChange('cognitiveScreening', value)}
          getLabel={(value) => ({ 正常: t('scan.levelNormal'), 可疑: t('workbench.suspicious'), 异常: t('workbench.abnormal') } as Record<string, string>)[value] || value}
        />
      </FormSection>

      <FormSection title={t('workbench.emotionScreening')}>
        <SelectChips
          options={emotionOptions}
          value={form.emotionScreening}
          onChange={(value) => handleChange('emotionScreening', value)}
          getLabel={(value) => ({ 无明显异常: t('workbench.noObviousAbnormality'), 轻度: t('scan.levelMild'), 中度: t('scan.levelModerate'), 重度: t('scan.levelSevere') } as Record<string, string>)[value] || value}
        />
      </FormSection>

      <SubmitBar onSubmit={() => void handleSubmit()} loading={saving} />
    </div>
  );
}
