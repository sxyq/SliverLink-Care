import { useEffect, useMemo, useState } from 'react';

interface ContentProtectionProps {
  enabled: boolean;
  watermarkText: string;
}

const BLOCK_MESSAGE = '当前页面已开启隐私保护，禁止复制与传播';

export function ContentProtection({ enabled, watermarkText }: ContentProtectionProps) {
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!enabled) {
      document.body.classList.remove('sl-protected-surface');
      return;
    }

    document.body.classList.add('sl-protected-surface');

    let timer = 0;
    const showNotice = () => {
      window.clearTimeout(timer);
      setNotice(BLOCK_MESSAGE);
      timer = window.setTimeout(() => setNotice(''), 1800);
    };

    const prevent = (event: Event) => {
      event.preventDefault();
      showNotice();
    };

    const handleKeydown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const withModifier = event.metaKey || event.ctrlKey;
      const blockedKeys = ['c', 'x', 's', 'p', 'u', 'a'];

      if ((withModifier && blockedKeys.includes(key)) || key === 'printscreen') {
        event.preventDefault();
        showNotice();
      }
    };

    document.addEventListener('copy', prevent);
    document.addEventListener('cut', prevent);
    document.addEventListener('contextmenu', prevent);
    document.addEventListener('dragstart', prevent);
    document.addEventListener('selectstart', prevent);
    document.addEventListener('keydown', handleKeydown);

    return () => {
      document.body.classList.remove('sl-protected-surface');
      window.clearTimeout(timer);
      document.removeEventListener('copy', prevent);
      document.removeEventListener('cut', prevent);
      document.removeEventListener('contextmenu', prevent);
      document.removeEventListener('dragstart', prevent);
      document.removeEventListener('selectstart', prevent);
      document.removeEventListener('keydown', handleKeydown);
    };
  }, [enabled]);

  const watermarks = useMemo(
    () =>
      Array.from({ length: 15 }, (_, index) => (
        <span key={`${watermarkText}-${index}`} className="sl-watermark-item">
          {watermarkText}
        </span>
      )),
    [watermarkText],
  );

  if (!enabled) {
    return null;
  }

  return (
    <>
      <div className="sl-watermark-layer" aria-hidden="true">
        {watermarks}
      </div>
      {notice ? <div className="sl-protection-toast">{notice}</div> : null}
    </>
  );
}
