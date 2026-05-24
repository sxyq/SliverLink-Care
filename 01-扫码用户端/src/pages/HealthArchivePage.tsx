import { BadgeInfo, HeartPulse, ShieldCheck, Stethoscope, TriangleAlert, UserRound } from 'lucide-react';
import { AppAttribution } from '../components/AppAttribution';
import { BottomTabBar } from '../components/BottomTabBar';
import { PageTopBar } from '../components/PageTopBar';
import { formatDate } from '../utils/format';
import { formatMaskedContact } from '../utils/mask';
import type { ElderBasicInfo, HealthRecord } from '../types';

interface HealthArchivePageProps {
  data: HealthRecord | null;
  basicInfo: ElderBasicInfo;
  loading: boolean;
  verified?: boolean;
}

function formatVerifiedContact(basicInfo: ElderBasicInfo) {
  const relation = basicInfo.relationship ? `（${basicInfo.relationship}）` : '';
  return `${basicInfo.emergencyContact}${relation}  ${basicInfo.emergencyPhoneDial}`;
}

export function HealthArchivePage({ data, basicInfo, loading, verified = false }: HealthArchivePageProps) {
  if (loading) return <div className="sl-page loading">加载中...</div>;
  if (!data) return <div className="sl-page loading">暂无健康档案</div>;

  const infoRows = [
    {
      icon: Stethoscope,
      label: '慢病情况',
      value: data.healthSelfAssessment || '暂无记录',
    },
    { icon: TriangleAlert, label: '过敏史', value: basicInfo.allergySummary || '暂无记录' },
    { icon: HeartPulse, label: '基础体征', value: `身高 ${data.heightCm}cm，体重 ${data.weightKg}kg，BMI ${data.bmi.toFixed(1)}` },
    { icon: BadgeInfo, label: '既往史', value: data.emotionScreening || data.cognitiveScreening || '暂无记录' },
    {
      icon: UserRound,
      label: '联系人',
      value: verified
        ? formatVerifiedContact(basicInfo)
        : `${formatMaskedContact(basicInfo.emergencyContact, basicInfo.relationship)}  ${basicInfo.emergencyPhoneMasked}`,
    },
  ];

  return (
    <div className="sl-page sl-detail-page sl-has-bottom-nav">
      <PageTopBar title="健康档案" leading="back" trailing="menu" />

      <div className="sl-verified-banner">
        <ShieldCheck size={16} />
        已通过短信验证
      </div>

      <section className="sl-panel sl-info-block">
        <div className="sl-info-block-head">
          <span className="sl-info-block-icon">
            <BadgeInfo size={18} />
          </span>
          <div>
            <div className="sl-info-block-label">健康档案编号</div>
            <div className="sl-info-block-value">{basicInfo.archiveNo}</div>
          </div>
        </div>
      </section>

      <section className="sl-panel sl-info-block">
        <div className="sl-info-block-head">
          <span className="sl-info-block-icon">
            <HeartPulse size={18} />
          </span>
          <div className="sl-info-block-title">基础健康信息</div>
        </div>

        <div className="sl-detail-rows">
          <div className="sl-detail-meta-row">
            <span>最近更新： {formatDate(data.date)}</span>
            <span>记录人： {data.volunteer || '暂无记录'}</span>
          </div>

          {infoRows.map((row) => {
            const Icon = row.icon;
            return (
              <div key={row.label} className="sl-detail-row">
                <span className="sl-detail-row-icon">
                  <Icon size={16} />
                </span>
                <span className="sl-detail-row-label">{row.label}：</span>
                <strong>{row.value}</strong>
              </div>
            );
          })}
        </div>
      </section>
      <AppAttribution />
      <BottomTabBar />
    </div>
  );
}
