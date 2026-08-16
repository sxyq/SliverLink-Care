import { BadgeInfo, CalendarDays, ChevronRight, ClipboardList, Shield, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchScaleDetail } from '../api/scanApi';
import { BottomTabBar } from '../components/BottomTabBar';
import { PageTopBar } from '../components/PageTopBar';
import { formatDate } from '../utils/format';
import type { ScaleAnswerDetail, ScaleSummary } from '../types';
import { useI18n } from '../i18n';

interface ScaleDetailPageProps {
  data: ScaleSummary[] | null;
  loading: boolean;
  sessionId?: string;
  elderId?: string;
}

function getScaleCopy(item: ScaleSummary) {
  const score = item.score;

  if (item.name === 'PHQ-9') {
    return {
      titleKey: 'scan.scaleDepressionDetailTitle',
      levelKey: score <= 4 ? 'scan.scoreMild' : score <= 9 ? 'scan.scoreAttention' : 'scan.scoreFollowup',
      noteKey: 'scan.phqNote',
    };
  }

  if (item.name === 'GAD-7') {
    return {
      titleKey: 'scan.scaleAnxietyDetailTitle',
      levelKey: score <= 4 ? 'scan.scoreMild' : score <= 9 ? 'scan.scoreAttention' : 'scan.scoreFollowup',
      noteKey: 'scan.gadNote',
    };
  }

  return {
    titleKey: 'scan.scaleLonelinessDetailTitle',
    levelKey: score <= 20 ? 'scan.scoreMild' : score <= 40 ? 'scan.scoreAttention' : 'scan.scoreFollowup',
    noteKey: 'scan.uclaNote',
  };
}

function getAnswerLabel(scaleName: ScaleSummary['name'], value: number | null, translate: (key: string) => string) {
  if (value == null) return translate('scan.unanswered');

  const optionKeys: Record<ScaleSummary['name'], string[]> = {
    'PHQ-9': ['scan.answerNever', 'scan.answerFewDays', 'scan.answerMoreThanHalf', 'scan.answerNearlyEveryDay'],
    'GAD-7': ['scan.answerNotAtAll', 'scan.answerSeveralDays', 'scan.answerOverAWeek', 'scan.answerNearlyEveryDay'],
    UCLA: ['scan.answerNever', 'scan.answerRarely', 'scan.answerSometimes', 'scan.answerAlways'],
  };

  return optionKeys[scaleName][value] ? translate(optionKeys[scaleName][value]) : translate('scan.optionNumber').replace('{value}', String(value));
}

function getQuestionLabel(
  scaleName: ScaleSummary['name'],
  index: number,
  question: string,
  translate: (key: string) => string,
) {
  const questionKey = scaleName === 'PHQ-9'
    ? `scan.scalePhqQuestion${index + 1}`
    : scaleName === 'GAD-7'
      ? `scan.scaleGadQuestion${index + 1}`
      : `workbench.scaleUclaQuestion${index + 1}`;
  const localized = translate(questionKey);
  return localized === questionKey ? question : localized;
}

export function ScaleDetailPage({ data, loading, sessionId = '', elderId = '' }: ScaleDetailPageProps) {
  const navigate = useNavigate();
  const params = useParams();
  const { t } = useI18n();
  const [resolvedDetail, setResolvedDetail] = useState<ScaleSummary | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const current = useMemo(() => {
    const scaleName = decodeURIComponent(params.scaleName || '');
    return data?.find((item) => item.name === scaleName) || null;
  }, [data, params.scaleName]);

  useEffect(() => {
    let cancelled = false;
    if (!current || current.answers != null || !sessionId || !elderId) {
      setResolvedDetail(null);
      setDetailLoading(false);
      return;
    }
    setDetailLoading(true);
    fetchScaleDetail(sessionId, current.name, elderId)
      .then((detail) => {
        if (!cancelled) {
          setResolvedDetail(detail);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDetailLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [current, elderId, sessionId]);

  if (loading) return <div className="sl-page loading">{t('common.loading')}</div>;
  if (!current) return <div className="sl-page loading">{t('scan.scaleNotFoundDetail')}</div>;

  const detail = resolvedDetail || current;
  const copy = getScaleCopy(detail);
  const answers: ScaleAnswerDetail[] = detail.answers || [];

  return (
    <div className="sl-page sl-detail-page sl-has-bottom-nav">
      <PageTopBar title={detail.name} leading="back" trailing="menu" />

      <section className="sl-panel sl-scale-detail-hero">
        <div className="sl-scale-detail-score">
          <div className="sl-scale-detail-score-label">{t('scan.currentScore')}</div>
          <strong className="sl-ltr-data" dir="ltr">{detail.score}</strong>
        </div>
        <div className="sl-scale-detail-copy">
          <h2>{t(copy.titleKey)}</h2>
          <p>{t(copy.levelKey)}</p>
        </div>
      </section>

      <section className="sl-panel sl-info-block">
        <div className="sl-info-block-head">
          <span className="sl-info-block-icon is-blue">
            <ClipboardList size={18} />
          </span>
          <div className="sl-info-block-title">{t('scan.recordDetails')}</div>
        </div>

        <div className="sl-detail-rows">
          <div className="sl-detail-row">
            <span className="sl-detail-row-icon">
              <CalendarDays size={16} />
            </span>
            <span className="sl-detail-row-label">{t('common.recordDate')}：</span>
            <strong className="sl-ltr-data">{formatDate(detail.updatedAt)}</strong>
          </div>

          <div className="sl-detail-row">
            <span className="sl-detail-row-icon">
              <UserRound size={16} />
            </span>
            <span className="sl-detail-row-label">{t('common.recorder')}：</span>
            <strong>{detail.volunteer || t('common.noRecords')}</strong>
          </div>

          <div className="sl-detail-row">
            <span className="sl-detail-row-icon">
              <BadgeInfo size={16} />
            </span>
            <span className="sl-detail-row-label">{t('scan.resultDescription')}：</span>
            <strong>{t(copy.noteKey)}</strong>
          </div>
        </div>
      </section>

      <section className="sl-panel sl-info-block">
        <div className="sl-info-block-head">
          <span className="sl-info-block-icon is-blue">
            <BadgeInfo size={18} />
          </span>
          <div>
            <div className="sl-info-block-title">{t('scan.questionRecords')}</div>
            <div className="sl-scale-answer-meta">{t('scan.viewAsChildWindow')}</div>
          </div>
        </div>

        <div className="sl-scale-answer-panel">
          <div className="sl-scale-answer-scroll">
            <div className="sl-scale-answer-list">
              {detailLoading ? (
                <div className="sl-detail-row">
                  <span className="sl-detail-row-label">{t('scan.currentlyLoadingAnswers')}</span>
                  <strong>{t('scan.pleaseWait')}</strong>
                </div>
              ) : answers.length > 0 ? (
                answers.map((answer, index) => (
                  <div key={`${detail.name}-${index}`} className="sl-scale-answer-row">
                    <div className="sl-scale-answer-question">
                      <span className="sl-scale-answer-index">{index + 1}</span>
                      <p>{getQuestionLabel(detail.name, index, answer.question, t)}</p>
                    </div>
                    <div className="sl-scale-answer-value">
                      <strong>{getAnswerLabel(detail.name, answer.value, t)}</strong>
                      <span>{answer.value == null ? t('scan.notAnswered') : (<><span className="sl-ltr-data" dir="ltr">{answer.value}</span>{' '}{t('common.points')}</>)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="sl-detail-row">
                  <span className="sl-detail-row-label">{t('scan.noStepRecordsTitle')}</span>
                  <strong>{t('scan.noStepRecords')}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <button type="button" className="sl-panel sl-scale-next-card" onClick={() => navigate('/scale')}>
        <div>
          <div className="sl-scale-next-title">{t('scan.scaleList')}</div>
          <div className="sl-scale-next-subtitle">{t('scan.continueOtherScales')}</div>
        </div>
        <ChevronRight className="is-directional" size={18} />
      </button>

      <div className="sl-privacy-pill">
        <Shield size={16} />
        {t('common.privacyProtection')}
      </div>

      <BottomTabBar />
    </div>
  );
}
