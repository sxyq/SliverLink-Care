import { useMemo, useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { saveHealthRecord } from '../api';
import { calculateBMI } from '../utils/bmi';
import type { AssignedElder, HealthFormState } from '../types';

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

  const bmi = useMemo(() => calculateBMI(form.heightCm, form.weightKg), [form.heightCm, form.weightKg]);

  function handleChange(field: keyof HealthFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    await saveHealthRecord(elder.id, form);
    alert('健康档案已保存');
    onBack();
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="chip" onClick={onBack} style={{ color: '#fff', background: 'rgba(255,255,255,0.2)', border: 'none' }}>
          <ArrowLeft size={16} />
        </button>
        <h1 style={{ margin: 0, fontSize: 16 }}>健康档案填写</h1>
        <div style={{ width: 40 }} />
      </header>

      <section className="card">
        <div className="form-grid">
          <label>
            身高
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="number" value={form.heightCm} onChange={(e) => handleChange('heightCm', e.target.value)} />
              <span style={{ color: '#5f6f7a', fontSize: 13 }}>cm</span>
            </div>
          </label>
          <label>
            体重
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="number" value={form.weightKg} onChange={(e) => handleChange('weightKg', e.target.value)} />
              <span style={{ color: '#5f6f7a', fontSize: 13 }}>kg</span>
            </div>
          </label>
          <label>
            腰围
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="number" value={form.waistCm} onChange={(e) => handleChange('waistCm', e.target.value)} />
              <span style={{ color: '#5f6f7a', fontSize: 13 }}>cm</span>
            </div>
          </label>
          <label>
            BMI
            <input readOnly value={bmi} />
          </label>
        </div>
      </section>

      <section className="card">
        <div className="section-title"><h2>自评健康状况</h2></div>
        <div className="choice-row">
          {healthOptions.map((opt) => (
            <button key={opt} className={form.healthSelfAssessment === opt ? 'chip selected' : 'chip'} onClick={() => handleChange('healthSelfAssessment', opt)}>
              {opt}
            </button>
          ))}
        </div>

        <div className="section-title"><h2>生活自理能力自评</h2></div>
        <div className="choice-row">
          {selfCareOptions.map((opt) => (
            <button key={opt} className={form.selfCareAssessment === opt ? 'chip selected' : 'chip'} onClick={() => handleChange('selfCareAssessment', opt)}>
              {opt}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="section-title"><h2>认知功能粗筛（近1个月）</h2></div>
        <div className="choice-row">
          {cognitiveOptions.map((opt) => (
            <button key={opt} className={form.cognitiveScreening === opt ? 'chip selected' : 'chip'} onClick={() => handleChange('cognitiveScreening', opt)}>
              {opt}
            </button>
          ))}
        </div>

        <div className="section-title"><h2>情感状态粗筛（近2周）</h2></div>
        <div className="choice-row">
          {emotionOptions.map((opt) => (
            <button key={opt} className={form.emotionScreening === opt ? 'chip selected' : 'chip'} onClick={() => handleChange('emotionScreening', opt)}>
              {opt}
            </button>
          ))}
        </div>
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
