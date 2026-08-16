import { ClipboardList, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppAttribution } from '../components/AppAttribution';
import { BottomTabBar } from '../components/BottomTabBar';
import { PageTopBar } from '../components/PageTopBar';
import { formatDate } from '../utils/format';
import type { ScaleSummary } from '../types';
import { useI18n } from '../i18n';

interface ScaleSummaryPageProps {
  data: ScaleSummary[] | null;
  loading: boolean;
}

export function ScaleSummaryPage({ data, loading }: ScaleSummaryPageProps) {
  const navigate = useNavigate();
  const { t } = useI18n();

  if (loading) return <div className="sl-page loading">{t('common.loading')}</div>;
  if (!data || data.length === 0) return <div className="sl-page loading">{t('scan.noScaleSummary')}</div>;

  return (
    <div className="sl-page sl-detail-page sl-has-bottom-nav">
      <PageTopBar title={t('scan.scaleRecords')} leading="back" trailing="menu" />

      <div className="sl-list-stack">
        {data.map((item) => (
          <button
            type="button"
            className="sl-panel sl-scale-summary-card sl-scale-summary-button"
            key={item.name}
            onClick={() => navigate(`/scale/${encodeURIComponent(item.name)}`)}
          >
            <div className="sl-list-card-icon is-blue">
              <ClipboardList size={24} />
            </div>
            <div className="sl-list-card-body">
              <h3>{item.name}</h3>
              <p>
                {t('scan.recentUpdate')}： <span className="sl-ltr-data" dir="ltr">{formatDate(item.updatedAt)}</span> | {t('scan.score')} <strong className="sl-ltr-data" dir="ltr">{item.score}</strong>
              </p>
            </div>
          </button>
        ))}
      </div>

      <div className="sl-privacy-pill">
        <Shield size={16} />
        {t('common.privacyProtection')}
      </div>

      <AppAttribution />
      <BottomTabBar />
    </div>
  );
}
