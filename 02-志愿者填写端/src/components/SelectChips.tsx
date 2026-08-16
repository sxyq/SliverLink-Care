import React from 'react';

interface SelectChipsProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  getLabel?: (value: string) => string;
}

export const SelectChips: React.FC<SelectChipsProps> = ({ options, value, onChange, getLabel = (option) => option }) => {
  return (
    <div className="sl-chips-row">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          className={value === opt ? 'sl-chip sl-chip-selected' : 'sl-chip'}
          onClick={() => onChange(opt)}
        >
          {getLabel(opt)}
        </button>
      ))}
    </div>
  );
};
