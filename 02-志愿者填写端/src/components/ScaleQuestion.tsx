import React from 'react';
import type { ScaleAnswer } from '../types';

interface ScaleQuestionProps {
  index: number;
  item: ScaleAnswer;
  options: string[];
  onChange: (value: number) => void;
}

export const ScaleQuestion: React.FC<ScaleQuestionProps> = ({ index, item, options, onChange }) => {
  return (
    <div className="sl-question">
      <p className="sl-question-text">
        <span className="sl-question-num">{index + 1}.</span>
        {item.question}
      </p>
      <div className="sl-chips-row">
        {options.map((opt, i) => (
          <button
            key={opt}
            type="button"
            className={item.value === i ? 'sl-chip sl-chip-selected' : 'sl-chip'}
            onClick={() => onChange(i)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
};
