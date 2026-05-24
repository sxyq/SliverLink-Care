import { CircleAlert, Pill } from 'lucide-react';
import { AppAttribution } from '../components/AppAttribution';
import { BottomTabBar } from '../components/BottomTabBar';
import { PageTopBar } from '../components/PageTopBar';
import type { Medication } from '../types';

interface MedicationPageProps {
  data: Medication[] | null;
  loading: boolean;
}

export function MedicationPage({ data, loading }: MedicationPageProps) {
  if (loading) return <div className="sl-page loading">加载中...</div>;
  if (!data || data.length === 0) return <div className="sl-page loading">暂无用药记录</div>;

  return (
    <div className="sl-page sl-detail-page sl-has-bottom-nav">
      <PageTopBar title="主要用药" leading="back" trailing="menu" />

      <div className="sl-list-stack">
        {data.map((item, index) => (
          <section className="sl-panel sl-list-card" key={`${item.name}-${index}`}>
            <div className="sl-list-card-icon">
              <Pill size={26} />
            </div>
            <div className="sl-list-card-body">
              <h3>{item.name}</h3>
              <p>{item.dosage} | {item.time}</p>
            </div>
          </section>
        ))}
      </div>

      <section className="sl-warning-card">
        <CircleAlert size={18} />
        <div>
          <p>用药信息仅供照护参考，</p>
          <p>请遵医嘱</p>
        </div>
      </section>

      <AppAttribution />
      <BottomTabBar />
    </div>
  );
}
