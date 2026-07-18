import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { ADMIN_NOTICE_EVENT } from '../utils/adminNotice';

const NOTICE_DURATION_MS = 3000;

export function AdminNoticeCenter() {
  const [message, setMessage] = useState('');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    function clearNoticeTimer() {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    function handleNotice(event: Event) {
      clearNoticeTimer();
      setMessage((event as CustomEvent<string>).detail);
      timerRef.current = window.setTimeout(() => {
        setMessage('');
        timerRef.current = null;
      }, NOTICE_DURATION_MS);
    }

    window.addEventListener(ADMIN_NOTICE_EVENT, handleNotice);
    return () => {
      window.removeEventListener(ADMIN_NOTICE_EVENT, handleNotice);
      clearNoticeTimer();
    };
  }, []);

  if (!message) return null;

  return (
    <div className="admin-notice" role="status" aria-live="polite">
      <CheckCircle2 size={20} aria-hidden="true" />
      <span>{message}</span>
      <button type="button" onClick={() => setMessage('')} aria-label="关闭成功提示" title="关闭">
        <X size={17} aria-hidden="true" />
      </button>
    </div>
  );
}
