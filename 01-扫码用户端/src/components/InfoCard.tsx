import React from 'react';

interface InfoItem {
  label: string;
  value: React.ReactNode;
  wide?: boolean;
}

interface InfoCardProps {
  items: InfoItem[];
  children?: React.ReactNode;
}

export function InfoCard({ items, children }: InfoCardProps) {
  return (
    <div className="sl-card">
      <dl className="sl-info-grid">
        {items.map((item, idx) => (
          <div key={idx} className={item.wide ? 'wide' : ''}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
      {children}
    </div>
  );
}
