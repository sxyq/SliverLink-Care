import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, PencilLine } from 'lucide-react';
import { fetchScaleRecords, submitScaleRecord } from '../api';
import { createScaleAnswers } from '../data/scaleQuestions';
import type { AssignedElder, ScaleAnswer, ScaleType } from '../types';
import { PageHeader } from '../components/PageHeader';
import { ScaleQuestion } from '../components/ScaleQuestion';
import { SubmitBar } from '../components/SubmitBar';

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
  'PHQ-9': ['从不', '几天', '一半以上', '几乎每天'],
  'GAD-7': ['完全不会', '好几天', '超过一周', '几乎每天'],
  'UCLA': ['从不', '很少', '有时', '一直'],
};

const EMPTY_RECORD_META: Record<ScaleType, { date: string; volunteer: string; score: number; hasSaved: boolean }> = {
  'PHQ-9': { date: '', volunteer: '', score: 0, hasSaved: false },
  'GAD-7': { date: '', volunteer: '', score: 0, hasSaved: false },
  'UCLA': { date: '', volunteer: '', score: 0, hasSaved: false },
};

function mergeScaleAnswers(type: ScaleType, incoming: ScaleAnswer[] = []): ScaleAnswer[] {
  const template = createScaleAnswers(type);
  return template.map((item, index) => {
    const matched = incoming.find((answer) => answer.question === item.question) ?? incoming[index];
    return {
      ...item,
      value: matched?.value ?? null,
    };
  });
}

export function ScaleFormPage({ elder, onBack }: ScaleFormPageProps) {
  const [activeScale, setActiveScale] = useState<ScaleType>('PHQ-9');
  const [phq9, setPhq9] = useState<ScaleAnswer[]>(() => createScaleAnswers('PHQ-9'));
  const [gad7, setGad7] = useState<ScaleAnswer[]>(() => createScaleAnswers('GAD-7'));
  const [ucla, setUcla] = useState<ScaleAnswer[]>(() => createScaleAnswers('UCLA'));
  const [recordMeta, setRecordMeta] = useState(EMPTY_RECORD_META);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loadError, setLoadError] = useState('');

  const currentAnswers = activeScale === 'PHQ-9' ? phq9 : activeScale === 'GAD-7' ? gad7 : ucla;
  const currentSet = activeScale === 'PHQ-9' ? setPhq9 : activeScale === 'GAD-7' ? setGad7 : setUcla;
  const currentMeta = recordMeta[activeScale];

  const answeredCount = useMemo(() => currentAnswers.filter((a) => a.value !== null).length, [currentAnswers]);
  const totalScore = useMemo(() => currentAnswers.reduce((sum, a) => sum + (a.value ?? 0), 0), [currentAnswers]);
  const progressPercent = currentAnswers.length === 0 ? 0 : Math.round((answeredCount / currentAnswers.length) * 100);
  const hasDetailedAnswers = answeredCount > 0;
  const displayScore = currentMeta.hasSaved && !hasDetailedAnswers ? currentMeta.score : totalScore;

  async function loadScaleData() {
    setLoading(true);
    setLoadError('');
    try {
      const rows = await fetchScaleRecords(elder.id);
      const byType = new Map(rows.map((row) => [row.scale, row] as const));
      const phqRecord = byType.get('PHQ-9');
      const gadRecord = byType.get('GAD-7');
      const uclaRecord = byType.get('UCLA');

      setPhq9(mergeScaleAnswers('PHQ-9', phqRecord?.answers));
      setGad7(mergeScaleAnswers('GAD-7', gadRecord?.answers));
      setUcla(mergeScaleAnswers('UCLA', uclaRecord?.answers));
      setRecordMeta({
        'PHQ-9': {
          date: phqRecord?.date || '',
          volunteer: phqRecord?.volunteer || '',
          score: phqRecord?.score || 0,
          hasSaved: Boolean(phqRecord),
        },
        'GAD-7': {
          date: gadRecord?.date || '',
          volunteer: gadRecord?.volunteer || '',
          score: gadRecord?.score || 0,
          hasSaved: Boolean(gadRecord),
        },
        'UCLA': {
          date: uclaRecord?.date || '',
          volunteer: uclaRecord?.volunteer || '',
          score: uclaRecord?.score || 0,
          hasSaved: Boolean(uclaRecord),
        },
      });
    } catch (error) {
      setPhq9(createScaleAnswers('PHQ-9'));
      setGad7(createScaleAnswers('GAD-7'));
      setUcla(createScaleAnswers('UCLA'));
      setRecordMeta(EMPTY_RECORD_META);
      setLoadError(error instanceof Error ? error.message : '加载量表失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setEditing(false);
    void loadScaleData();
  }, [elder.id]);

  function handleSelect(index: number, value: number) {
    if (!editing) return;
    currentSet((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], value };
      return next;
    });
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      const scale = { type: activeScale, answers: currentAnswers } as import('../types').ScaleForm;
      await submitScaleRecord(elder.id, scale);
      await loadScaleData();
      setEditing(false);
      alert(`${scaleLabels[activeScale]} 量表已保存，总分 ${totalScore}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sl-page">
      <PageHeader title="量表填写" subtitle={elder.name} onBack={onBack} />

      <section className="sl-card sl-card-soft">
        <div className="sl-scale-tabs">
          {(Object.keys(scaleLabels) as ScaleType[]).map((type) => (
            <button
              key={type}
              type="button"
              className={`sl-tab${activeScale === type ? ' sl-tab-active' : ''}`}
              onClick={() => setActiveScale(type)}
            >
              {scaleLabels[type]}
            </button>
          ))}
        </div>
      </section>

      <section className="sl-scale-progress-card">
        <div className="sl-scale-progress-row">
          <span>进度 {answeredCount}/{currentAnswers.length}</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="sl-progress-track">
          <div className="sl-progress-bar" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="sl-scale-progress-row">
          <span>当前量表：{scaleLabels[activeScale]}</span>
          <strong style={{ color: 'var(--sl-primary-deep)' }}>总分 {displayScore}</strong>
        </div>
        <div className="sl-scale-progress-row">
          <span>{currentMeta.hasSaved ? `最近保存：${currentMeta.date || '未记录日期'}` : '当前暂无已保存记录'}</span>
          <button
            type="button"
            className={editing ? 'sl-btn sl-btn-secondary sl-scale-inline-btn' : 'sl-btn sl-btn-primary sl-scale-inline-btn'}
            onClick={() => setEditing((value) => !value)}
            disabled={loading || saving}
          >
            <PencilLine size={16} />
            {editing ? '取消编辑' : currentMeta.hasSaved ? '编辑量表' : '开始填写'}
          </button>
        </div>
      </section>

      <section className="sl-card sl-scale-window">
        <div className="sl-scale-window-head">
          <strong>{scaleLabels[activeScale]} 题目</strong>
          <span>{editing ? '编辑模式：可修改并保存' : '查看模式：点击编辑后才可修改'}</span>
        </div>
        <div className="sl-scale-window-body">
          {loadError ? <p className="sl-login-error">{loadError}</p> : null}
          {!loadError && currentMeta.hasSaved && !hasDetailedAnswers ? (
            <p className="sl-field-note">当前已保存历史总分，但旧记录未保留逐题答案；点击编辑后可重新完善本量表。</p>
          ) : null}
          {currentAnswers.map((item, index) => (
            <ScaleQuestion
              key={`${activeScale}-${index}`}
              index={index}
              item={item}
              options={optionLabels[activeScale].map((label, optionIndex) =>
                activeScale === 'UCLA' ? `${label}(${optionIndex + 1}分)` : `${label}(${optionIndex}分)`,
              )}
              onChange={(value) => handleSelect(index, value)}
              readOnly={!editing}
            />
          ))}
        </div>
      </section>

      <div className="sl-disclaimer">
        <AlertCircle size={16} />
        <span>量表结果仅作为随访记录，不作为临床诊断结论。请结合老人近况和实际评估综合判断。</span>
      </div>

      {editing ? <SubmitBar onSubmit={() => void handleSubmit()} loading={saving} /> : null}
    </div>
  );
}
