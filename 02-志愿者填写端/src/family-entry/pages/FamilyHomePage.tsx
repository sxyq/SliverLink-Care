import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { getBoundElders } from '../api/familyElderApi';
import type { ElderInfo } from '../types';
import { SubjectListPage } from '@shared/SubjectListPage';
import type { CareSubject } from '@shared/types';
import { useI18n } from '../../i18n';

function toCareSubject(elder: ElderInfo): CareSubject {
  return {
    id: elder.id,
    archiveNo: elder.archiveNo,
    name: elder.name,
    age: elder.age,
    gender: elder.gender,
    emergencyContactName: elder.emergencyContactName,
    emergencyContactPhone: elder.emergencyContactPhone,
    emergencyContactRelation: elder.emergencyContactRelation,
    bloodType: elder.bloodType,
    allergyHistory: elder.allergyHistory,
    summary: '',
  };
}

export default function FamilyHomePage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [elders, setElders] = useState<ElderInfo[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [showBindModal, setShowBindModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    getBoundElders()
      .then(setElders)
      .catch(() => setElders([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const lower = keyword.trim();
    return elders.filter((elder) => !lower || elder.name.includes(lower) || elder.archiveNo.includes(lower));
  }, [elders, keyword]);

  const subjectSummary = t('family.boundEldersHint');

  const maxBindings = 4;
  const remainingSlots = Math.max(0, maxBindings - elders.length);
  const limitReached = elders.length >= maxBindings;

  function handleBindConfirm() {
    const code = inviteCode.trim();
    if (!code) return;
    setShowBindModal(false);
    setInviteCode('');
    navigate(`/invite/${encodeURIComponent(code)}`);
  }

  return (
    <div className="page-container">
      <SubjectListPage
        title={t('family.boundElders')}
        loading={loading}
        subjects={filtered.map((elder) => ({ ...toCareSubject(elder), summary: subjectSummary }))}
        keyword={keyword}
        onKeywordChange={setKeyword}
        onSelect={(subject) => navigate(`/elders/${subject.id}`)}
        primaryHint={t('family.manageBoundHint', { count: elders.length })}
        emptyText={t('workbench.noBoundElders')}
        searchPlaceholder={t('workbench.elderNameOrArchivePlaceholder')}
        preProfilePanel={
          <section className={`sl-add-archive-panel${limitReached ? ' is-disabled' : ''}`}>
            <div className="sl-add-archive-copy">
              <span className="sl-add-archive-kicker">{t('workbench.inviteBind')}</span>
              <strong>{t('family.increaseArchive')}</strong>
              <p>
                {limitReached
                  ? t('family.currentBoundLimit', { count: elders.length, max: maxBindings })
                  : t('common.bindingSlotsAvailable', { count: elders.length, max: maxBindings, remaining: remainingSlots })}
              </p>
            </div>

            <div className="sl-add-archive-side">
              <span className={`sl-add-archive-cap${limitReached ? ' is-limit' : ''}`}>
                {elders.length}/{maxBindings}
              </span>
              <button
                type="button"
                className="sl-add-archive-btn"
                disabled={limitReached}
                onClick={() => setShowBindModal(true)}
              >
                <Plus size={16} />
                {t('family.inputInvitation')}
              </button>
            </div>
          </section>
        }
      />

      {showBindModal ? (
        <div className="sl-modal-overlay" onClick={() => setShowBindModal(false)}>
          <div className="sl-modal-card" onClick={(event) => event.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <h3>{t('family.increaseArchive')}</h3>
              <button
                type="button"
                className="sl-page-header-icon"
                onClick={() => setShowBindModal(false)}
                aria-label={t('family.closeIncreaseArchive')}
              >
                <X size={18} />
              </button>
            </div>

            <div className="sl-form-stack">
              <div className="sl-card sl-card-soft">
                <div className="sl-form-stack">
                  <div>
                    <div className="sl-summary-label">{t('family.bindingLimitTitle')}</div>
                    <div className="sl-summary-value">
                      {t('common.archiveCount', { count: elders.length, max: 4 })}
                    </div>
                  </div>
                  <label className="sl-label">
                    <span className="sl-label-text">{t('common.invitationCode')}</span>
                    <input
                      className="sl-input sl-ltr-data"
                      dir="ltr"
                      placeholder={t('family.inputBackendInvitation')}
                      value={inviteCode}
                      onChange={(event) => setInviteCode(event.target.value)}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="sl-modal-actions">
              <button type="button" className="sl-btn sl-btn-secondary" onClick={() => setShowBindModal(false)}>
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="sl-btn sl-btn-primary"
                disabled={!inviteCode.trim()}
                onClick={handleBindConfirm}
              >
                {t('family.continueBind')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
