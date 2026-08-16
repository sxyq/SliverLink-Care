import { CircleAlert, Pill } from 'lucide-react';
import { AppAttribution } from '../components/AppAttribution';
import { BottomTabBar } from '../components/BottomTabBar';
import { PageTopBar } from '../components/PageTopBar';
import type { Medication } from '../types';
import { useI18n } from '../i18n';

interface MedicationPageProps {
  data: Medication[] | null;
  loading: boolean;
}

export function MedicationPage({ data, loading }: MedicationPageProps) {
  const { t } = useI18n();
  if (loading) return <div className="sl-page loading">{t('common.loading')}</div>;
  if (!data || data.length === 0) return <div className="sl-page loading">{t('scan.noMedicationRecords')}</div>;

  return (
    <div className="sl-page sl-detail-page sl-has-bottom-nav">
      <PageTopBar title={t('scan.viewMedicationRecords')} leading="back" trailing="menu" />

      <div className="sl-list-stack">
        {data.map((item, index) => (
          <section className="sl-panel sl-list-card" key={`${item.name}-${index}`}>
            <div className="sl-list-card-icon">
              <Pill size={26} />
            </div>
            <div className="sl-list-card-body">
              <h3 className="sl-auto-data" dir="auto">{item.name}</h3>
              <p className="sl-auto-data" dir="auto">
                <span className="sl-ltr-data" dir="ltr">{item.dosage}</span>
                <span aria-hidden="true"> | </span>
                {item.time}
              </p>
            </div>
          </section>
        ))}
      </div>

      <section className="sl-warning-card">
        <CircleAlert size={18} />
        <div>
          <p>{t('scan.medicationReference')}</p>
          <p>{t('scan.followDoctor')}</p>
        </div>
      </section>

      <AppAttribution />
      <BottomTabBar />
    </div>
  );
}
