import { useState } from 'react';
import { ChevronDown, ClipboardList } from 'lucide-react';
import type { ScaleName, ScaleSummary } from '../types';

interface ScaleSummaryCardProps {
  items: ScaleSummary[];
}

const SCALE_META: Record<ScaleName, { title: string; maxScore: number; questions: string[] }> = {
  'PHQ-9': {
    title: '抑郁症筛查量表',
    maxScore: 27,
    questions: [
      '做事提不起劲或没有兴趣',
      '感到心情低落、沮丧或绝望',
      '睡眠困难或睡眠过多',
      '感觉疲倦或没有活力',
      '食欲不振或吃太多',
      '觉得自己很糟或让家人失望',
      '注意力难以集中',
      '动作或说话变慢，或烦躁不安',
      '出现伤害自己的念头',
    ],
  },
  'GAD-7': {
    title: '广泛性焦虑障碍量表',
    maxScore: 21,
    questions: [
      '感觉紧张、焦虑或急切',
      '不能停止或控制担忧',
      '对各种事情担忧过多',
      '很难放松下来',
      '由于不安而无法静坐',
      '容易烦恼或急躁',
      '害怕将有可怕事情发生',
    ],
  },
  UCLA: {
    title: 'UCLA 孤独感量表',
    maxScore: 80,
    questions: [
      '与周围人的关系是否和谐',
      '是否感到缺少伙伴',
      '是否感到没人可以信赖',
      '是否感到寂寞',
      '是否感到有人真正了解自己',
      '是否感到有人值得信赖',
    ],
  },
};

function getLevel(item: ScaleSummary) {
  if (item.level) return item.level;
  if (item.name === 'PHQ-9') {
    if (item.score >= 20) return '重度';
    if (item.score >= 15) return '中重度';
    if (item.score >= 10) return '中度';
    if (item.score >= 5) return '轻度';
    return '正常范围';
  }
  if (item.name === 'GAD-7') {
    if (item.score >= 15) return '重度';
    if (item.score >= 10) return '中度';
    if (item.score >= 5) return '轻度';
    return '正常范围';
  }
  if (item.score >= 44) return '偏高';
  if (item.score >= 28) return '需关注';
  return '正常范围';
}

export function ScaleSummaryCard({ items }: ScaleSummaryCardProps) {
  const [activeName, setActiveName] = useState<ScaleName | null>(null);

  return (
    <div className="sl-scale-list">
      {items.map((item) => {
        const meta = SCALE_META[item.name];
        const open = activeName === item.name;
        return (
          <button
            className={`sl-scale-item ${open ? 'open' : ''}`}
            key={item.name}
            type="button"
            onClick={() => setActiveName(open ? null : item.name)}
          >
            <div className="sl-scale-summary-row">
              <div className="sl-scale-header">
                <span className="sl-scale-icon-box">
                  <ClipboardList size={22} />
                </span>
                <span>
                  <span className="sl-scale-name">{item.name}</span>
                  <span className="sl-scale-title">{meta.title}</span>
                </span>
              </div>
              <div className="sl-scale-score">
                <strong>{item.score}</strong>
                <span>分</span>
                <ChevronDown size={16} className={open ? 'rotate' : ''} />
              </div>
            </div>

            <div className="sl-scale-meta">
              最近记录：{item.updatedAt || '未填写'} | 结果：{getLevel(item)}
            </div>

            {open && (
              <div className="sl-scale-detail">
                <div className="sl-scale-detail-grid">
                  <div>
                    <span>量表总分</span>
                    <strong>{item.score} / {meta.maxScore}</strong>
                  </div>
                  <div>
                    <span>负责人员</span>
                    <strong>{item.volunteer || '未记录'}</strong>
                  </div>
                </div>
                <div className="sl-scale-question-list">
                  {meta.questions.map((question, index) => (
                    <div className="sl-scale-question" key={question}>
                      <span>{index + 1}</span>
                      <p>{question}</p>
                    </div>
                  ))}
                </div>
                <p className="sl-scale-detail-note">
                  当前接口返回摘要分数；逐题答案接入后将在此处展示每题选择结果。
                </p>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
