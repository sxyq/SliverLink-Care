import { BadgeInfo, HeartPulse, ShieldCheck, Stethoscope, TriangleAlert, UserRound } from 'lucide-react';
import { AppAttribution } from '../components/AppAttribution';
import { BottomTabBar } from '../components/BottomTabBar';
import { PageTopBar } from '../components/PageTopBar';
import { formatDate } from '../utils/format';
import { formatMaskedContact } from '../utils/mask';
import type { ElderBasicInfo, HealthRecord } from '../types';
import { useI18n } from '../i18n';

interface HealthArchivePageProps {
  data: HealthRecord | null;
  basicInfo: ElderBasicInfo;
  loading: boolean;
  verified?: boolean;
}

function formatVerifiedContactName(basicInfo: ElderBasicInfo) {
  const relation = basicInfo.relationship ? `（${basicInfo.relationship}）` : '';
  return `${basicInfo.emergencyContact}${relation}`;
}

export function HealthArchivePage({ data, basicInfo, loading, verified = false }: HealthArchivePageProps) {
  const { t } = useI18n();
  if (loading) return <div className="sl-page loading">{t('common.loading')}</div>;
  if (!data) return <div className="sl-page loading">{t('scan.noHealthArchive')}</div>;

  const infoRows = [
    {
      icon: Stethoscope,
      label: t('scan.chronicDisease'),
      value: data.healthSelfAssessment || t('common.noRecords'),
    },
    { icon: TriangleAlert, label: t('scan.allergySummary'), value: basicInfo.allergySummary || t('common.noRecords') },
    { icon: HeartPulse, label: t('scan.basicVitals'), value: `${t('scan.height')} ${data.heightCm}cm，${t('scan.weight')} ${data.weightKg}kg，${t('scan.bmi')} ${data.bmi.toFixed(1)}`, ltr: true },
    { icon: BadgeInfo, label: t('scan.pastHistory'), value: data.emotionScreening || data.cognitiveScreening || t('common.noRecords') },
  ];
  const contactName = verified
    ? formatVerifiedContactName(basicInfo)
    : formatMaskedContact(basicInfo.emergencyContact, basicInfo.relationship);
  const contactPhone = verified ? basicInfo.emergencyPhoneDial : basicInfo.emergencyPhoneMasked;

  return (
    <div className="sl-page sl-detail-page sl-has-bottom-nav">
      <PageTopBar title={t('scan.healthArchive')} leading="back" trailing="menu" />

      <div className="sl-verified-banner">
        <ShieldCheck size={16} />
        {t('verification.passedLabel')}
      </div>

      <section className="sl-panel sl-info-block">
        <div className="sl-info-block-head">
          <span className="sl-info-block-icon">
            <BadgeInfo size={18} />
          </span>
          <div>
            <div className="sl-info-block-label">{t('common.healthRecordNo')}</div>
            <div className="sl-info-block-value sl-ltr-data">{basicInfo.archiveNo}</div>
          </div>
        </div>
      </section>

      <section className="sl-panel sl-info-block">
        <div className="sl-info-block-head">
          <span className="sl-info-block-icon">
            <HeartPulse size={18} />
          </span>
          <div className="sl-info-block-title">{t('scan.basicVitals')}</div>
        </div>

        <div className="sl-detail-rows">
          <div className="sl-detail-meta-row">
            <span>{t('scan.recentUpdate')}： <span className="sl-ltr-data">{formatDate(data.date)}</span></span>
            <span>{t('common.recorder')}： {data.volunteer || t('common.noRecords')}</span>
          </div>

          {infoRows.map((row) => {
            const Icon = row.icon;
            return (
              <div key={row.label} className="sl-detail-row">
                <span className="sl-detail-row-icon">
                  <Icon size={16} />
                </span>
                <span className="sl-detail-row-label">{row.label}：</span>
                <strong className={row.ltr ? 'sl-ltr-data' : 'sl-auto-data'} dir={row.ltr ? 'ltr' : 'auto'}>{row.value}</strong>
              </div>
            );
          })}
          <div className="sl-detail-row">
            <span className="sl-detail-row-icon">
              <UserRound size={16} />
            </span>
            <span className="sl-detail-row-label">{t('common.contact')}：</span>
            <strong>
              <span className="sl-auto-data" dir="auto">{contactName}</span>{' '}
              <span className="sl-ltr-data" dir="ltr">{contactPhone}</span>
            </strong>
          </div>
        </div>
      </section>
      <AppAttribution />
      <BottomTabBar />
    </div>
  );
}
