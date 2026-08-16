import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import type { CareActionCard, CareSubject } from './types';
import { PageHeader } from '../components/PageHeader';
import { useI18n } from '../i18n';

interface SubjectDetailPageProps {
  title: string;
  subject: CareSubject;
  onBack: () => void;
  actions: CareActionCard[];
  headerAction?: ReactNode;
}

export function SubjectDetailPage({ title, subject, onBack, actions, headerAction }: SubjectDetailPageProps) {
  const bloodText = [subject.bloodType].filter(Boolean).join(' ');
  const { t } = useI18n();

  return (
    <div className="sl-page">
      <PageHeader title={title} onBack={onBack} action={headerAction} />

      <section className="sl-summary-hero">
        <div className="sl-summary-top">
          <div>
            <h2 className="sl-auto-data" dir="auto">{subject.name}</h2>
            <p>
              {t('common.archiveNumber')} <span className="sl-ltr-data">{subject.archiveNo}</span>
              {subject.gender ? `  ${subject.gender === '男' ? t('common.male') : subject.gender === '女' ? t('common.female') : subject.gender}` : ''}
              {subject.age ? `  ${t('common.yearsOld', { age: subject.age })}` : ''}
            </p>
          </div>
        </div>

        <div className="sl-summary-grid">
          <div className="sl-summary-cell">
            <div className="sl-summary-label">{t('scan.addressInfo')}</div>
            <div className="sl-summary-value sl-auto-data" dir="auto">{subject.residence || '-'}</div>
          </div>
          <div className="sl-summary-cell">
            <div className="sl-summary-label">{t('scan.emergencyContact')}（{t('common.relationship')}）</div>
            <div className="sl-summary-value sl-auto-data" dir="auto">
              {subject.emergencyContactName
                ? `${subject.emergencyContactName}${subject.emergencyContactRelation ? `（${subject.emergencyContactRelation}）` : ''}`
                : '-'}
            </div>
          </div>
          <div className="sl-summary-cell">
            <div className="sl-summary-label">{t('common.contactPhone')}</div>
            <div className="sl-summary-value sl-ltr-data">{subject.emergencyContactPhone || '-'}</div>
          </div>
          <div className="sl-summary-cell">
            <div className="sl-summary-label">{t('scan.aboType')} / {t('scan.allergySummary')}</div>
            <div className="sl-summary-value sl-auto-data" dir="auto">{bloodText || subject.allergyHistory || '-'}</div>
          </div>
        </div>
      </section>

      <section className="sl-action-grid">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            className={`sl-action-card sl-detail-action-card${action.tone === 'warning' ? ' sl-action-card-warning' : ''}`}
            onClick={action.onClick}
          >
            <div className="sl-detail-action-copy">
              <strong>{action.title}</strong>
              <span>{action.description}</span>
            </div>
            <div className="sl-detail-action-icon" aria-hidden="true">
              <ArrowRight size={18} />
            </div>
          </button>
        ))}
      </section>
    </div>
  );
}
