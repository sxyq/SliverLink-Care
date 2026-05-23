import type { CSSProperties } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { CareActionCard, CareSubject } from './types';

interface SubjectDetailPageProps {
  title: string;
  subject: CareSubject;
  onBack: () => void;
  actions: CareActionCard[];
}

export function SubjectDetailPage({ title, subject, onBack, actions }: SubjectDetailPageProps) {
  const bloodText = [subject.bloodType].filter(Boolean).join(' ');

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <button type="button" onClick={onBack} style={backButtonStyle}>
            <ArrowLeft size={16} />
            返回
          </button>
          <strong style={{ fontSize: 16 }}>{title}</strong>
          <div style={{ width: 56 }} />
        </div>
      </section>

      <section className="card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <strong style={{ fontSize: 20, color: 'var(--sl-text, #18222D)' }}>{subject.name}</strong>
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--sl-text-secondary, #5F6F7A)' }}>
              档案编号 {subject.archiveNo}
              {subject.gender ? ` · ${subject.gender}` : ''}
              {subject.age ? ` · ${subject.age}岁` : ''}
            </div>
          </div>
          {subject.status ? <span style={statusStyle}>{subject.status}</span> : null}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginTop: 16,
          }}
        >
          <DetailField label="紧急联系人" value={subject.emergencyContactName || '-'} />
          <DetailField label="联系电话" value={subject.emergencyContactPhone || '-'} />
          <DetailField label="与老人关系" value={subject.emergencyContactRelation || '-'} />
          <DetailField label="血型" value={bloodText || '-'} />
          <DetailField label="过敏史" value={subject.allergyHistory || '-'} />
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
        }}
      >
        {actions.map((action) => (
          <button key={action.key} type="button" onClick={action.onClick} style={actionCardStyle(action.tone)}>
            <strong style={{ fontSize: 15 }}>{action.title}</strong>
            <span style={{ marginTop: 8, fontSize: 13, color: 'var(--sl-text-secondary, #5F6F7A)', textAlign: 'left' }}>
              {action.description}
            </span>
          </button>
        ))}
      </section>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: '1px solid var(--sl-border, #D8E7EA)',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.72)',
        padding: 12,
      }}
    >
      <div style={{ fontSize: 12, color: 'var(--sl-text-secondary, #5F6F7A)' }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 14, color: 'var(--sl-text, #18222D)' }}>{value}</div>
    </div>
  );
}

const backButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  border: '1px solid var(--sl-border, #D8E7EA)',
  borderRadius: 10,
  background: 'var(--sl-card-bg, #FFFFFF)',
  padding: '8px 10px',
  cursor: 'pointer',
};

const statusStyle: CSSProperties = {
  padding: '4px 10px',
  borderRadius: 999,
  background: '#E6F7F0',
  color: '#0A8067',
  fontSize: 12,
};

function actionCardStyle(tone: CareActionCard['tone']): CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    border: '1px solid var(--sl-border, #D8E7EA)',
    borderRadius: 14,
    background: tone === 'warning' ? '#FFF8ED' : 'var(--sl-card-bg, #FFFFFF)',
    padding: 16,
    cursor: 'pointer',
    minHeight: 120,
  };
}
