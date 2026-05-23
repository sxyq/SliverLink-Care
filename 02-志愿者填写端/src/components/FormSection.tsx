import React from 'react';

interface FormSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({ title, icon, children }) => {
  return (
    <section className="sl-card">
      <div className="sl-section-title">
        {icon}
        <h2>{title}</h2>
      </div>
      <div className="sl-section-body">{children}</div>
    </section>
  );
};
