import { useCallback, useEffect, useMemo, useState } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { View } from '@tarojs/components';

import { APP_ROUTES } from '@/app/app.constants';
import { fetchWorkbenchElderDetail, type WorkbenchElderDetail } from '@/services/workbench/elderService';
import { getAuthSession } from '@/store/auth/authStore';
import ActionTileGrid, { type ActionTileItem } from '@/components/workbench/ActionTileGrid';
import SummaryHero from '@/components/workbench/SummaryHero';
import WorkbenchHeader from '@/components/workbench/WorkbenchHeader';
import WorkbenchShell from '@/components/workbench/WorkbenchShell';

import './index.scss';

function toDisplayValue(value?: string | number) {
  if (value == null || value === '') {
    return '未填写';
  }
  return String(value);
}

export default function WorkbenchElderDetailPage() {
  const router = useRouter();
  const elderId = String(router.params?.elderId || '');

  const [detail, setDetail] = useState<WorkbenchElderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');

  const session = getAuthSession();
  const sessionRole = session?.role;

  useEffect(() => {
    if (!session) {
      void Taro.redirectTo({ url: APP_ROUTES.login });
      return;
    }

    if (!elderId) {
      setErrorText('缺少老人标识，请返回列表重新进入');
      setLoading(false);
      return;
    }

    const activeSession = session;
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setErrorText('');
        const result = await fetchWorkbenchElderDetail(activeSession.role, elderId);
        if (!cancelled) {
          setDetail(result);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorText((error as Error)?.message || '加载老人详情失败');
          setDetail(null);
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
  }, [elderId, sessionRole]);

  const summaryFields = useMemo(() => {
    if (!detail) {
      return [];
    }

    return [
      { label: '住址信息', value: toDisplayValue(detail.residence) },
      {
        label: '紧急联系人（关系）',
        value: detail.emergencyContactName
          ? `${detail.emergencyContactName}${detail.emergencyContactRelation ? `（${detail.emergencyContactRelation}）` : ''}`
          : '未填写',
      },
      { label: '联系电话', value: toDisplayValue(detail.emergencyContactPhone) },
      { label: '血型 / 过敏史', value: detail.bloodType || detail.allergyHistory || '未填写' },
    ];
  }, [detail]);

  const handleBack = useCallback(() => {
    void Taro.navigateBack({ delta: 1 }).catch(() => Taro.redirectTo({ url: APP_ROUTES.workbenchElderList }));
  }, []);

  const handleOpenPage = useCallback(async (path: string) => {
    if (!elderId) {
      return;
    }

    await Taro.navigateTo({
      url: `${path}?elderId=${encodeURIComponent(elderId)}`,
    });
  }, [elderId]);

  const actionItems = useMemo<ActionTileItem[]>(() => [
    { key: 'basic', title: '基本信息', description: '档案资料', onClick: () => void handleOpenPage(APP_ROUTES.workbenchBasic) },
    { key: 'medication', title: '主要用药', description: '用药记录', onClick: () => void handleOpenPage(APP_ROUTES.workbenchMedication) },
    { key: 'scale', title: '量表信息', description: 'PHQ / GAD / UCLA', onClick: () => void handleOpenPage(APP_ROUTES.workbenchScale) },
    { key: 'qrcode', title: '二维码管理', description: '扫码名牌', onClick: () => void handleOpenPage(APP_ROUTES.workbenchQrCode) },
  ], [handleOpenPage]);

  if (!session) {
    return null;
  }

  return (
    <WorkbenchShell pageClassName='workbench-elder-detail-page'>
      <WorkbenchHeader
        title='老人详情'
        leadingAction={{ label: '返回', icon: '←', onClick: handleBack }}
        trailingAction={{ label: '编辑', icon: '', onClick: () => void handleOpenPage(APP_ROUTES.workbenchBasic), compact: false }}
      />

      {loading ? <View className='sl-card'><View className='sl-empty-state'>老人详情加载中...</View></View> : null}
      {errorText ? <View className='sl-error-card'>{errorText}</View> : null}

      {!loading && detail ? (
        <>
          <SummaryHero
            title={detail.name || '老人详情'}
            meta={`档案编号 ${detail.archiveNo || '未分配'}${detail.gender ? ` ${detail.gender}` : ''}${detail.age ? ` ${detail.age}岁` : ''}`}
            fields={summaryFields}
          />
          <ActionTileGrid items={actionItems} detail />
        </>
      ) : null}
    </WorkbenchShell>
  );
}
