import type { CSSProperties } from 'react';
import { Search, User } from 'lucide-react';
import type { CareSubject } from './types';

interface SubjectListPageProps {
  title: string;
  loading?: boolean;
  subjects: CareSubject[];
  keyword: string;
  onKeywordChange: (value: string) => void;
  onSelect: (subject: CareSubject) => void;
  primaryHint?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: (subject: CareSubject) => void;
}

export function SubjectListPage({
  title,
  loading = false,
  subjects,
  keyword,
  onKeywordChange,
  onSelect,
  primaryHint,
  emptyText = '暂无可管理对象',
  searchPlaceholder = '请输入姓名或档案编号',
  secondaryActionLabel,
  onSecondaryAction,
}: SubjectListPageProps) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Search size={16} color="var(--sl-primary, #126B78)" />
          <strong style={{ fontSize: 16 }}>{title}</strong>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--sl-text-secondary, #5F6F7A)' }}>搜索</span>
            <input
              value={keyword}
              onChange={(event) => onKeywordChange(event.target.value)}
              placeholder={searchPlaceholder}
              style={inputStyle}
            />
          </label>
        </div>
        {primaryHint ? (
          <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--sl-text-secondary, #5F6F7A)' }}>
            {primaryHint}
          </p>
        ) : null}
      </section>

      {loading ? (
        <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--sl-text-secondary, #5F6F7A)' }}>
          加载中...
        </div>
      ) : subjects.length === 0 ? (
        <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--sl-text-secondary, #5F6F7A)' }}>
          {emptyText}
        </div>
      ) : (
        subjects.map((subject) => (
          <div
            key={subject.id}
            onClick={() => onSelect(subject)}
            style={cardButtonStyle}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(subject);
              }
            }}
          >
            <div style={avatarStyle}>
              <User size={20} color="var(--sl-primary, #126B78)" />
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 16, color: 'var(--sl-text, #18222D)' }}>{subject.name}</strong>
                {subject.status ? <span style={statusStyle}>{subject.status}</span> : null}
              </div>
              <div style={{ marginTop: 6, fontSize: 13, color: 'var(--sl-text-secondary, #5F6F7A)' }}>
                档案编号 {subject.archiveNo}
                {subject.age ? ` · ${subject.age}岁` : ''}
                {subject.gender ? ` · ${subject.gender}` : ''}
              </div>
              {subject.summary ? (
                <div style={{ marginTop: 4, fontSize: 12, color: 'var(--sl-text-secondary, #5F6F7A)' }}>
                  {subject.summary}
                </div>
              ) : null}
            </div>
            {secondaryActionLabel && onSecondaryAction ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onSecondaryAction(subject);
                }}
                style={secondaryButtonStyle}
              >
                {secondaryActionLabel}
              </button>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: '100%',
  minHeight: 42,
  borderRadius: 10,
  border: '1px solid var(--sl-border, #D8E7EA)',
  background: 'var(--sl-card-bg, #FFFFFF)',
  padding: '10px 12px',
  fontSize: 14,
};

const cardButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  width: '100%',
  border: '1px solid var(--sl-border, #D8E7EA)',
  borderRadius: 14,
  background: 'var(--sl-card-bg, #FFFFFF)',
  padding: 14,
  boxShadow: '0 8px 20px rgba(24, 34, 45, 0.06)',
  cursor: 'pointer',
};

const avatarStyle: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 999,
  display: 'grid',
  placeItems: 'center',
  background: 'var(--sl-chip-bg, #EEF7F5)',
  flexShrink: 0,
};

const statusStyle: CSSProperties = {
  padding: '2px 10px',
  borderRadius: 999,
  background: '#E6F7F0',
  color: '#0A8067',
  fontSize: 12,
};

const secondaryButtonStyle: CSSProperties = {
  border: '1px solid var(--sl-border, #D8E7EA)',
  borderRadius: 10,
  background: 'var(--sl-card-bg, #FFFFFF)',
  padding: '8px 12px',
  fontSize: 13,
  cursor: 'pointer',
};
