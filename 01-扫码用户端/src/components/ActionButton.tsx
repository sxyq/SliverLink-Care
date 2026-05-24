import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface ActionButtonProps {
  icon?: LucideIcon;
  variant?: 'primary' | 'emergency' | 'secondary' | 'outline';
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
}

export function ActionButton({
  icon: Icon,
  variant = 'primary',
  children,
  onClick,
  href,
  type = 'button',
  disabled,
}: ActionButtonProps) {
  const className = `sl-action-btn ${variant}`;
  const content = (
    <>
      {Icon && <Icon size={18} />}
      <span>{children}</span>
    </>
  );

  if (href) {
    return (
      <a className={className} href={href}>
        {content}
      </a>
    );
  }

  return (
    <button className={className} type={type} onClick={onClick} disabled={disabled}>
      {content}
    </button>
  );
}
