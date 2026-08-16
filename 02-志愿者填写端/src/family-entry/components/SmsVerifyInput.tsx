import { useState, useRef, useEffect } from 'react';

interface SmsVerifyInputProps {
  length?: number;
  onComplete: (code: string) => void;
}

export default function SmsVerifyInput({ length = 6, onComplete }: SmsVerifyInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newValues = [...values];
    newValues[index] = value.slice(-1);
    setValues(newValues);

    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const code = newValues.join('');
    if (code.length === length && !newValues.includes('')) {
      onComplete(code);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !values[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pasted.length === length) {
      const newValues = pasted.split('');
      setValues(newValues);
      onComplete(pasted);
    }
  };

  return (
    <div dir="ltr" style={{ display: 'flex', gap: 8, justifyContent: 'center' }} onPaste={handlePaste}>
      {values.map((val, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={val}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          style={{
            width: 44,
            height: 50,
            textAlign: 'center',
            fontSize: 20,
            fontWeight: 600,
            border: '1px solid var(--sl-border)',
            borderRadius: 'var(--sl-radius)',
            background: 'var(--sl-input-bg)',
            color: 'var(--sl-text)',
            outline: 'none',
          }}
        />
      ))}
    </div>
  );
}
