import { useState } from 'react';
import { ChevronDown, ClipboardList } from 'lucide-react';
import type { ScaleName, ScaleSummary } from '../types';
import { useI18n } from '../i18n';

interface ScaleSummaryCardProps {
  items: ScaleSummary[];
}

const SCALE_META: Record<ScaleName, { titleKey: string; maxScore: number; questionKeys: string[] }> = {
  'PHQ-9': {
    titleKey: 'scan.scalePhqTitle',
    maxScore: 27,
    questionKeys: [
      'scan.scalePhqQuestion1', 'scan.scalePhqQuestion2', 'scan.scalePhqQuestion3',
      'scan.scalePhqQuestion4', 'scan.scalePhqQuestion5', 'scan.scalePhqQuestion6',
      'scan.scalePhqQuestion7', 'scan.scalePhqQuestion8', 'scan.scalePhqQuestion9',
    ],
  },
  'GAD-7': {
    titleKey: 'scan.scaleGadTitle',
    maxScore: 21,
    questionKeys: [
      'scan.scaleGadQuestion1', 'scan.scaleGadQuestion2', 'scan.scaleGadQuestion3',
      'scan.scaleGadQuestion4', 'scan.scaleGadQuestion5', 'scan.scaleGadQuestion6',
      'scan.scaleGadQuestion7',
    ],
  },
  UCLA: {
    titleKey: 'scan.scaleUclaTitle',
    maxScore: 80,
    questionKeys: [
      'scan.scaleUclaQuestion1', 'scan.scaleUclaQuestion2', 'scan.scaleUclaQuestion3',
      'scan.scaleUclaQuestion4', 'scan.scaleUclaQuestion5', 'scan.scaleUclaQuestion6',
    ],
  },
};

function getLevelKey(item: ScaleSummary) {
  if (item.level) return '';
  if (item.name === 'PHQ-9') {
    if (item.score >= 20) return 'scan.levelSevere';
    if (item.score >= 15) return 'scan.levelModerateSevere';
    if (item.score >= 10) return 'scan.levelModerate';
    if (item.score >= 5) return 'scan.levelMild';
    return 'scan.levelNormal';
  }
  if (item.name === 'GAD-7') {
    if (item.score >= 15) return 'scan.levelSevere';
    if (item.score >= 10) return 'scan.levelModerate';
    if (item.score >= 5) return 'scan.levelMild';
    return 'scan.levelNormal';
  }
  if (item.score >= 44) return 'scan.levelHigh';
  if (item.score >= 28) return 'scan.levelAttention';
  return 'scan.levelNormal';
}

export function ScaleSummaryCard({ items }: ScaleSummaryCardProps) {
  const [activeName, setActiveName] = useState<ScaleName | null>(null);
  const { t } = useI18n();

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
                  <span className="sl-scale-title">{t(meta.titleKey)}</span>
                </span>
              </div>
              <div className="sl-scale-score">
                <strong className="sl-ltr-data" dir="ltr">{item.score}</strong>
                <span>{t('common.points')}</span>
                <ChevronDown size={16} className={open ? 'rotate' : ''} />
              </div>
            </div>

            <div className="sl-scale-meta">
              {t('scan.recentRecord')}：<span className="sl-ltr-data">{item.updatedAt || t('scan.unanswered')}</span> | {t('scan.result')}：{item.level || t(getLevelKey(item))}
            </div>

            {open && (
              <div className="sl-scale-detail">
                <div className="sl-scale-detail-grid">
                  <div>
                    <span>{t('scan.scaleTotal')}</span>
                    <strong className="sl-ltr-data" dir="ltr">{item.score} / {meta.maxScore}</strong>
                  </div>
                  <div>
                    <span>{t('scan.responsible')}</span>
                    <strong className="sl-auto-data" dir="auto">{item.volunteer || t('scan.unrecorded')}</strong>
                  </div>
                </div>
                <div className="sl-scale-question-list">
                  {meta.questionKeys.map((questionKey, index) => (
                    <div className="sl-scale-question" key={questionKey}>
                      <span>{index + 1}</span>
                      <p>{t(questionKey)}</p>
                    </div>
                  ))}
                </div>
                <p className="sl-scale-detail-note">
                  {t('scan.summaryOnly')}
                </p>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
