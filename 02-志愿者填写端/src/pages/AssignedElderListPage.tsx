import React, { useEffect, useMemo, useState } from 'react';
import { CircleUserRound, LogOut, X } from 'lucide-react';
import { createAssignedElder, fetchAssignedElders, fetchVolunteerProfile, updateVolunteerProfile } from '../api/volunteerApi';
import { useAuth } from '../app/AuthProvider';
import type { AssignedElder, CreateAssignedElderInput } from '../types';
import { SubjectListPage } from '@shared/SubjectListPage';
import type { CareSubject } from '@shared/types';

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
        setAccountError(error instanceof Error ? error.message : '加载账号信息失败');
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
      setCreateError('请先填写老人姓名');
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
      setCreateError(error instanceof Error ? error.message : '新增失败，请稍后重试');
    } finally {
      setCreateSaving(false);
    }
  }

  async function handleSaveAccount() {
    if (!accountForm.name.trim() || !accountForm.account.trim() || accountSaving) return;
    if (accountForm.password && !accountForm.currentPassword.trim()) {
      setAccountError('修改密码前请输入当前密码');
      return;
    }
    setAccountSaving(true);
    setAccountError('');
    setAccountSuccess('');
    try {
      const result = await updateVolunteerProfile(accountForm);
      login(result.token, {
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
      setAccountSuccess('账号信息已更新');
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : '保存失败，请稍后重试');
    } finally {
      setAccountSaving(false);
    }
  }

  return (
    <>
      <SubjectListPage
        title="智联名牌"
        loading={loading}
        subjects={filtered.map(toCareSubject)}
        keyword={keyword}
        onKeywordChange={setKeyword}
        headerLeadingAction={
          <button
            type="button"
            className="sl-page-header-icon"
            onClick={() => setShowAccountPanel(true)}
            aria-label="本账号管理"
            title="本账号管理"
          >
            <CircleUserRound size={18} />
          </button>
        }
        headerAction={
          <button type="button" className="sl-page-header-icon" onClick={logout} aria-label="退出登录" title="退出登录">
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
        secondaryActionLabel="新增"
        secondaryActionDescription={`直接新增老人档案，当前已负责 ${elders.length} 位`}
        emptyText="暂无已分配老人"
        searchPlaceholder="请输入老人姓名或档案编号"
      />

      {showAccountPanel ? (
        <div className="sl-modal-overlay" onClick={() => setShowAccountPanel(false)}>
          <div className="sl-modal-card" onClick={(event) => event.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <h3>本账号管理</h3>
              <button
                type="button"
                className="sl-page-header-icon"
                onClick={() => setShowAccountPanel(false)}
                aria-label="关闭账号管理"
              >
                <X size={18} />
              </button>
            </div>

            <div className="sl-form-stack">
              <div className="sl-card sl-card-soft">
                <div className="sl-section-title">
                  <h2>{user?.name || '当前志愿者'}</h2>
                </div>
                <div className="sl-form-grid">
                  <label className="sl-label">
                    <span className="sl-label-text">姓名</span>
                    <input
                      className="sl-input"
                      value={accountForm.name}
                      onChange={(event) => updateAccountForm('name', event.target.value)}
                      placeholder="请输入姓名"
                    />
                  </label>
                  <label className="sl-label">
                    <span className="sl-label-text">登录账号</span>
                    <input
                      className="sl-input"
                      value={accountForm.account}
                      onChange={(event) => updateAccountForm('account', event.target.value)}
                      placeholder="请输入登录账号"
                    />
                  </label>
                  <label className="sl-label">
                    <span className="sl-label-text">手机号</span>
                    <input
                      className="sl-input"
                      value={accountForm.phone}
                      onChange={(event) => updateAccountForm('phone', event.target.value)}
                      placeholder="请输入手机号"
                    />
                  </label>
                  <div className="sl-label">
                    <span className="sl-label-text">负责老人数量</span>
                    <div className="sl-summary-value">{elders.length} 位</div>
                  </div>
                  <label className="sl-label sl-label-full">
                    <span className="sl-label-text">当前密码</span>
                    <input
                      className="sl-input"
                      type="password"
                      value={accountForm.currentPassword}
                      onChange={(event) => updateAccountForm('currentPassword', event.target.value)}
                      placeholder="修改密码时必须填写"
                    />
                  </label>
                  <label className="sl-label sl-label-full">
                    <span className="sl-label-text">新密码</span>
                    <input
                      className="sl-input"
                      type="password"
                      value={accountForm.password}
                      onChange={(event) => updateAccountForm('password', event.target.value)}
                      placeholder="不修改可留空"
                    />
                  </label>
                </div>
              </div>
            </div>

            {accountError ? <p className="sl-login-error">{accountError}</p> : null}
            {accountSuccess ? <p className="sl-account-success">{accountSuccess}</p> : null}

            <div className="sl-modal-actions">
              <button type="button" className="sl-btn sl-btn-secondary" onClick={() => setShowAccountPanel(false)}>
                关闭
              </button>
              <button type="button" className="sl-btn sl-btn-secondary" onClick={handleSaveAccount} disabled={accountSaving}>
                {accountSaving ? '保存中...' : '保存修改'}
              </button>
              <button
                type="button"
                className="sl-btn sl-btn-primary"
                onClick={() => {
                  setShowAccountPanel(false);
                  logout();
                }}
              >
                <LogOut size={16} />
                退出登录
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showCreatePanel ? (
        <div className="sl-modal-overlay" onClick={() => setShowCreatePanel(false)}>
          <div className="sl-modal-card" onClick={(event) => event.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <h3>新增老人</h3>
              <button
                type="button"
                className="sl-page-header-icon"
                onClick={() => setShowCreatePanel(false)}
                aria-label="关闭新增老人"
              >
                <X size={18} />
              </button>
            </div>

            <div className="sl-form-stack">
              <div className="sl-card sl-card-soft">
                <div className="sl-form-grid">
                  <label className="sl-label">
                    <span className="sl-label-text">老人姓名</span>
                    <input
                      className="sl-input"
                      value={createForm.name}
                      onChange={(event) => updateCreateForm('name', event.target.value)}
                      placeholder="请输入老人姓名"
                    />
                  </label>
                  <label className="sl-label">
                    <span className="sl-label-text">性别</span>
                    <div className="sl-chips-row">
                      {(['男', '女'] as const).map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={createForm.gender === option ? 'sl-chip sl-chip-selected' : 'sl-chip'}
                          onClick={() => updateCreateForm('gender', option)}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </label>
                  <label className="sl-label">
                    <span className="sl-label-text">年龄</span>
                    <input
                      className="sl-input"
                      type="number"
                      value={createForm.age}
                      onChange={(event) => updateCreateForm('age', event.target.value)}
                      placeholder="请输入年龄"
                    />
                  </label>
                  <label className="sl-label">
                    <span className="sl-label-text">居住地</span>
                    <input
                      className="sl-input"
                      value={createForm.residence}
                      onChange={(event) => updateCreateForm('residence', event.target.value)}
                      placeholder="请输入住址"
                    />
                  </label>
                  <label className="sl-label">
                    <span className="sl-label-text">联系人</span>
                    <input
                      className="sl-input"
                      value={createForm.emergencyContactName}
                      onChange={(event) => updateCreateForm('emergencyContactName', event.target.value)}
                      placeholder="请输入联系人姓名"
                    />
                  </label>
                  <label className="sl-label">
                    <span className="sl-label-text">与老人关系</span>
                    <input
                      className="sl-input"
                      value={createForm.emergencyContactRelation}
                      onChange={(event) => updateCreateForm('emergencyContactRelation', event.target.value)}
                      placeholder="如 女儿 / 儿子 / 配偶"
                    />
                  </label>
                  <label className="sl-label sl-label-full">
                    <span className="sl-label-text">联系电话</span>
                    <input
                      className="sl-input"
                      type="tel"
                      value={createForm.emergencyContactPhone}
                      onChange={(event) => updateCreateForm('emergencyContactPhone', event.target.value)}
                      placeholder="请输入联系电话"
                    />
                  </label>
                </div>
              </div>
            </div>

            {createError ? <p className="sl-login-error">{createError}</p> : null}

            <div className="sl-modal-actions">
              <button type="button" className="sl-btn sl-btn-secondary" onClick={() => setShowCreatePanel(false)}>
                取消
              </button>
              <button type="button" className="sl-btn sl-btn-primary" onClick={handleCreateElder} disabled={createSaving}>
                {createSaving ? '新增中...' : '确认新增'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </>
  );
};
