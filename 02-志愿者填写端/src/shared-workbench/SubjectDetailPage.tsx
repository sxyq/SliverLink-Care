import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import type { CareActionCard, CareSubject } from './types';
import { PageHeader } from '../components/PageHeader';

interface SubjectDetailPageProps {
  title: string;
  subject: CareSubject;
  onBack: () => void;
  actions: CareActionCard[];
  headerAction?: ReactNode;
}

export function SubjectDetailPage({ title, subject, onBack, actions, headerAction }: SubjectDetailPageProps) {
  const bloodText = [subject.bloodType].filter(Boolean).join(' ');

  return (
    <div className="sl-page">
      <PageHeader title={title} onBack={onBack} action={headerAction} />

      <section className="sl-summary-hero">
        <div className="sl-summary-top">
          <div>
            <h2>{subject.name}</h2>
            <p>
              档案编号 {subject.archiveNo}
              {subject.gender ? `  ${subject.gender}` : ''}
              {subject.age ? `  ${subject.age}岁` : ''}
            </p>
          </div>
        </div>

        <div className="sl-summary-grid">
          <div className="sl-summary-cell">
            <div className="sl-summary-label">住址信息</div>
            <div className="sl-summary-value">{subject.residence || '-'}</div>
          </div>
          <div className="sl-summary-cell">
            <div className="sl-summary-label">紧急联系人（关系）</div>
            <div className="sl-summary-value">
              {subject.emergencyContactName
                ? `${subject.emergencyContactName}${subject.emergencyContactRelation ? `（${subject.emergencyContactRelation}）` : ''}`
                : '-'}
            </div>
          </div>
          <div className="sl-summary-cell">
            <div className="sl-summary-label">联系电话</div>
            <div className="sl-summary-value">{subject.emergencyContactPhone || '-'}</div>
          </div>
          <div className="sl-summary-cell">
            <div className="sl-summary-label">血型 / 过敏史</div>
            <div className="sl-summary-value">{bloodText || subject.allergyHistory || '-'}</div>
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
