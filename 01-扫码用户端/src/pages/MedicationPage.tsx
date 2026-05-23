import { Pill, ShieldCheck } from 'lucide-react';
import { MedicationList } from '../components/MedicationList';
import { VerificationBadge } from '../components/VerificationBadge';
import type { Medication } from '../types';

interface MedicationPageProps {
  data: Medication[] | null;
  loading: boolean;
}

export function MedicationPage({ data, loading }: MedicationPageProps) {
  if (loading) return <div className="sl-page loading">加载中...</div>;
  if (!data || data.length === 0) return <div className="sl-page loading">暂无用药记录</div>;

  return (
    <div className="sl-page">
      <header className="sl-hero slim">
        <div>
          <h1>主要用药</h1>
          <p>验证后查看的敏感信息</p>
        </div>
        <ShieldCheck size={32} />
      </header>

      <div className="sl-badge-bar">
        <VerificationBadge state="verified" />
      </div>

      <section className="sl-card">
        <div className="sl-section-title">
          <Pill size={20} />
          <h2>用药记录</h2>
        </div>
        <MedicationList items={data} />
        <p className="sl-disclaimer">
          用药信息仅供照护参考，请遵医嘱。
        </p>
      </section>
    </div>
  );
}
