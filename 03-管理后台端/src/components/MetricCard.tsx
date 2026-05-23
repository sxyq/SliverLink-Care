import type { DashboardMetric } from '../types';
import {
  UsersRound,
  UserCheck,
  ScanLine,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  UsersRound,
  UserCheck,
  ScanLine,
  ShieldCheck,
  AlertTriangle,
};

export function MetricCard({ metric }: { metric: DashboardMetric }) {
  const Icon = iconMap[metric.icon || ''] || UsersRound;
  return (
    <article className="metric-card">
      <div className="metric-icon">
        <Icon size={20} />
      </div>
      <p className="metric-label">{metric.label}</p>
      <strong className="metric-value">{metric.value}</strong>
      <span className="metric-trend">{metric.trend}</span>
    </article>
  );
}
