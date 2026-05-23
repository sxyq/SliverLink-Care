import { FileText, ShieldCheck } from 'lucide-react';
import { ScaleSummaryCard } from '../components/ScaleSummaryCard';
import { VerificationBadge } from '../components/VerificationBadge';
import type { ScaleSummary } from '../types';

interface ScaleSummaryPageProps {
  data: ScaleSummary[] | null;
  loading: boolean;
}

export function ScaleSummaryPage({ data, loading }: ScaleSummaryPageProps) {
  if (loading) return <div className="sl-page loading">加载中...</div>;
  if (!data || data.length === 0) return <div className="sl-page loading">暂无量表记录</div>;

  return (
    <div className="sl-page">
      <header className="sl-hero slim">
        <div>
          <h1>量表记录</h1>
          <p>点击量表可查看记录详情</p>
        </div>
        <ShieldCheck size={32} />
      </header>

      <div className="sl-badge-bar">
        <VerificationBadge state="verified" />
      </div>

      <section className="sl-card">
        <div className="sl-section-title">
          <FileText size={20} />
          <h2>量表摘要</h2>
        </div>
        <ScaleSummaryCard items={data} />
        <p className="sl-disclaimer">
          量表记录为社区随访记录，不作为医疗诊断结论。
        </p>
      </section>
    </div>
  );
}
