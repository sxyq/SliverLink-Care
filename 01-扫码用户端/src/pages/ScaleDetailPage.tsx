import { BadgeInfo, CalendarDays, ChevronRight, ClipboardList, Shield, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchScaleDetail } from '../api/scanApi';
import { BottomTabBar } from '../components/BottomTabBar';
import { PageTopBar } from '../components/PageTopBar';
import { formatDate } from '../utils/format';
import type { ScaleAnswerDetail, ScaleSummary } from '../types';

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
      title: '抑郁情绪筛查',
      level: score <= 4 ? '当前分值处于较轻范围' : score <= 9 ? '当前分值提示需持续关注' : '当前分值建议进一步随访',
      note: 'PHQ-9 用于了解近两周情绪、兴趣和睡眠等变化，分值越高越需要持续关注。',
    };
  }

  if (item.name === 'GAD-7') {
    return {
      title: '焦虑情绪筛查',
      level: score <= 4 ? '当前分值处于较轻范围' : score <= 9 ? '当前分值提示需持续关注' : '当前分值建议进一步随访',
      note: 'GAD-7 用于了解紧张、担忧和坐立不安等焦虑表现，分值越高越需要持续关注。',
    };
  }

  return {
    title: '孤独感筛查',
    level: score <= 20 ? '当前分值处于较轻范围' : score <= 40 ? '当前分值提示需持续关注' : '当前分值建议进一步随访',
    note: 'UCLA 用于了解老人近阶段的孤独感和社会联结状态，可结合陪伴与沟通情况一起判断。',
  };
}

function getAnswerLabel(scaleName: ScaleSummary['name'], value: number | null) {
  if (value == null) return '未填写';

  const optionLabels: Record<ScaleSummary['name'], string[]> = {
    'PHQ-9': ['从不', '几天', '一半以上', '几乎每天'],
    'GAD-7': ['完全不会', '好几天', '超过一周', '几乎每天'],
    UCLA: ['从不', '很少', '有时', '一直'],
  };

  return optionLabels[scaleName][value] || `选项 ${value}`;
}

export function ScaleDetailPage({ data, loading, sessionId = '', elderId = '' }: ScaleDetailPageProps) {
  const navigate = useNavigate();
  const params = useParams();
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

  if (loading) return <div className="sl-page loading">加载中...</div>;
  if (!current) return <div className="sl-page loading">未找到量表详情</div>;

  const detail = resolvedDetail || current;
  const copy = getScaleCopy(detail);
  const answers: ScaleAnswerDetail[] = detail.answers || [];

  return (
    <div className="sl-page sl-detail-page sl-has-bottom-nav">
      <PageTopBar title={detail.name} leading="back" trailing="menu" />

      <section className="sl-panel sl-scale-detail-hero">
        <div className="sl-scale-detail-score">
          <div className="sl-scale-detail-score-label">当前分数</div>
          <strong>{detail.score}</strong>
        </div>
        <div className="sl-scale-detail-copy">
          <h2>{copy.title}</h2>
          <p>{copy.level}</p>
        </div>
      </section>

      <section className="sl-panel sl-info-block">
        <div className="sl-info-block-head">
          <span className="sl-info-block-icon is-blue">
            <ClipboardList size={18} />
          </span>
          <div className="sl-info-block-title">记录详情</div>
        </div>

        <div className="sl-detail-rows">
          <div className="sl-detail-row">
            <span className="sl-detail-row-icon">
              <CalendarDays size={16} />
            </span>
            <span className="sl-detail-row-label">记录日期：</span>
            <strong>{formatDate(detail.updatedAt)}</strong>
          </div>

          <div className="sl-detail-row">
            <span className="sl-detail-row-icon">
              <UserRound size={16} />
            </span>
            <span className="sl-detail-row-label">记录人员：</span>
            <strong>{detail.volunteer || '暂无记录'}</strong>
          </div>

          <div className="sl-detail-row">
            <span className="sl-detail-row-icon">
              <BadgeInfo size={16} />
            </span>
            <span className="sl-detail-row-label">结果说明：</span>
            <strong>{copy.note}</strong>
          </div>
        </div>
      </section>

      <section className="sl-panel sl-info-block">
        <div className="sl-info-block-head">
          <span className="sl-info-block-icon is-blue">
            <BadgeInfo size={18} />
          </span>
          <div>
            <div className="sl-info-block-title">各题填写结果</div>
            <div className="sl-scale-answer-meta">作为子窗口查看，可在内部上下滑动</div>
          </div>
        </div>

        <div className="sl-scale-answer-panel">
          <div className="sl-scale-answer-scroll">
            <div className="sl-scale-answer-list">
              {detailLoading ? (
                <div className="sl-detail-row">
                  <span className="sl-detail-row-label">正在读取逐题记录</span>
                  <strong>请稍候...</strong>
                </div>
              ) : answers.length > 0 ? (
                answers.map((answer, index) => (
                  <div key={`${detail.name}-${index}`} className="sl-scale-answer-row">
                    <div className="sl-scale-answer-question">
                      <span className="sl-scale-answer-index">{index + 1}</span>
                      <p>{answer.question}</p>
                    </div>
                    <div className="sl-scale-answer-value">
                      <strong>{getAnswerLabel(detail.name, answer.value)}</strong>
                      <span>{answer.value == null ? '未作答' : `${answer.value} 分`}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="sl-detail-row">
                  <span className="sl-detail-row-label">暂无逐题记录</span>
                  <strong>当前数据源还未保存每题答案</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <button type="button" className="sl-panel sl-scale-next-card" onClick={() => navigate('/scale')}>
        <div>
          <div className="sl-scale-next-title">返回量表列表</div>
          <div className="sl-scale-next-subtitle">继续查看其他量表记录</div>
        </div>
        <ChevronRight size={18} />
      </button>

      <div className="sl-privacy-pill">
        <Shield size={16} />
        隐私保护
      </div>

      <BottomTabBar />
    </div>
  );
}
