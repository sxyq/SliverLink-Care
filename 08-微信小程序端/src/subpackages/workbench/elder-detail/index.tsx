import { useCallback, useEffect, useMemo, useState } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { Text, View } from '@tarojs/components';

import { APP_ROUTES } from '@/app/app.constants';
import { fetchWorkbenchElderDetail, type WorkbenchElderDetail } from '@/services/workbench/elderService';
import { getAuthSession } from '@/store/auth/authStore';
import ActionTileGrid, { type ActionTileItem } from '@/components/workbench/ActionTileGrid';
import SummaryHero, { type SummaryHeroField } from '@/components/workbench/SummaryHero';
import WorkbenchHeader from '@/components/workbench/WorkbenchHeader';
import WorkbenchShell from '@/components/workbench/WorkbenchShell';
import { useI18n } from '@/i18n';
import { I18nPageShell } from '@/components/layout/I18nPageShell';

import './index.scss';

function toDisplayValue(value: string | number | undefined, fallback: string) {
  if (value == null || value === '') {
    return fallback;
  }
  return String(value);
}

function WorkbenchElderDetailPage() {
  const { t } = useI18n();
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
      setErrorText(t('errors.noElderIdentifier'));
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
          setErrorText((error as Error)?.message || t('errors.loadElderDetailFailed'));
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
  }, [elderId, sessionRole, t]);

  const summaryFields = useMemo<SummaryHeroField[]>(() => {
    if (!detail) {
      return [];
    }

    return [
      { label: t('scan.addressInfo'), value: toDisplayValue(detail.residence, t('common.notProvided')), direction: 'auto' },
      {
        label: `${t('workbench.emergencyContact')}（${t('common.relationship')}）`,
        value: detail.emergencyContactName
          ? `${detail.emergencyContactName}${detail.emergencyContactRelation ? `（${detail.emergencyContactRelation}）` : ''}`
          : t('common.notProvided'),
        direction: 'auto',
      },
      { label: t('common.contactPhone'), value: toDisplayValue(detail.emergencyContactPhone, t('common.notProvided')), direction: 'ltr' },
      {
        label: `${t('common.bloodType')} / ${t('common.allergyHistory')}`,
        value: detail.bloodType || detail.allergyHistory || t('common.notProvided'),
        direction: detail.bloodType ? 'ltr' : 'auto',
      },
    ];
  }, [detail, t]);

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
    { key: 'basic', title: t('workbench.basicInfo'), description: t('workbench.archiveData'), onClick: () => void handleOpenPage(APP_ROUTES.workbenchBasic) },
    { key: 'medication', title: t('workbench.medication'), description: t('workbench.medicationRecords'), onClick: () => void handleOpenPage(APP_ROUTES.workbenchMedication) },
    { key: 'scale', title: t('workbench.scale'), description: 'PHQ / GAD / UCLA', onClick: () => void handleOpenPage(APP_ROUTES.workbenchScale) },
    { key: 'qrcode', title: t('workbench.qrManagement'), description: t('workbench.scanNameplate'), onClick: () => void handleOpenPage(APP_ROUTES.workbenchQrCode) },
  ], [handleOpenPage, t]);

  if (!session) {
    return null;
  }

  return (
    <WorkbenchShell pageClassName='workbench-elder-detail-page'>
      <WorkbenchHeader
        title={t('workbench.elderDetail')}
        leadingAction={{ label: t('common.back'), icon: '←', onClick: handleBack }}
        trailingAction={{ label: t('common.edit'), icon: '', onClick: () => void handleOpenPage(APP_ROUTES.workbenchBasic), compact: false }}
      />

      {loading ? <View className='sl-card'><View className='sl-empty-state'>{t('common.loading')} {t('workbench.elderDetail')}</View></View> : null}
      {errorText ? <View className='sl-error-card'>{errorText}</View> : null}

      {!loading && detail ? (
        <>
          <SummaryHero
            title={detail.name || t('workbench.elderDetail')}
            meta={
              <>
                {t('common.archiveNumber')} <Text className='sl-ltr-data'>{detail.archiveNo || t('common.generatedPending')}</Text>
                {detail.gender ? ` ${detail.gender === '男' ? t('common.male') : detail.gender === '女' ? t('common.female') : detail.gender}` : ''}
                {detail.age ? <Text className='sl-auto-data' {...{ dir: 'auto' }}> {t('common.yearsOld', { age: detail.age })}</Text> : null}
              </>
            }
            fields={summaryFields}
          />
          <ActionTileGrid items={actionItems} detail />
        </>
      ) : null}
    </WorkbenchShell>
  );
}

export default function WorkbenchElderDetailPageEntry() {
  return (
    <I18nPageShell navigationTitleKey='workbench.elderDetail'>
      <WorkbenchElderDetailPage />
    </I18nPageShell>
  );
}
