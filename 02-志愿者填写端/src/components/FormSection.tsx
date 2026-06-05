import React from 'react';

interface FormSectionProps {
  title: string;
  icon?: React.ReactNode;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({ title, icon, hint, className, children }) => {
  return (
    <section className={className ? `sl-card ${className}` : 'sl-card'}>
      <div className="sl-section-title">
        {icon}
        <h2>{title}</h2>
      </div>
      {hint ? <p className="sl-section-hint">{hint}</p> : null}
      <div className="sl-section-body">{children}</div>
    </section>
  );
};
