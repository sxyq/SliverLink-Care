import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, ScrollView, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';

import { APP_ROUTES } from '@/app/app.constants';
import {
  fetchVolunteerScaleRecords,
  saveVolunteerScaleRecord,
  type WorkbenchScaleAnswer,
  type WorkbenchScaleDraft,
  type WorkbenchScaleRecord,
  type WorkbenchScaleType,
} from '@/services/workbench/scaleService';
import { getAuthSession } from '@/store/auth/authStore';
import { getCurrentElderSummary } from '@/store/elder/currentElderStore';
import { formatDateTimeLabel } from '@/utils/formatters';
import { canEditScales, canViewScales } from '@/utils/permissions';
import ScaleTabBar from '@/components/workbench/ScaleTabBar';
import WorkbenchHeader from '@/components/workbench/WorkbenchHeader';
import WorkbenchShell from '@/components/workbench/WorkbenchShell';
import { useI18n } from '@/i18n';
import { I18nPageShell } from '@/components/layout/I18nPageShell';

import './index.scss';

const scaleQuestions: Record<WorkbenchScaleType, string[]> = {
  'PHQ-9': [
    '做事时提不起劲或没有乐趣',
    '感到心情低落、沮丧或绝望',
    '入睡困难、睡不安稳或睡眠过多',
    '感觉疲倦或没有活力',
    '食欲不振或吃太多',
    '觉得自己很糟或觉得自己很失败',
    '对事物专注有困难',
    '动作或说话速度缓慢到别人已经察觉？或刚好相反，烦躁或坐立不安、动来动去的情况更胜于平常',
    '有不如死掉或用某种方式伤害自己的念头',
  ],
  'GAD-7': [
    '感到紧张、焦虑或急切',
    '无法停止或控制担忧',
    '对各种各样的事情担忧过多',
    '很难放松下来',
    '坐立不安，难以安静待着',
    '变得很容易烦恼或急躁',
    '感到好像将有可怕的事情发生',
  ],
  UCLA: [
    '你多久感到缺乏陪伴？',
    '你多久感到被遗弃？',
    '你多久感到无人可求助？',
    '你多久感到孤立无援？',
    '你多久感到与朋友隔绝？',
    '你多久感到与周围人关系不和谐？',
    '你多久感到自己是群体的一员？（反向计分）',
    '你多久感到没有人真正理解你？',
    '你多久感到被冷落？',
    '你多久感到与他人的关系密切？（反向计分）',
    '你多久感到在社交场合感到孤独？',
    '你多久感到与他人的联系中断？',
    '你多久感到身边没有人可以倾诉？',
    '你多久感到无人可以倾诉？',
    '你多久感到没有人真正亲近你？',
    '你多久感到没有人可以求助？',
    '你多久感到被排斥？',
    '你多久感到与他人隔绝？',
    '你多久感到在人群中仍然孤独？',
    '你多久感到与他人的关系没有意义？',
  ],
};

const optionLabels: Record<WorkbenchScaleType, string[]> = {
  'PHQ-9': ['从不(0分)', '几天(1分)', '一半以上(2分)', '几乎每天(3分)'],
  'GAD-7': ['从不(0分)', '几天(1分)', '一半以上(2分)', '几乎每天(3分)'],
  UCLA: ['从不(0分)', '很少(1分)', '有时(2分)', '经常(3分)'],
};

const optionLabelKeys: Record<WorkbenchScaleType, string[]> = {
  'PHQ-9': ['scan.answerNever', 'scan.answerFewDays', 'scan.answerMoreThanHalf', 'scan.answerNearlyEveryDay'],
  'GAD-7': ['scan.answerNotAtAll', 'scan.answerSeveralDays', 'scan.answerOverAWeek', 'scan.answerNearlyEveryDay'],
  UCLA: ['scan.answerNever', 'scan.answerRarely', 'scan.answerSometimes', 'scan.answerAlways'],
};

const questionKeys: Record<WorkbenchScaleType, string[]> = {
  'PHQ-9': Array.from({ length: 9 }, (_, index) => `scan.scalePhqQuestion${index + 1}`),
  'GAD-7': Array.from({ length: 7 }, (_, index) => `scan.scaleGadQuestion${index + 1}`),
  UCLA: Array.from({ length: 20 }, (_, index) => `workbench.scaleUclaQuestion${index + 1}`),
};

function createDraft(type: WorkbenchScaleType): WorkbenchScaleDraft {
  return {
    type,
    answers: scaleQuestions[type].map((question) => ({
      question,
      value: null,
    })),
  };
}

function buildDraftFromRecord(type: WorkbenchScaleType, record?: WorkbenchScaleRecord | null): WorkbenchScaleDraft {
  const answerMap = new Map((record?.answers || []).map((item) => [item.question, item.value]));

  return {
    type,
    answers: scaleQuestions[type].map((question) => ({
      question,
      value: answerMap.has(question) ? answerMap.get(question) ?? null : null,
    })),
  };
}

function WorkbenchScalePage() {
  const { t } = useI18n();
  const router = useRouter();
  const elderId = String(router.params?.elderId || '');
  const session = getAuthSession();
  const cachedSummary = getCurrentElderSummary();
  const elderName = cachedSummary?.id === elderId ? cachedSummary.name : '';

  const [activeType, setActiveType] = useState<WorkbenchScaleType>('PHQ-9');
  const [records, setRecords] = useState<WorkbenchScaleRecord[]>([]);
  const [drafts, setDrafts] = useState<Record<WorkbenchScaleType, WorkbenchScaleDraft>>({
    'PHQ-9': createDraft('PHQ-9'),
    'GAD-7': createDraft('GAD-7'),
    UCLA: createDraft('UCLA'),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    if (!session) {
      void Taro.redirectTo({ url: APP_ROUTES.login });
      return;
    }

    if (!elderId) {
      setLoading(false);
      setErrorText(t('errors.noElderIdentifier'));
      return;
    }

    if (!canViewScales(session.role)) {
      setLoading(false);
      setErrorText(t('errors.roleScaleUnavailable'));
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setErrorText('');
        const result = await fetchVolunteerScaleRecords(elderId);
        if (!cancelled) {
          setRecords(result);
          setDrafts({
            'PHQ-9': buildDraftFromRecord('PHQ-9', result.find((item) => item.name === 'PHQ-9')),
            'GAD-7': buildDraftFromRecord('GAD-7', result.find((item) => item.name === 'GAD-7')),
            UCLA: buildDraftFromRecord('UCLA', result.find((item) => item.name === 'UCLA')),
          });
        }
      } catch (error) {
        if (!cancelled) {
          setErrorText((error as Error)?.message || t('errors.loadScaleFailed'));
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
  }, [elderId, session?.role, t]);

  const activeDraft = drafts[activeType];
  const activeRecord = useMemo(() => records.find((item) => item.name === activeType) || null, [activeType, records]);
  const answeredCount = useMemo(() => activeDraft.answers.filter((answer) => answer.value != null).length, [activeDraft.answers]);
  const totalScore = useMemo(() => activeDraft.answers.reduce((sum, answer) => sum + (answer.value ?? 0), 0), [activeDraft.answers]);
  const progressPercent = activeDraft.answers.length ? Math.round((answeredCount / activeDraft.answers.length) * 100) : 0;
  const hasPersistedScoreOnly = Boolean(activeRecord && !activeRecord.answers.length && activeRecord.score > 0);
  const displayScore = answeredCount > 0 || editing ? totalScore : activeRecord?.score || 0;

  const updateAnswer = useCallback((index: number, value: number) => {
    if (!editing) {
      return;
    }

    setDrafts((current) => ({
      ...current,
      [activeType]: {
        ...current[activeType],
        answers: current[activeType].answers.map((item, itemIndex) => (itemIndex === index ? { ...item, value } : item)),
      },
    }));
  }, [editing, activeType]);

  const handleSave = useCallback(async () => {
    if (!elderId || saving || !canEditScales(session?.role || 'FAMILY')) {
      return;
    }

    try {
      setSaving(true);
      setErrorText('');
      await saveVolunteerScaleRecord(elderId, activeDraft);
      const nextRecords = await fetchVolunteerScaleRecords(elderId);
      setRecords(nextRecords);
      setEditing(false);
      void Taro.showToast({
        title: t('errors.scaleSaved'),
        icon: 'success',
      });
    } catch (error) {
      setErrorText((error as Error)?.message || t('errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  }, [elderId, saving, session?.role, activeDraft, t]);

  const handleBack = useCallback(() => {
    void Taro.navigateBack({ delta: 1 }).catch(() => Taro.redirectTo({ url: `${APP_ROUTES.workbenchElderDetail}?elderId=${encodeURIComponent(elderId)}` }));
  }, [elderId]);

  if (!session) {
    return null;
  }

  return (
    <WorkbenchShell pageClassName='workbench-scale-page'>
      <WorkbenchHeader title={t('workbench.completeScale')} subtitle={elderName || undefined} leadingAction={{ label: t('common.back'), icon: '←', onClick: handleBack }} />

      {errorText ? <View className='sl-error-card'>{errorText}</View> : null}
      {loading ? <View className='sl-card'><View className='sl-empty-state'>{t('common.loading')} {t('scan.scaleRecords')}</View></View> : null}

      {!loading ? (
        <>
          <View className='sl-card sl-form-panel'>
            <ScaleTabBar activeType={activeType} onChange={setActiveType} />
          </View>

          <View className='sl-scale-progress-card'>
            <View className='sl-scale-progress-row'>
              <Text>{t('common.progress')} <Text className='sl-ltr-data'>{answeredCount}/{activeDraft.answers.length}</Text></Text>
              <Text className='sl-ltr-data'>{progressPercent}%</Text>
            </View>
            <View className='sl-progress-track'>
              <View className='sl-progress-bar' style={{ width: `${progressPercent}%` }} />
            </View>
            <View className='sl-scale-progress-row sl-scale-progress-row--strong'>
              <Text>{t('common.currentScale')}：<Text className='sl-ltr-data'>{activeType}</Text></Text>
              <Text style={{ color: 'var(--sl-primary-deep)', fontWeight: '700' }}>{t('scan.scaleTotal')} <Text className='sl-ltr-data'>{displayScore}</Text></Text>
            </View>
            <View className='sl-scale-progress-row'>
              <Text>{t('common.recentSaved')}：<Text className='sl-ltr-data'>{formatDateTimeLabel(activeRecord?.date)}</Text></Text>
              {canEditScales(session.role) ? (
                <Button
                  className={editing ? 'sl-secondary-button' : 'sl-primary-button'}
                  loading={saving}
                  onClick={editing ? handleSave : () => setEditing(true)}
                >
                  {editing ? t('common.submit') : t('common.editScale')}
                </Button>
              ) : null}
            </View>
          </View>

          <View className='sl-card sl-scale-window'>
            <View className='sl-scale-window-head'>
              <Text className='sl-scale-window-head__title'><Text className='sl-ltr-data'>{activeType}</Text> {t('workbench.scaleQuestions')}</Text>
              <Text className='sl-scale-window-head__meta'>{editing ? t('common.editMode') : t('common.viewMode')}</Text>
            </View>

            {hasPersistedScoreOnly ? (
                <Text className='sl-scale-window-note'>{t('common.scoreOnlyNotice')}</Text>
            ) : null}

            <ScrollView scrollY className='sl-scale-window-body'>
              {activeDraft.answers.map((answer: WorkbenchScaleAnswer, index) => (
                <View key={`${activeType}-${index}`} className='sl-question'>
                  <Text className='sl-question-text'><Text className='sl-question-num'>{index + 1}.</Text>{t(questionKeys[activeType][index])}</Text>
                  <View className='sl-scale-options'>
                    {optionLabels[activeType].map((_label, value) => (
                      <View
                        key={`${activeType}-${index}-${value}`}
                        className={
                          answer.value === value
                            ? 'sl-scale-option is-active'
                            : editing
                              ? 'sl-scale-option'
                              : 'sl-scale-option is-readonly'
                        }
                        onClick={editing ? () => updateAnswer(index, value) : undefined}
                      >
                        {t(optionLabelKeys[activeType][value])}({value}{t('common.points')})
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

          <View className='sl-disclaimer'>
            <Text>!</Text>
            <Text>{t('common.scaleDisclaimer')}</Text>
          </View>
        </>
      ) : null}
    </WorkbenchShell>
  );
}

export default function WorkbenchScalePageEntry() {
  return (
    <I18nPageShell navigationTitleKey='workbench.scale'>
      <WorkbenchScalePage />
    </I18nPageShell>
  );
}
