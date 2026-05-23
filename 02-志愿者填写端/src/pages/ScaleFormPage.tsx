import { useMemo, useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { submitScaleRecord } from '../api';
import { createScaleAnswers } from '../data/scaleQuestions';
import type { AssignedElder, ScaleAnswer, ScaleType } from '../types';

interface ScaleFormPageProps {
  elder: AssignedElder;
  onBack: () => void;
}

const scaleLabels: Record<ScaleType, string> = {
  'PHQ-9': 'PHQ-9',
  'GAD-7': 'GAD-7',
  'UCLA': 'UCLA',
};

const optionLabels: Record<ScaleType, string[]> = {
  'PHQ-9': ['从不(0分)', '几天(1分)', '一半以上(2分)', '几乎每天(3分)'],
  'GAD-7': ['完全不会(0分)', '好几天(1分)', '超过一周(2分)', '几乎每天(3分)'],
  'UCLA': ['从不(1分)', '很少(2分)', '有时(3分)', '一直(4分)'],
};

export function ScaleFormPage({ elder, onBack }: ScaleFormPageProps) {
  const [activeScale, setActiveScale] = useState<ScaleType>('PHQ-9');
  const [phq9, setPhq9] = useState<ScaleAnswer[]>(() => createScaleAnswers('PHQ-9'));
  const [gad7, setGad7] = useState<ScaleAnswer[]>(() => createScaleAnswers('GAD-7'));
  const [ucla, setUcla] = useState<ScaleAnswer[]>(() => createScaleAnswers('UCLA'));

  const currentAnswers = activeScale === 'PHQ-9' ? phq9 : activeScale === 'GAD-7' ? gad7 : ucla;
  const currentSet = activeScale === 'PHQ-9' ? setPhq9 : activeScale === 'GAD-7' ? setGad7 : setUcla;

  const answeredCount = useMemo(() => currentAnswers.filter((a) => a.value !== null).length, [currentAnswers]);
  const totalScore = useMemo(() => currentAnswers.reduce((sum: number, a) => sum + (a.value ?? 0), 0), [currentAnswers]);

  function handleSelect(index: number, value: number) {
    currentSet((prev: ScaleAnswer[]) => {
      const next = [...prev];
      next[index] = { ...next[index], value };
      return next;
    });
  }

  async function handleSubmit() {
    const scale = { type: activeScale, answers: currentAnswers } as import('../types').ScaleForm;
    await submitScaleRecord(elder.id, scale);
    alert(`${scaleLabels[activeScale]} 量表已保存，总分 ${totalScore}`);
    onBack();
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="chip" onClick={onBack} style={{ color: '#fff', background: 'rgba(255,255,255,0.2)', border: 'none' }}>
          <ArrowLeft size={16} />
        </button>
        <h1 style={{ margin: 0, fontSize: 16 }}>量表填写</h1>
        <div style={{ width: 40 }} />
      </header>

      <section className="card">
        <div className="scale-tabs">
          {(Object.keys(scaleLabels) as ScaleType[]).map((type) => (
            <button key={type} className={activeScale === type ? 'scale-tab active' : 'scale-tab'} onClick={() => setActiveScale(type)}>
              {scaleLabels[type]}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: '#5f6f7a' }}>进度 {answeredCount}/{currentAnswers.length}</span>
          <span style={{ fontSize: 13, color: '#126b78', fontWeight: 600 }}>总分 {totalScore}</span>
        </div>

        {currentAnswers.map((item, index) => (
          <div className="question" key={index}>
            <p>{index + 1}. {item.question}</p>
            <div className="choice-row">
              {optionLabels[activeScale].map((label, score) => (
                <button
                  key={score}
                  className={item.value === score ? 'chip selected' : 'chip'}
                  onClick={() => handleSelect(index, score)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="scale-footer">
          <div>当前量表：{scaleLabels[activeScale]}</div>
          <div>已答 {answeredCount} 题 / 共 {currentAnswers.length} 题</div>
          <div>当前总分：{totalScore}</div>
          <div className="disclaimer">量表只作为随访记录，不作为诊断结论。</div>
{activeScale === 'UCLA' && (
  <div className="disclaimer" style={{ marginTop: 6, color: '#b45309' }}>
    Demo 阶段暂按原始分展示，UCLA 第 7、10 题为反向计分题，正式版将自动反转。
  </div>
)}
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
