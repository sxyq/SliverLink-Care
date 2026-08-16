import React from 'react';

interface SensitiveFieldProps {
  value: string;
  masked?: boolean;
}

export function SensitiveField({ value, masked = true }: SensitiveFieldProps) {
  if (!masked) return <span className="sl-ltr-data" dir="ltr">{value}</span>;
  // 默认对手机号脱敏
  const display = value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  return <span className="sl-ltr-data" dir="ltr">{display}</span>;
}
