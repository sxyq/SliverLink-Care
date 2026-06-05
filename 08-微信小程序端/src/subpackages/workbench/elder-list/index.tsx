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

import './index.scss';

function buildStatus(item: WorkbenchElderListItem) {
  if (item.role === ROLE_TYPES.family) {
    return '已绑定';
  }
  return item.lastUpdate ? '持续随访中' : '待补充';
}

function buildContact(item: WorkbenchElderListItem) {
  if (!item.emergencyContactName) {
    return '待补充';
  }
  return `${item.emergencyContactName}${item.emergencyContactRelation ? `（${item.emergencyContactRelation}）` : ''}`;
}

function buildBloodOrAllergy(item: WorkbenchElderListItem) {
  if (item.bloodType) {
    return {
      label: '血型',
      value: item.bloodType,
    };
  }

  return {
    label: '过敏史',
    value: item.allergyHistory || '暂无明确过敏史',
  };
}

function mapCarouselItem(item: WorkbenchElderListItem): ArchiveCarouselItem {
  const bloodOrAllergy = buildBloodOrAllergy(item);
  return {
    id: item.id,
    name: item.name || '未命名老人',
    archiveNo: item.archiveNo || '待生成',
    gender: item.gender || '待补充',
    age: item.age > 0 ? `${item.age}岁` : '年龄待补充',
    residence: item.residence || '待补充',
    status: buildStatus(item),
    contactName: buildContact(item),
    contactPhone: item.emergencyContactPhone || '待补充',
    bloodOrAllergyLabel: bloodOrAllergy.label,
    bloodOrAllergyValue: bloodOrAllergy.value,
  };
}

export default function WorkbenchElderListPage() {
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
          setErrorText((error as Error)?.message || '加载老人列表失败');
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
  }, [sessionRole]);

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
          setProfileError((error as Error)?.message || '加载账号信息失败');
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
  }, [session, showAccountPanel]);

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
      setProfileSuccess('账号信息已更新');
    } catch (error) {
      setProfileError((error as Error)?.message || '保存失败，请稍后重试');
    } finally {
      setProfileSaving(false);
    }
  }, [session, profileSaving, profileForm]);

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
        title: '当前账号仅可查看已绑定老人',
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
  }, [session?.role]);

  const handleSaveAdd = useCallback(async () => {
    if (!addForm.name.trim() || addSaving) {
      setErrorText('请填写老人姓名');
      return;
    }
    try {
      setAddSaving(true);
      setErrorText('');
      const result = await createVolunteerElder(addForm);
      setShowAddModal(false);
      void Taro.showToast({ title: '新增成功', icon: 'success' });
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
      setErrorText((error as Error)?.message || '新增老人失败');
    } finally {
      setAddSaving(false);
    }
  }, [addForm, addSaving, session?.role]);

  if (!session) {
    return null;
  }

  const carouselItems = filteredItems.map(mapCarouselItem);
  const showAddCard = session.role === ROLE_TYPES.volunteer;

  return (
    <WorkbenchShell pageClassName='workbench-elder-list-page'>
      <WorkbenchHeader
        title='智联名牌'
        leadingAction={{ label: '账号', icon: '👤', onClick: handleShowAccount }}
        trailingAction={{ label: '退出', icon: '⇢', onClick: handleLogout, disabled: loggingOut }}
      />

      <SearchPanel value={keyword} placeholder='请输入老人姓名或档案编号' onChange={setKeyword} />

      {errorText ? <View className='sl-error-card'>{errorText}</View> : null}

      {loading ? (
        <View className='sl-card'>
          <View className='sl-empty-state'>老人列表加载中...</View>
        </View>
      ) : null}

      {!loading && !carouselItems.length ? (
        <View className='sl-card'>
          <View className='sl-empty-state'>
            {items.length ? '未找到匹配的老人，请调整搜索条件。' : '当前账号下暂无可展示的老人档案。'}
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
            <Text className='sl-add-card__title'>{showAddCard ? '新增' : '老人档案'}</Text>
            <Text className='sl-add-card__desc'>
              {showAddCard ? `直接新增老人档案，当前已负责 ${items.length} 位` : `当前已绑定 ${items.length} 位老人，仅展示账号授权范围内档案`}
            </Text>
          </View>
          <View className='sl-add-card__side'>
            <Text className='sl-add-card__cap'>{items.length} 位</Text>
            <Button className='sl-add-card__btn' disabled={!showAddCard}>
              {showAddCard ? '新增档案 +' : '已绑定'}
            </Button>
          </View>
        </View>
      ) : null}

      {showAddModal ? (
        <View className='sl-modal-overlay'>
          <View className='sl-modal-backdrop' onClick={() => setShowAddModal(false)} />
          <View className='sl-modal-card sl-account-panel'>
            <View className='sl-account-panel__header'>
              <Text className='sl-account-panel__title'>新增老人档案</Text>
            </View>

            <View className='sl-card sl-card-soft sl-account-panel__body'>
              <View className='sl-form-grid sl-account-panel__grid'>
                <View className='sl-form-field'>
                  <Text className='sl-form-label'>姓名 *</Text>
                  <Input
                    className='sl-form-input'
                    value={addForm.name}
                    placeholder='请输入老人姓名'
                    onInput={(event) => updateAddForm('name', event.detail.value)}
                  />
                </View>

                <View className='sl-form-field'>
                  <Text className='sl-form-label'>性别</Text>
                  <View className='sl-form-input' style={{ display: 'flex', gap: '16rpx', alignItems: 'center' }}>
                    <Text
                      className={addForm.gender === '男' ? 'sl-chip is-active' : 'sl-chip'}
                      onClick={() => updateAddForm('gender', '男')}
                    >
                      男
                    </Text>
                    <Text
                      className={addForm.gender === '女' ? 'sl-chip is-active' : 'sl-chip'}
                      onClick={() => updateAddForm('gender', '女')}
                    >
                      女
                    </Text>
                  </View>
                </View>

                <View className='sl-form-field'>
                  <Text className='sl-form-label'>年龄</Text>
                  <Input
                    className='sl-form-input'
                    type='number'
                    value={addForm.age}
                    placeholder='请输入年龄'
                    onInput={(event) => updateAddForm('age', event.detail.value)}
                  />
                </View>

                <View className='sl-form-field sl-form-field--full'>
                  <Text className='sl-form-label'>居住地</Text>
                  <Input
                    className='sl-form-input'
                    value={addForm.residence}
                    placeholder='请输入居住地'
                    onInput={(event) => updateAddForm('residence', event.detail.value)}
                  />
                </View>

                <View className='sl-form-field'>
                  <Text className='sl-form-label'>联系人姓名</Text>
                  <Input
                    className='sl-form-input'
                    value={addForm.emergencyContactName}
                    placeholder='请输入联系人姓名'
                    onInput={(event) => updateAddForm('emergencyContactName', event.detail.value)}
                  />
                </View>

                <View className='sl-form-field'>
                  <Text className='sl-form-label'>联系人电话</Text>
                  <Input
                    className='sl-form-input'
                    type='number'
                    value={addForm.emergencyContactPhone}
                    placeholder='请输入联系人电话'
                    onInput={(event) => updateAddForm('emergencyContactPhone', event.detail.value)}
                  />
                </View>

                <View className='sl-form-field'>
                  <Text className='sl-form-label'>联系人关系</Text>
                  <Input
                    className='sl-form-input'
                    value={addForm.emergencyContactRelation}
                    placeholder='请输入关系'
                    onInput={(event) => updateAddForm('emergencyContactRelation', event.detail.value)}
                  />
                </View>

                <View className='sl-form-field'>
                  <Text className='sl-form-label'>ABO 血型</Text>
                  <Input
                    className='sl-form-input'
                    value={addForm.aboType}
                    placeholder='如 A/B/AB/O'
                    onInput={(event) => updateAddForm('aboType', event.detail.value)}
                  />
                </View>

                <View className='sl-form-field'>
                  <Text className='sl-form-label'>Rh 血型</Text>
                  <Input
                    className='sl-form-input'
                    value={addForm.rhType}
                    placeholder='如 阳性/阴性'
                    onInput={(event) => updateAddForm('rhType', event.detail.value)}
                  />
                </View>

                <View className='sl-form-field sl-form-field--full'>
                  <Text className='sl-form-label'>过敏史</Text>
                  <Input
                    className='sl-form-input'
                    value={addForm.allergyHistory}
                    placeholder='请输入过敏史，无则留空'
                    onInput={(event) => updateAddForm('allergyHistory', event.detail.value)}
                  />
                </View>
              </View>
            </View>

            <View className='sl-account-panel__actions'>
              <Button className='sl-secondary-button sl-account-panel__ghost-button' onClick={() => setShowAddModal(false)}>
                取消
              </Button>
              <Button className='sl-primary-button sl-account-panel__primary-button' loading={addSaving} onClick={() => void handleSaveAdd()}>
                {addSaving ? '保存中...' : '保存'}
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
              <Text className='sl-account-panel__title'>本账号管理</Text>
            </View>

            <View className='sl-card sl-card-soft sl-account-panel__body'>
              <Text className='sl-account-panel__name'>{profileForm.name || session.displayName || '当前账号'}</Text>

              <View className='sl-form-grid sl-account-panel__grid'>
                <View className='sl-form-field'>
                  <Text className='sl-form-label'>姓名</Text>
                  <Input
                    className={session.role === ROLE_TYPES.volunteer ? 'sl-form-input' : 'sl-form-input is-readonly'}
                    value={profileForm.name}
                    disabled={session.role !== ROLE_TYPES.volunteer}
                    placeholder='请输入姓名'
                    onInput={(event) => updateProfileField('name', event.detail.value)}
                  />
                </View>

                <View className='sl-form-field'>
                  <Text className='sl-form-label'>登录账号</Text>
                  <Input
                    className={session.role === ROLE_TYPES.volunteer ? 'sl-form-input' : 'sl-form-input is-readonly'}
                    value={profileForm.account}
                    disabled={session.role !== ROLE_TYPES.volunteer}
                    placeholder='请输入登录账号'
                    onInput={(event) => updateProfileField('account', event.detail.value)}
                  />
                </View>

                <View className='sl-form-field'>
                  <Text className='sl-form-label'>手机号</Text>
                  <Input
                    className={session.role === ROLE_TYPES.volunteer ? 'sl-form-input' : 'sl-form-input is-readonly'}
                    value={profileForm.phone}
                    disabled={session.role !== ROLE_TYPES.volunteer}
                    placeholder={session.role === ROLE_TYPES.volunteer ? '请输入手机号' : '当前账号未开放手机号编辑'}
                    onInput={(event) => updateProfileField('phone', event.detail.value)}
                  />
                </View>

                <View className='sl-form-field'>
                  <Text className='sl-form-label'>负责老人数量</Text>
                  <View className='sl-account-panel__metric'>{items.length} 位</View>
                </View>

                {session.role === ROLE_TYPES.volunteer ? (
                  <>
                    <View className='sl-form-field sl-form-field--full'>
                      <Text className='sl-form-label'>当前密码</Text>
                      <Input
                        className='sl-form-input'
                        password
                        value={profileForm.currentPassword}
                        placeholder='修改密码时必须填写'
                        onInput={(event) => updateProfileField('currentPassword', event.detail.value)}
                      />
                    </View>

                    <View className='sl-form-field sl-form-field--full'>
                      <Text className='sl-form-label'>新密码</Text>
                      <Input
                        className='sl-form-input'
                        password
                        value={profileForm.password}
                        placeholder='不修改可留空'
                        onInput={(event) => updateProfileField('password', event.detail.value)}
                      />
                    </View>
                  </>
                ) : null}
              </View>
            </View>

            {profileLoading ? <View className='sl-account-panel__tip'>账号信息加载中...</View> : null}
            {profileError ? <View className='sl-error-card sl-account-panel__feedback'>{profileError}</View> : null}
            {profileSuccess ? <View className='sl-account-panel__success'>{profileSuccess}</View> : null}

            <View className='sl-account-panel__actions'>
              <Button className='sl-secondary-button sl-account-panel__ghost-button' onClick={() => setShowAccountPanel(false)}>
                关闭
              </Button>
              {session.role === ROLE_TYPES.volunteer ? (
                <Button className='sl-secondary-button sl-account-panel__ghost-button' loading={profileSaving} onClick={() => void handleSaveProfile()}>
                  {profileSaving ? '保存中...' : '保存修改'}
                </Button>
              ) : null}
              <Button className='sl-primary-button sl-account-panel__primary-button' loading={loggingOut} onClick={() => void handleLogout()}>
                退出登录
              </Button>
            </View>
          </View>
        </View>
      ) : null}
    </WorkbenchShell>
  );
}
