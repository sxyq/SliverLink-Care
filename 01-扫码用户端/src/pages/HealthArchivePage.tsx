import { HeartPulse, ShieldCheck } from 'lucide-react';
import { InfoCard } from '../components/InfoCard';
import { VerificationBadge } from '../components/VerificationBadge';
import type { HealthRecord } from '../types';

interface HealthArchivePageProps {
  data: HealthRecord | null;
  loading: boolean;
}

export function HealthArchivePage({ data, loading }: HealthArchivePageProps) {
  if (loading) return <div className="sl-page loading">加载中...</div>;
  if (!data) return <div className="sl-page loading">暂无健康档案</div>;

  const items = [
    { label: '填写日期', value: data.date },
    { label: '负责志愿者', value: data.volunteer },
    { label: '身高', value: `${data.heightCm} cm` },
    { label: '体重', value: `${data.weightKg} kg` },
    { label: '腰围', value: `${data.waistCm} cm` },
    { label: 'BMI', value: data.bmi.toFixed(1) },
    { label: '健康状态自评', value: data.healthSelfAssessment },
    { label: '生活自理能力自评', value: data.selfCareAssessment },
    { label: '认知功能粗筛', value: data.cognitiveScreening },
    { label: '情感状态粗筛', value: data.emotionScreening },
  ];

  return (
    <div className="sl-page">
      <header className="sl-hero slim">
        <div>
          <h1>健康档案</h1>
          <p>验证后查看的敏感信息</p>
        </div>
        <ShieldCheck size={32} />
      </header>

      <div className="sl-badge-bar">
        <VerificationBadge state="verified" />
      </div>

      <InfoCard items={items} />
    </div>
  );
}
