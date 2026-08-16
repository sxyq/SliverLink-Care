import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';

import { useDebouncedSearch } from '@/utils/throttleDebounce';

import { APP_ROUTES, ROLE_TYPES } from '@/app/app.constants';
import { createVolunteerElder, fetchWorkbenchElders, type WorkbenchElderListItem, type WorkbenchBasicFormValue } from '@/services/workbench/elderService';
import { fetchWorkbenchProfile, logoutWorkbenchAccount, updateWorkbenchProfile } from '@/services/workbench/authService';
import { updateAppSession } from '@/store/app/appSessionStore';
import { clearAuthSession, getAuthSession, updateAuthSession } from '@/store/auth/authStore';
import { clearCurrentElderSummary, saveCurrentElderSummary } from '@/store/elder/currentElderStore';
import { ArchiveCarousel, type ArchiveCarouselItem } from '@/components/workbench/ArchiveCarousel';
import SearchPanel from '@/components/workbench/SearchPanel';
import WorkbenchHeader from '@/components/workbench/WorkbenchHeader';
import WorkbenchShell from '@/components/workbench/WorkbenchShell';
import { useI18n } from '@/i18n';
import { I18nPageShell } from '@/components/layout/I18nPageShell';

import './index.scss';

function buildStatus(item: WorkbenchElderListItem, t: (key: string, params?: Record<string, string | number>) => string) {
  if (item.role === ROLE_TYPES.family) {
    return t('status.bound');
  }
  return item.lastUpdate ? t('status.followup') : t('common.pendingSupplement');
}

function buildContact(item: WorkbenchElderListItem, t: (key: string, params?: Record<string, string | number>) => string) {
  if (!item.emergencyContactName) {
    return t('common.pendingSupplement');
  }
  return `${item.emergencyContactName}${item.emergencyContactRelation ? `（${item.emergencyContactRelation}）` : ''}`;
}

function buildBloodOrAllergy(item: WorkbenchElderListItem, t: (key: string, params?: Record<string, string | number>) => string) {
  if (item.bloodType) {
    return {
      label: t('common.bloodType'),
      value: item.bloodType,
    };
  }

  return {
    label: t('common.allergyHistory'),
    value: item.allergyHistory || t('workbench.noKnownAllergy'),
  };
}

function mapCarouselItem(item: WorkbenchElderListItem, t: (key: string, params?: Record<string, string | number>) => string): ArchiveCarouselItem {
  const bloodOrAllergy = buildBloodOrAllergy(item, t);
  return {
    id: item.id,
    name: item.name || t('common.elderArchive'),
    archiveNo: item.archiveNo || t('common.generatedPending'),
    gender: item.gender || t('common.pendingSupplement'),
    age: item.age > 0 ? t('common.yearsOld', { age: item.age }) : t('common.agePending'),
    residence: item.residence || t('common.pendingSupplement'),
    status: buildStatus(item, t),
    contactName: buildContact(item, t),
    contactPhone: item.emergencyContactPhone || t('common.pendingSupplement'),
    bloodOrAllergyLabel: bloodOrAllergy.label,
    bloodOrAllergyValue: bloodOrAllergy.value,
  };
}

function WorkbenchElderListPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<WorkbenchElderListItem[]>([]);
  const [keyword, debouncedKeyword, setKeyword] = useDebouncedSearch('');
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [showAccountPanel, setShowAccountPanel] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileForm, setProfileForm] = useState({
    name: '',
    account: '',
    phone: '',
    currentPassword: '',
    password: '',
  });

  const session = getAuthSession();
  const sessionRole = session?.role;

  useEffect(() => {
    if (!session) {
      void Taro.redirectTo({ url: APP_ROUTES.login });
      return;
    }

    const activeSession = session;
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setErrorText('');
        const result = await fetchWorkbenchElders(activeSession.role);
        if (!cancelled) {
          setItems(result);
          updateAppSession({
            homeEntrySource: 'workbench',
            lastWorkbenchOpenedAt: Date.now(),
          });
        }
      } catch (error) {
        if (!cancelled) {
          setErrorText((error as Error)?.message || t('errors.loadElderListFailed'));
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [sessionRole, t]);

  useEffect(() => {
    if (!showAccountPanel || !session) {
      return;
    }

    const activeSession = session;
    let cancelled = false;
    setProfileError('');
    setProfileSuccess('');
    setProfileForm({
      name: activeSession.displayName || '',
      account: activeSession.accountId || '',
      phone: '',
      currentPassword: '',
      password: '',
    });

    if (activeSession.role !== ROLE_TYPES.volunteer) {
      return;
    }

    async function loadProfile() {
      try {
        setProfileLoading(true);
        const result = await fetchWorkbenchProfile(activeSession.role);
        if (!cancelled) {
          setProfileForm({
            name: result.name || activeSession.displayName || '',
            account: result.account || activeSession.accountId || '',
            phone: result.phone || '',
            currentPassword: '',
            password: '',
          });
        }
      } catch (error) {
        if (!cancelled) {
          setProfileError((error as Error)?.message || t('errors.profileLoadFailed'));
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [session, showAccountPanel, t]);

  const filteredItems = useMemo(() => {
    const normalizedKeyword = debouncedKeyword.trim();

    if (!normalizedKeyword) {
      return items;
    }

    return items.filter((item) => item.name.includes(normalizedKeyword) || item.archiveNo.includes(normalizedKeyword));
  }, [items, debouncedKeyword]);

  useEffect(() => {
    if (!filteredItems.length) {
      setActiveIndex(0);
      return;
    }
    if (activeIndex >= filteredItems.length) {
      setActiveIndex(filteredItems.length - 1);
    }
  }, [activeIndex, filteredItems.length]);

  const handleLogout = useCallback(async () => {
    if (!session || loggingOut) {
      return;
    }

    try {
      setLoggingOut(true);
      await logoutWorkbenchAccount(session.role);
    } finally {
      clearCurrentElderSummary();
      clearAuthSession();
      await Taro.redirectTo({ url: APP_ROUTES.login });
      setLoggingOut(false);
    }
  }, [session, loggingOut]);

  const updateProfileField = useCallback((field: 'name' | 'account' | 'phone' | 'currentPassword' | 'password', value: string) => {
    setProfileForm((current) => ({
      ...current,
      [field]: value,
    }));
  }, []);

  const handleSaveProfile = useCallback(async () => {
    if (!session || session.role !== ROLE_TYPES.volunteer || profileSaving) {
      return;
    }

    try {
      setProfileSaving(true);
      setProfileError('');
      setProfileSuccess('');
      const result = await updateWorkbenchProfile(profileForm);
      updateAuthSession({
        token: result.token || session.token,
        accountId: result.account,
        displayName: result.name,
      });
      setProfileForm((current) => ({
        ...current,
        name: result.name,
        account: result.account,
        phone: result.phone,
        currentPassword: '',
        password: '',
      }));
      setProfileSuccess(t('common.accountUpdated'));
    } catch (error) {
      setProfileError((error as Error)?.message || t('errors.profileSaveFailed'));
    } finally {
      setProfileSaving(false);
    }
  }, [session, profileSaving, profileForm, t]);

  const handleOpenDetail = useCallback(async (item: WorkbenchElderListItem) => {
    saveCurrentElderSummary(item);
    await Taro.navigateTo({
      url: `${APP_ROUTES.workbenchElderDetail}?elderId=${encodeURIComponent(item.id)}`,
    });
  }, []);

  const handleShowAccount = useCallback(() => {
    setShowAccountPanel(true);
  }, []);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addForm, setAddForm] = useState<WorkbenchBasicFormValue>({
    name: '',
    gender: '男',
    age: '',
    residence: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    backupContactName: '',
    backupContactPhone: '',
    backupContactRelation: '',
    aboType: '',
    rhType: '',
    allergyHistory: '',
  });

  const updateAddForm = useCallback((field: keyof WorkbenchBasicFormValue, value: string) => {
    setAddForm((current) => ({ ...current, [field]: value }));
  }, []);

  const handleAddCard = useCallback(() => {
    if (session?.role !== ROLE_TYPES.volunteer) {
      void Taro.showToast({
        title: t('common.accountOnlyView'),
        icon: 'none',
      });
      return;
    }
    setAddForm({
      name: '',
      gender: '男',
      age: '',
      residence: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelation: '',
      backupContactName: '',
      backupContactPhone: '',
      backupContactRelation: '',
      aboType: '',
      rhType: '',
      allergyHistory: '',
    });
    setShowAddModal(true);
  }, [session?.role, t]);

  const handleSaveAdd = useCallback(async () => {
    if (!addForm.name.trim() || addSaving) {
      setErrorText(t('errors.volunteerNameRequired'));
      return;
    }
    try {
      setAddSaving(true);
      setErrorText('');
      const result = await createVolunteerElder(addForm);
      setShowAddModal(false);
      void Taro.showToast({ title: t('common.addSuccess'), icon: 'success' });
      // 刷新列表
      const nextItems = await fetchWorkbenchElders(session?.role || ROLE_TYPES.volunteer);
      setItems(nextItems);
      // 跳转到详情页
      if (result.id) {
        const matched = nextItems.find((item) => item.id === result.id);
        if (matched) {
          saveCurrentElderSummary(matched);
        }
        await Taro.navigateTo({
          url: `${APP_ROUTES.workbenchElderDetail}?elderId=${encodeURIComponent(result.id)}`,
        });
      }
    } catch (error) {
      setErrorText((error as Error)?.message || t('errors.createElderFailed'));
    } finally {
      setAddSaving(false);
    }
  }, [addForm, addSaving, session?.role, t]);

  if (!session) {
    return null;
  }

  const carouselItems = filteredItems.map((item) => mapCarouselItem(item, t));
  const showAddCard = session.role === ROLE_TYPES.volunteer;

  return (
    <WorkbenchShell pageClassName='workbench-elder-list-page'>
      <WorkbenchHeader
        title={t('common.brandTitle')}
        leadingAction={{ label: t('common.account'), icon: '👤', onClick: handleShowAccount }}
        trailingAction={{ label: t('workbench.logout'), icon: '⇢', onClick: handleLogout, disabled: loggingOut }}
      />

      <SearchPanel value={keyword} placeholder={t('workbench.elderNameOrArchivePlaceholder')} onChange={setKeyword} />

      {errorText ? <View className='sl-error-card'>{errorText}</View> : null}

      {loading ? (
        <View className='sl-card'>
          <View className='sl-empty-state'>{t('common.loading')} {t('workbench.elderArchives')}</View>
        </View>
      ) : null}

      {!loading && !carouselItems.length ? (
        <View className='sl-card'>
          <View className='sl-empty-state'>
            {items.length ? t('common.noMatchingElder') : t('common.noVisibleElder')}
          </View>
        </View>
      ) : null}

      {!loading && carouselItems.length ? (
        <ArchiveCarousel
          items={carouselItems}
          activeIndex={activeIndex}
          onChange={setActiveIndex}
          onOpen={(item) => {
            const matched = filteredItems.find((current) => current.id === item.id);
            if (matched) {
              void handleOpenDetail(matched);
            }
          }}
        />
      ) : null}

      {!loading ? (
        <View className='sl-card sl-add-card' onClick={handleAddCard}>
          <View className='sl-add-card__copy'>
            <Text className='sl-add-card__title'>{showAddCard ? t('common.add') : t('common.elderArchive')}</Text>
            <Text className='sl-add-card__desc'>
              {showAddCard ? t('common.directAddDescription', { count: items.length }) : t('family.manageBoundHint', { count: items.length })}
            </Text>
          </View>
          <View className='sl-add-card__side'>
            <Text className='sl-add-card__cap'>{t('common.totalElders', { count: items.length })}</Text>
            <Button className='sl-add-card__btn' disabled={!showAddCard}>
              {showAddCard ? `${t('common.addElderArchive')} +` : t('family.boundElder')}
            </Button>
          </View>
        </View>
      ) : null}

      {showAddModal ? (
        <View className='sl-modal-overlay'>
          <View className='sl-modal-backdrop' onClick={() => setShowAddModal(false)} />
          <View className='sl-modal-card sl-account-panel'>
            <View className='sl-account-panel__header'>
              <Text className='sl-account-panel__title'>{t('common.addElderArchive')}</Text>
            </View>

            <View className='sl-card sl-card-soft sl-account-panel__body'>
              <View className='sl-form-grid sl-account-panel__grid'>
                <View className='sl-form-field'>
                  <Text className='sl-form-label'>{t('common.name')} *</Text>
                  <Input
                    className='sl-form-input sl-auto-data'
                    value={addForm.name}
                    placeholder={t('workbench.namePlaceholder')}
                    {...{ dir: 'auto' }}
                    onInput={(event) => updateAddForm('name', event.detail.value)}
                  />
                </View>

                <View className='sl-form-field'>
                  <Text className='sl-form-label'>{t('common.gender')}</Text>
                  <View className='sl-form-input' style={{ display: 'flex', gap: '16rpx', alignItems: 'center' }}>
                    <Text
                      className={addForm.gender === '男' ? 'sl-chip is-active' : 'sl-chip'}
                      onClick={() => updateAddForm('gender', '男')}
                    >
                      {t('common.male')}
                    </Text>
                    <Text
                      className={addForm.gender === '女' ? 'sl-chip is-active' : 'sl-chip'}
                      onClick={() => updateAddForm('gender', '女')}
                    >
                      {t('common.female')}
                    </Text>
                  </View>
                </View>

                <View className='sl-form-field'>
                  <Text className='sl-form-label'>{t('common.age')}</Text>
                  <Input
                    className='sl-form-input sl-ltr-data'
                    type='number'
                    value={addForm.age}
                    placeholder={t('workbench.agePlaceholder')}
                    onInput={(event) => updateAddForm('age', event.detail.value)}
                  />
                </View>

                <View className='sl-form-field sl-form-field--full'>
                  <Text className='sl-form-label'>{t('workbench.residence')}</Text>
                  <Input
                    className='sl-form-input sl-auto-data'
                    value={addForm.residence}
                    placeholder={t('workbench.residencePlaceholder')}
                    {...{ dir: 'auto' }}
                    onInput={(event) => updateAddForm('residence', event.detail.value)}
                  />
                </View>

                <View className='sl-form-field'>
                  <Text className='sl-form-label'>{t('common.contact')}</Text>
                  <Input
                    className='sl-form-input sl-auto-data'
                    value={addForm.emergencyContactName}
                    placeholder={t('workbench.contactNamePlaceholder')}
                    {...{ dir: 'auto' }}
                    onInput={(event) => updateAddForm('emergencyContactName', event.detail.value)}
                  />
                </View>

                <View className='sl-form-field'>
                  <Text className='sl-form-label'>{t('common.contactPhone')}</Text>
                  <Input
                    className='sl-form-input sl-ltr-data'
                    type='number'
                    value={addForm.emergencyContactPhone}
                    placeholder={t('workbench.contactPhonePlaceholder')}
                    onInput={(event) => updateAddForm('emergencyContactPhone', event.detail.value)}
                  />
                </View>

                <View className='sl-form-field'>
                  <Text className='sl-form-label'>{t('common.relationship')}</Text>
                  <Input
                    className='sl-form-input sl-auto-data'
                    value={addForm.emergencyContactRelation}
                    placeholder={t('workbench.relationshipPlaceholder')}
                    {...{ dir: 'auto' }}
                    onInput={(event) => updateAddForm('emergencyContactRelation', event.detail.value)}
                  />
                </View>

                <View className='sl-form-field'>
                  <Text className='sl-form-label'>{t('scan.aboType')}</Text>
                  <Input
                    className='sl-form-input sl-ltr-data'
                    value={addForm.aboType}
                    placeholder={t('workbench.bloodTypePlaceholder')}
                    onInput={(event) => updateAddForm('aboType', event.detail.value)}
                  />
                </View>

                <View className='sl-form-field'>
                  <Text className='sl-form-label'>{t('scan.rhType')}</Text>
                  <Input
                    className='sl-form-input sl-ltr-data'
                    value={addForm.rhType}
                    placeholder={t('workbench.rhTypePlaceholder')}
                    onInput={(event) => updateAddForm('rhType', event.detail.value)}
                  />
                </View>

                <View className='sl-form-field sl-form-field--full'>
                  <Text className='sl-form-label'>{t('common.allergyHistory')}</Text>
                  <Input
                    className='sl-form-input sl-auto-data'
                    value={addForm.allergyHistory}
                    placeholder={t('workbench.allergyPlaceholder')}
                    {...{ dir: 'auto' }}
                    onInput={(event) => updateAddForm('allergyHistory', event.detail.value)}
                  />
                </View>
              </View>
            </View>

            <View className='sl-account-panel__actions'>
              <Button className='sl-secondary-button sl-account-panel__ghost-button' onClick={() => setShowAddModal(false)}>
                {t('common.cancel')}
              </Button>
              <Button className='sl-primary-button sl-account-panel__primary-button' loading={addSaving} onClick={() => void handleSaveAdd()}>
                {addSaving ? t('common.saving') : t('common.save')}
              </Button>
            </View>
          </View>
        </View>
      ) : null}

      {showAccountPanel ? (
        <View className='sl-modal-overlay'>
          <View className='sl-modal-backdrop' onClick={() => setShowAccountPanel(false)} />
          <View className='sl-modal-card sl-account-panel'>
            <View className='sl-account-panel__header'>
              <Text className='sl-account-panel__title'>{t('common.accountManage')}</Text>
            </View>

            <View className='sl-card sl-card-soft sl-account-panel__body'>
              <Text className='sl-account-panel__name sl-auto-data' {...{ dir: 'auto' }}>{profileForm.name || session.displayName || t('common.currentAccount')}</Text>

              <View className='sl-form-grid sl-account-panel__grid'>
                <View className='sl-form-field'>
                  <Text className='sl-form-label'>{t('common.name')}</Text>
                  <Input
                    className={session.role === ROLE_TYPES.volunteer ? 'sl-form-input sl-auto-data' : 'sl-form-input is-readonly sl-auto-data'}
                    value={profileForm.name}
                    disabled={session.role !== ROLE_TYPES.volunteer}
                    {...{ dir: 'auto' }}
                    placeholder={t('workbench.namePlaceholder')}
                    onInput={(event) => updateProfileField('name', event.detail.value)}
                  />
                </View>

                <View className='sl-form-field'>
                  <Text className='sl-form-label'>{t('common.loginAccount')}</Text>
                  <Input
                    className={session.role === ROLE_TYPES.volunteer ? 'sl-form-input sl-ltr-data' : 'sl-form-input is-readonly sl-ltr-data'}
                    value={profileForm.account}
                    disabled={session.role !== ROLE_TYPES.volunteer}
                    placeholder={t('auth.inputAccount')}
                    onInput={(event) => updateProfileField('account', event.detail.value)}
                  />
                </View>

                <View className='sl-form-field'>
                  <Text className='sl-form-label'>{t('common.phone')}</Text>
                  <Input
                    className={session.role === ROLE_TYPES.volunteer ? 'sl-form-input sl-ltr-data' : 'sl-form-input is-readonly sl-ltr-data'}
                    value={profileForm.phone}
                    disabled={session.role !== ROLE_TYPES.volunteer}
                    placeholder={session.role === ROLE_TYPES.volunteer ? t('errors.phoneRequired') : t('common.phoneEditUnavailable')}
                    onInput={(event) => updateProfileField('phone', event.detail.value)}
                  />
                </View>

                <View className='sl-form-field'>
                  <Text className='sl-form-label'>{t('common.assignedCount')}</Text>
                  <View className='sl-account-panel__metric'>{t('common.totalElders', { count: items.length })}</View>
                </View>

                {session.role === ROLE_TYPES.volunteer ? (
                  <>
                    <View className='sl-form-field sl-form-field--full'>
                      <Text className='sl-form-label'>{t('auth.currentPassword')}</Text>
                      <Input
                        className='sl-form-input sl-ltr-data'
                        password
                        value={profileForm.currentPassword}
                        placeholder={t('common.currentPasswordRequired')}
                        onInput={(event) => updateProfileField('currentPassword', event.detail.value)}
                      />
                    </View>

                    <View className='sl-form-field sl-form-field--full'>
                      <Text className='sl-form-label'>{t('common.newPassword')}</Text>
                      <Input
                        className='sl-form-input sl-ltr-data'
                        password
                        value={profileForm.password}
                        placeholder={t('common.leaveBlankToKeep')}
                        onInput={(event) => updateProfileField('password', event.detail.value)}
                      />
                    </View>
                  </>
                ) : null}
              </View>
            </View>

            {profileLoading ? <View className='sl-account-panel__tip'>{t('common.profileLoading')}</View> : null}
            {profileError ? <View className='sl-error-card sl-account-panel__feedback'>{profileError}</View> : null}
            {profileSuccess ? <View className='sl-account-panel__success'>{profileSuccess}</View> : null}

            <View className='sl-account-panel__actions'>
              <Button className='sl-secondary-button sl-account-panel__ghost-button' onClick={() => setShowAccountPanel(false)}>
                {t('common.close')}
              </Button>
              {session.role === ROLE_TYPES.volunteer ? (
                <Button className='sl-secondary-button sl-account-panel__ghost-button' loading={profileSaving} onClick={() => void handleSaveProfile()}>
                  {profileSaving ? t('common.saving') : t('common.saveChanges')}
                </Button>
              ) : null}
              <Button className='sl-primary-button sl-account-panel__primary-button' loading={loggingOut} onClick={() => void handleLogout()}>
                {t('workbench.logout')}
              </Button>
            </View>
          </View>
        </View>
      ) : null}
    </WorkbenchShell>
  );
}

export default function WorkbenchElderListPageEntry() {
  return (
    <I18nPageShell navigationTitleKey='workbench.elderArchives'>
      <WorkbenchElderListPage />
    </I18nPageShell>
  );
}
