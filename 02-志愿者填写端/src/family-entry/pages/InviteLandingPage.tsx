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
import { useI18n } from '../../i18n';

function maskArchiveNo(no: string): string {
  if (no.length <= 8) return no;
  return no.slice(0, 5) + '****' + no.slice(-3);
}

export default function InviteLandingPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
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
        setInviteError(err.message || t('errors.invitationInfoFailed'));
      });
  }, [code]);

  if (state.loading) {
    return (
      <div className="page-container" style={{ paddingTop: 60 }}>
        <div className="text-center text-secondary">{t('common.loading')}</div>
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
    未使用: { label: t('status.active'), color: 'var(--sl-permission)', bg: '#E6F7F0' },
    ACTIVE: { label: t('status.active'), color: 'var(--sl-permission)', bg: '#E6F7F0' },
    已使用: { label: t('status.used'), color: 'var(--sl-text-secondary)', bg: '#F0F4F5' },
    USED: { label: t('status.used'), color: 'var(--sl-text-secondary)', bg: '#F0F4F5' },
    已过期: { label: t('status.expired'), color: 'var(--sl-danger)', bg: '#FDE8E8' },
    EXPIRED: { label: t('status.expired'), color: 'var(--sl-danger)', bg: '#FDE8E8' },
    已作废: { label: t('status.disabled'), color: 'var(--sl-danger)', bg: '#FDE8E8' },
    DISABLED: { label: t('status.disabled'), color: 'var(--sl-danger)', bg: '#FDE8E8' },
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
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--sl-text)' }}>{t('family.invitation')}</h2>
        <p className="text-secondary mt-8">{t('family.invitationReceived')}</p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={16} color="var(--sl-primary)" />
            <span style={{ fontSize: 14, fontWeight: 500 }}>{t('family.boundElder')}</span>
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
          <span className="field-label">{t('common.name')}</span>
          <span className="field-value sl-auto-data" dir="auto">{invitation.elderName}</span>
        </div>
        <div className="field-row">
          <span className="field-label">{t('common.age')}</span>
          <span className="field-value">{t('common.yearsOld', { age: invitation.elderAge })}</span>
        </div>
        <div className="field-row">
          <span className="field-label">{t('common.archiveNumber')}</span>
          <span className="field-value sl-ltr-data">{maskArchiveNo(invitation.elderArchiveNo)}</span>
        </div>
        <div className="field-row">
          <span className="field-label">{t('common.invitationCode')}</span>
          <span className="field-value sl-ltr-data" style={{ fontFamily: 'monospace' }}>{invitation.code}</span>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Clock size={16} color="var(--sl-warn)" />
        <span style={{ fontSize: 13, color: 'var(--sl-text-secondary)' }}>
          <span className="sl-ltr-data">{t('common.validUntil')} {invitation.expiresAt}</span>，{t('common.daysRemaining', { days: daysLeft })}
        </span>
      </div>

      {['未使用', 'ACTIVE'].includes(invitation.status) ? (
        <>
          <div className="info-banner mt-16">
            <ShieldCheck size={16} />
            <span>{t('family.inviteValidDescription')}</span>
          </div>
          <button
            className="btn btn-primary btn-block mt-16"
            onClick={() => navigate('/register', { state: { code: invitation.code } })}
          >
            {t('family.continueRegisterBind')}
          </button>
        </>
      ) : (
        <div className="warn-banner mt-16">
          <ShieldCheck size={16} />
          <span>
            {['已使用', 'USED'].includes(invitation.status) ? t('family.invitationUsed') :
             ['已过期', 'EXPIRED'].includes(invitation.status) ? t('family.invitationExpired') : t('family.invitationDisabled')}
          </span>
        </div>
      )}
    </div>
  );
}
