import { useEffect, useState, useSyncExternalStore } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mail, User, Clock, ShieldCheck } from 'lucide-react';
import { previewInvitation } from '../api/invitationApi';
import {
  getInviteState,
  setInviteLoading,
  setInviteData,
  setInviteError,
  subscribe,
} from '../features/invite-register/inviteStore';
import type { InvitationPreview } from '../types';

function maskArchiveNo(no: string): string {
  if (no.length <= 8) return no;
  return no.slice(0, 5) + '****' + no.slice(-3);
}

export default function InviteLandingPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const state = useSyncExternalStore(subscribe, getInviteState);
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null);

  useEffect(() => {
    if (!code) return;
    setInviteLoading(true);
    previewInvitation(code)
      .then((data) => {
        setInviteData(data);
        setInvitation(data);
      })
      .catch((err) => {
        setInviteError(err.message || '获取邀请码信息失败');
      });
  }, [code]);

  if (state.loading) {
    return (
      <div className="page-container" style={{ paddingTop: 60 }}>
        <div className="text-center text-secondary">加载中...</div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="page-container" style={{ paddingTop: 60 }}>
        <div className="text-center" style={{ color: 'var(--sl-danger)' }}>{state.error}</div>
      </div>
    );
  }

  if (!invitation) return null;

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    未使用: { label: '有效', color: 'var(--sl-permission)', bg: '#E6F7F0' },
    ACTIVE: { label: '有效', color: 'var(--sl-permission)', bg: '#E6F7F0' },
    已使用: { label: '已使用', color: 'var(--sl-text-secondary)', bg: '#F0F4F5' },
    USED: { label: '已使用', color: 'var(--sl-text-secondary)', bg: '#F0F4F5' },
    已过期: { label: '已过期', color: 'var(--sl-danger)', bg: '#FDE8E8' },
    EXPIRED: { label: '已过期', color: 'var(--sl-danger)', bg: '#FDE8E8' },
    已作废: { label: '已作废', color: 'var(--sl-danger)', bg: '#FDE8E8' },
    DISABLED: { label: '已作废', color: 'var(--sl-danger)', bg: '#FDE8E8' },
  };

  const cfg = statusConfig[invitation.status] || statusConfig['已过期']!;
  const daysLeft = Math.max(0, Math.ceil((new Date(invitation.expiresAt).getTime() - Date.now()) / 86400000));

  return (
    <div className="page-container" style={{ paddingTop: 20 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'var(--sl-chip-bg)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}>
          <Mail size={28} color="var(--sl-primary)" />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--sl-text)' }}>家属协管邀请</h2>
        <p className="text-secondary mt-8">您收到一份老人档案协管邀请</p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={16} color="var(--sl-primary)" />
            <span style={{ fontSize: 14, fontWeight: 500 }}>绑定老人</span>
          </div>
          <span style={{
            fontSize: 12,
            padding: '2px 10px',
            borderRadius: 12,
            color: cfg.color,
            background: cfg.bg,
          }}>
            {cfg.label}
          </span>
        </div>

        <div className="field-row">
          <span className="field-label">姓名</span>
          <span className="field-value">{invitation.elderName}</span>
        </div>
        <div className="field-row">
          <span className="field-label">年龄</span>
          <span className="field-value">{invitation.elderAge} 岁</span>
        </div>
        <div className="field-row">
          <span className="field-label">档案编号</span>
          <span className="field-value">{maskArchiveNo(invitation.elderArchiveNo)}</span>
        </div>
        <div className="field-row">
          <span className="field-label">邀请码</span>
          <span className="field-value" style={{ fontFamily: 'monospace' }}>{invitation.code}</span>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Clock size={16} color="var(--sl-warn)" />
        <span style={{ fontSize: 13, color: 'var(--sl-text-secondary)' }}>
          有效期至 {invitation.expiresAt}，剩余 {daysLeft} 天
        </span>
      </div>

      {['未使用', 'ACTIVE'].includes(invitation.status) ? (
        <>
          <div className="info-banner mt-16">
            <ShieldCheck size={16} />
            <span>邀请码有效。家属可通过该邀请码注册协管账号，或为已有账号继续绑定老人，单账号最多绑定 4 位老人。</span>
          </div>
          <button
            className="btn btn-primary btn-block mt-16"
            onClick={() => navigate('/register', { state: { code: invitation.code } })}
          >
            继续注册 / 绑定
          </button>
        </>
      ) : (
        <div className="warn-banner mt-16">
          <ShieldCheck size={16} />
          <span>
            {['已使用', 'USED'].includes(invitation.status) ? '该邀请码已被使用' :
             ['已过期', 'EXPIRED'].includes(invitation.status) ? '该邀请码已过期' : '该邀请码已作废'}
          </span>
        </div>
      )}
    </div>
  );
}
