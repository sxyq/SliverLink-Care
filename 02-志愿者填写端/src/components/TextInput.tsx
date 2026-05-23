import React from 'react';

interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
  suffix?: string;
  error?: string;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  readOnly,
  suffix,
  error,
}) => {
  return (
    <label className="sl-label">
      <span className="sl-label-text">{label}</span>
      <div className="sl-input-wrap">
        <input
          className={`sl-input${error ? ' sl-input-error' : ''}`}
          type={type}
          value={value}
          placeholder={placeholder}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && <span className="sl-input-suffix">{suffix}</span>}
      </div>
      {error && <span className="sl-error-text">{error}</span>}
    </label>
  );
};
