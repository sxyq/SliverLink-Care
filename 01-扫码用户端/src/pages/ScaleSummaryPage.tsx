import { ClipboardList, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppAttribution } from '../components/AppAttribution';
import { BottomTabBar } from '../components/BottomTabBar';
import { PageTopBar } from '../components/PageTopBar';
import { formatDate } from '../utils/format';
import type { ScaleSummary } from '../types';

interface ScaleSummaryPageProps {
  data: ScaleSummary[] | null;
  loading: boolean;
}

export function ScaleSummaryPage({ data, loading }: ScaleSummaryPageProps) {
  const navigate = useNavigate();

  if (loading) return <div className="sl-page loading">加载中...</div>;
  if (!data || data.length === 0) return <div className="sl-page loading">暂无量表记录</div>;

  return (
    <div className="sl-page sl-detail-page sl-has-bottom-nav">
      <PageTopBar title="量表记录" leading="back" trailing="menu" />

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
                最近记录： {formatDate(item.updatedAt)} | 分数 <strong>{item.score}</strong>
              </p>
            </div>
          </button>
        ))}
      </div>

      <div className="sl-privacy-pill">
        <Shield size={16} />
        隐私保护
      </div>

      <AppAttribution />
      <BottomTabBar />
    </div>
  );
}
