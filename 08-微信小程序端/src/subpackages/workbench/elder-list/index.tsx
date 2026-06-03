import { useEffect, useMemo, useState } from 'react';
import { Button, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';

import { APP_ROUTES, ROLE_TYPES } from '@/app/app.constants';
import { fetchWorkbenchElders, type WorkbenchElderListItem } from '@/services/workbench/elderService';
import { logoutWorkbenchAccount } from '@/services/workbench/authService';
import { updateAppSession } from '@/store/app/appSessionStore';
import { clearAuthSession, getAuthSession } from '@/store/auth/authStore';
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

function getRoleSubtitle(role: string) {
  return role === ROLE_TYPES.volunteer ? '志愿者工作台' : '家属工作台';
}

export default function WorkbenchElderListPage() {
  const [items, setItems] = useState<WorkbenchElderListItem[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

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

  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim();

    if (!normalizedKeyword) {
      return items;
    }

    return items.filter((item) => item.name.includes(normalizedKeyword) || item.archiveNo.includes(normalizedKeyword));
  }, [items, keyword]);

  useEffect(() => {
    if (!filteredItems.length) {
      setActiveIndex(0);
      return;
    }
    if (activeIndex >= filteredItems.length) {
      setActiveIndex(filteredItems.length - 1);
    }
  }, [activeIndex, filteredItems.length]);

  async function handleLogout() {
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
  }

  async function handleOpenDetail(item: WorkbenchElderListItem) {
    saveCurrentElderSummary(item);
    await Taro.navigateTo({
      url: `${APP_ROUTES.workbenchElderDetail}?elderId=${encodeURIComponent(item.id)}`,
    });
  }

  function handleShowAccount() {
    if (!session) {
      return;
    }

    void Taro.showModal({
      title: '当前账号',
      content: `${session.displayName}\n${getRoleSubtitle(session.role)}`,
      showCancel: false,
      confirmText: '我知道了',
    });
  }

  function handleAddCard() {
    void Taro.showToast({
      title: session?.role === ROLE_TYPES.volunteer ? '小程序端暂未开放新增' : '当前账号仅可查看已绑定老人',
      icon: 'none',
    });
  }

  if (!session) {
    return null;
  }

  const carouselItems = filteredItems.map(mapCarouselItem);
  const displaySymbol = session.displayName.slice(0, 1) || '我';
  const showAddCard = session.role === ROLE_TYPES.volunteer;

  return (
    <WorkbenchShell pageClassName='workbench-elder-list-page'>
      <WorkbenchHeader
        title='智联名牌'
        leadingAction={{ label: '账号', icon: displaySymbol, onClick: handleShowAccount }}
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
          <View className='sl-add-card__icon'>{showAddCard ? '✎' : '✓'}</View>
        </View>
      ) : null}

      <Text className='sl-list-footer'>共 {filteredItems.length || items.length} 位老人</Text>
    </WorkbenchShell>
  );
}
