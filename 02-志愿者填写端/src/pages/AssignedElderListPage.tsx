import React, { useEffect, useMemo, useState } from 'react';
import { CircleUserRound, LogOut, X } from 'lucide-react';
import { createAssignedElder, fetchAssignedElders, fetchVolunteerProfile, logoutVolunteer, updateVolunteerProfile } from '../api/volunteerApi';
import { useAuth } from '../app/AuthProvider';
import type { AssignedElder, CreateAssignedElderInput } from '../types';
import { SubjectListPage } from '@shared/SubjectListPage';
import type { CareSubject } from '@shared/types';
import { useI18n } from '../i18n';

interface Props {
  onSelect: (elder: AssignedElder) => void;
  onEditBasic: (elder: AssignedElder) => void;
}

const defaultCreateForm: CreateAssignedElderInput = {
  name: '',
  gender: '女',
  age: '',
  residence: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelation: '',
  aboType: '',
  rhType: '',
  allergySummary: '',
};

function toCareSubject(elder: AssignedElder): CareSubject {
  const bloodType = [elder.aboType, elder.rhType].filter(Boolean).join(' ');
  return {
    id: elder.id,
    archiveNo: elder.archiveNo,
    name: elder.name,
    gender: elder.gender,
    age: elder.age,
    residence: elder.residence,
    bloodType,
    emergencyContactName: elder.emergencyContactName,
    emergencyContactPhone: elder.emergencyContactPhone,
    emergencyContactRelation: elder.emergencyContactRelation,
    allergyHistory: elder.allergySummary,
    summary: '',
  };
}

export const AssignedElderListPage: React.FC<Props> = ({ onSelect, onEditBasic }) => {
  const { login, logout, user, updateUser } = useAuth();
  const { t } = useI18n();
  const [elders, setElders] = useState<AssignedElder[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAccountPanel, setShowAccountPanel] = useState(false);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [accountForm, setAccountForm] = useState({ name: '', account: '', phone: '', currentPassword: '', password: '' });
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [accountSuccess, setAccountSuccess] = useState('');
  const [createForm, setCreateForm] = useState<CreateAssignedElderInput>(defaultCreateForm);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState('');

  async function loadElders(withLoading = false) {
    if (withLoading) setLoading(true);
    try {
      const rows = await fetchAssignedElders();
      setElders(rows);
      return rows;
    } finally {
      if (withLoading) setLoading(false);
    }
  }

  useEffect(() => {
    loadElders(true).catch(() => setElders([]));
  }, []);

  useEffect(() => {
    if (!showAccountPanel) return;
    setAccountError('');
    setAccountSuccess('');
    setAccountForm({
      name: user?.name || '',
      account: user?.account || '',
      phone: '',
      currentPassword: '',
      password: '',
    });
    fetchVolunteerProfile()
      .then((profile) => {
        setAccountForm({
          name: profile.name || '',
          account: profile.account || '',
          phone: profile.phone || '',
          currentPassword: '',
          password: '',
        });
      })
      .catch((error) => {
        setAccountError(error instanceof Error ? error.message : t('errors.profileLoadFailed'));
      });
  }, [showAccountPanel, user?.account, user?.name]);

  const filtered = useMemo(() => {
    const lower = keyword.trim();
    return elders.filter((elder) => !lower || elder.name.includes(lower) || elder.archiveNo.includes(lower));
  }, [elders, keyword]);

  const index = useMemo(() => new Map(elders.map((elder) => [elder.id, elder])), [elders]);

  function updateAccountForm(field: 'name' | 'account' | 'phone' | 'currentPassword' | 'password', value: string) {
    setAccountForm((current) => ({ ...current, [field]: value }));
  }

  function updateCreateForm(field: keyof CreateAssignedElderInput, value: string) {
    setCreateForm((current) => ({ ...current, [field]: value }));
  }

  function openCreatePanel() {
    setCreateError('');
    setCreateForm(defaultCreateForm);
    setShowCreatePanel(true);
  }

  async function handleCreateElder() {
    if (!createForm.name.trim() || createSaving) {
      setCreateError(t('errors.volunteerNameRequired'));
      return;
    }
    setCreateSaving(true);
    setCreateError('');
    try {
      const created = await createAssignedElder(createForm);
      const rows = await loadElders();
      const next = rows?.find((elder) => elder.id === created.id);
      setShowCreatePanel(false);
      setCreateForm(defaultCreateForm);
      if (next) {
        onEditBasic(next);
      }
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : t('errors.createElderFailed'));
    } finally {
      setCreateSaving(false);
    }
  }

  async function handleSaveAccount() {
    if (!accountForm.name.trim() || !accountForm.account.trim() || accountSaving) return;
    if (accountForm.password && !accountForm.currentPassword.trim()) {
      setAccountError(t('errors.currentPasswordRequired'));
      return;
    }
    setAccountSaving(true);
    setAccountError('');
    setAccountSuccess('');
    try {
      const result = await updateVolunteerProfile(accountForm);
      login(result.token || '', {
        account: result.account,
        name: result.name,
      });
      updateUser({
        account: result.account,
        name: result.name,
      });
      setAccountForm((current) => ({
        ...current,
        account: result.account,
        name: result.name,
        phone: result.phone || '',
        currentPassword: '',
        password: '',
      }));
      setAccountSuccess(t('common.accountUpdated'));
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : t('errors.profileSaveFailed'));
    } finally {
      setAccountSaving(false);
    }
  }

  async function handleLogout() {
    try {
      await logoutVolunteer();
    } catch {
      // Clear local auth state even if the backend logout request fails.
    } finally {
      setShowAccountPanel(false);
      logout();
    }
  }

  return (
    <>
      <SubjectListPage
        title={t('common.appName')}
        loading={loading}
        subjects={filtered.map(toCareSubject)}
        keyword={keyword}
        onKeywordChange={setKeyword}
        headerLeadingAction={
          <button
            type="button"
            className="sl-page-header-icon"
            onClick={() => setShowAccountPanel(true)}
            aria-label={t('common.accountManage')}
            title={t('common.accountManage')}
          >
            <CircleUserRound size={18} />
          </button>
        }
        headerAction={
          <button type="button" className="sl-page-header-icon" onClick={handleLogout} aria-label={t('workbench.logout')} title={t('workbench.logout')}>
            <LogOut size={18} />
          </button>
        }
        onSelect={(subject) => {
          const elder = index.get(subject.id);
          if (elder) onSelect(elder);
        }}
        onSecondaryAction={(_subject) => {
          openCreatePanel();
        }}
        secondaryActionLabel={t('common.add')}
        secondaryActionDescription={`${t('common.directAddDescription', { count: elders.length })}`}
        emptyText={t('workbench.noAssignedElders')}
        searchPlaceholder={t('workbench.elderNameOrArchivePlaceholder')}
      />

      {showAccountPanel ? (
        <div className="sl-modal-overlay" onClick={() => setShowAccountPanel(false)}>
          <div className="sl-modal-card" onClick={(event) => event.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <h3>{t('common.accountManage')}</h3>
              <button
                type="button"
                className="sl-page-header-icon"
                onClick={() => setShowAccountPanel(false)}
                aria-label={t('common.closeAccountManage')}
              >
                <X size={18} />
              </button>
            </div>

            <div className="sl-form-stack">
              <div className="sl-card sl-card-soft">
                <div className="sl-section-title">
                  <h2>{user?.name || t('common.currentVolunteer')}</h2>
                </div>
                <div className="sl-form-grid">
                  <label className="sl-label">
                    <span className="sl-label-text">{t('common.name')}</span>
                    <input
                      className="sl-input"
                      value={accountForm.name}
                      onChange={(event) => updateAccountForm('name', event.target.value)}
                      placeholder={t('workbench.namePlaceholder')}
                    />
                  </label>
                  <label className="sl-label">
                    <span className="sl-label-text">{t('common.loginAccount')}</span>
                    <input
                      className="sl-input sl-ltr-data"
                      dir="ltr"
                      value={accountForm.account}
                      onChange={(event) => updateAccountForm('account', event.target.value)}
                      placeholder={t('auth.setLoginAccount')}
                    />
                  </label>
                  <label className="sl-label">
                    <span className="sl-label-text">{t('common.phone')}</span>
                    <input
                      className="sl-input sl-ltr-data"
                      type="tel"
                      inputMode="numeric"
                      dir="ltr"
                      value={accountForm.phone}
                      onChange={(event) => updateAccountForm('phone', event.target.value)}
                      placeholder={t('errors.phoneRequired')}
                    />
                  </label>
                  <div className="sl-label">
                    <span className="sl-label-text">{t('common.elderCount')}</span>
                    <div className="sl-summary-value">{t('common.totalElders', { count: elders.length })}</div>
                  </div>
                  <label className="sl-label sl-label-full">
                    <span className="sl-label-text">{t('auth.currentPassword')}</span>
                    <input
                      className="sl-input"
                      type="password"
                      value={accountForm.currentPassword}
                      onChange={(event) => updateAccountForm('currentPassword', event.target.value)}
                      placeholder={t('common.currentPasswordRequired')}
                    />
                  </label>
                  <label className="sl-label sl-label-full">
                    <span className="sl-label-text">{t('common.password')}</span>
                    <input
                      className="sl-input"
                      type="password"
                      value={accountForm.password}
                      onChange={(event) => updateAccountForm('password', event.target.value)}
                      placeholder={t('common.leaveBlankToKeep')}
                    />
                  </label>
                </div>
              </div>
            </div>

            {accountError ? <p className="sl-login-error">{accountError}</p> : null}
            {accountSuccess ? <p className="sl-account-success">{accountSuccess}</p> : null}

            <div className="sl-modal-actions">
              <button type="button" className="sl-btn sl-btn-secondary" onClick={() => setShowAccountPanel(false)}>
                {t('common.close')}
              </button>
              <button type="button" className="sl-btn sl-btn-secondary" onClick={handleSaveAccount} disabled={accountSaving}>
                {accountSaving ? t('common.saving') : t('common.saveChanges')}
              </button>
              <button
                type="button"
                className="sl-btn sl-btn-primary"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                {t('workbench.logout')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showCreatePanel ? (
        <div className="sl-modal-overlay" onClick={() => setShowCreatePanel(false)}>
          <div className="sl-modal-card" onClick={(event) => event.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <h3>{t('common.addElder')}</h3>
              <button
                type="button"
                className="sl-page-header-icon"
                onClick={() => setShowCreatePanel(false)}
                aria-label={t('common.closeAddElder')}
              >
                <X size={18} />
              </button>
            </div>

            <div className="sl-form-stack">
              <div className="sl-card sl-card-soft">
                <div className="sl-form-grid">
                  <label className="sl-label">
                    <span className="sl-label-text">{t('common.elderName')}</span>
                    <input
                      className="sl-input"
                      value={createForm.name}
                      onChange={(event) => updateCreateForm('name', event.target.value)}
                      placeholder={t('workbench.namePlaceholder')}
                    />
                  </label>
                  <label className="sl-label">
                    <span className="sl-label-text">{t('common.gender')}</span>
                    <div className="sl-chips-row">
                      {(['男', '女'] as const).map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={createForm.gender === option ? 'sl-chip sl-chip-selected' : 'sl-chip'}
                          onClick={() => updateCreateForm('gender', option)}
                        >
                          {option === '男' ? t('common.male') : t('common.female')}
                        </button>
                      ))}
                    </div>
                  </label>
                  <label className="sl-label">
                    <span className="sl-label-text">{t('common.age')}</span>
                    <input
                      className="sl-input"
                      type="number"
                      value={createForm.age}
                      onChange={(event) => updateCreateForm('age', event.target.value)}
                      placeholder={t('workbench.agePlaceholder')}
                    />
                  </label>
                  <label className="sl-label">
                    <span className="sl-label-text">{t('common.address')}</span>
                    <input
                      className="sl-input"
                      value={createForm.residence}
                      onChange={(event) => updateCreateForm('residence', event.target.value)}
                      placeholder={t('workbench.residencePlaceholder')}
                    />
                  </label>
                  <label className="sl-label">
                    <span className="sl-label-text">{t('common.contact')}</span>
                    <input
                      className="sl-input"
                      value={createForm.emergencyContactName}
                      onChange={(event) => updateCreateForm('emergencyContactName', event.target.value)}
                      placeholder={t('workbench.contactNamePlaceholder')}
                    />
                  </label>
                  <label className="sl-label">
                    <span className="sl-label-text">{t('common.relationship')}</span>
                    <input
                      className="sl-input"
                      value={createForm.emergencyContactRelation}
                      onChange={(event) => updateCreateForm('emergencyContactRelation', event.target.value)}
                      placeholder={t('workbench.relationshipPlaceholder')}
                    />
                  </label>
                  <label className="sl-label sl-label-full">
                    <span className="sl-label-text">{t('common.contactPhone')}</span>
                    <input
                      className="sl-input"
                      type="tel"
                      value={createForm.emergencyContactPhone}
                      onChange={(event) => updateCreateForm('emergencyContactPhone', event.target.value)}
                      placeholder={t('workbench.contactPhonePlaceholder')}
                    />
                  </label>
                </div>
              </div>
            </div>

            {createError ? <p className="sl-login-error">{createError}</p> : null}

            <div className="sl-modal-actions">
              <button type="button" className="sl-btn sl-btn-secondary" onClick={() => setShowCreatePanel(false)}>
                {t('common.cancel')}
              </button>
              <button type="button" className="sl-btn sl-btn-primary" onClick={handleCreateElder} disabled={createSaving}>
                {createSaving ? t('common.adding') : t('common.confirmAdd')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </>
  );
};
