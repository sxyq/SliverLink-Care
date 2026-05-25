import { useEffect, useState } from 'react';
import { Bell, CheckCircle2, XCircle } from 'lucide-react';
import {
  approveAdminReviewRequest,
  fetchAdminReviewRequests,
  rejectAdminReviewRequest,
} from '../api/adminApi';
import type { AdminReviewRequest } from '../types';

function formatTime(value: string) {
  if (!value) return '刚刚';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

export function AdminMessageCenter() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AdminReviewRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      setItems(await fetchAdminReviewRequests('PENDING'));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '消息加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(timer);
  }, []);

  async function handleApprove(id: string) {
    setActingId(id);
    setError('');
    try {
      await approveAdminReviewRequest(id);
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '审核通过失败');
    } finally {
      setActingId('');
    }
  }

  async function handleReject(id: string) {
    setActingId(id);
    setError('');
    try {
      await rejectAdminReviewRequest(id, '管理员驳回二维码停用申请');
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '审核驳回失败');
    } finally {
      setActingId('');
    }
  }

  return (
    <div className="admin-message-center">
      <button
        type="button"
        className="admin-message-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="后台消息提醒"
        title="后台消息提醒"
      >
        <Bell size={18} />
        {items.length > 0 && <span className="admin-message-badge">{items.length}</span>}
      </button>

      {open && (
        <section className="admin-message-popover">
          <div className="admin-message-head">
            <strong>消息提醒</strong>
            <button type="button" className="text-button" onClick={() => void load()} disabled={loading}>
              {loading ? '刷新中' : '刷新'}
            </button>
          </div>
          {error && <p className="form-error">{error}</p>}
          {items.length === 0 ? (
            <div className="admin-message-empty">暂无待审核消息</div>
          ) : (
            <div className="admin-message-list">
              {items.map((item) => (
                <article key={item.id} className="admin-message-item">
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.summary}</p>
                    <span>{formatTime(item.createdAt)}</span>
                  </div>
                  <div className="admin-message-actions">
                    <button type="button" className="secondary" onClick={() => void handleReject(item.id)} disabled={actingId === item.id}>
                      <XCircle size={15} />
                      驳回
                    </button>
                    <button type="button" onClick={() => void handleApprove(item.id)} disabled={actingId === item.id}>
                      <CheckCircle2 size={15} />
                      通过
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
