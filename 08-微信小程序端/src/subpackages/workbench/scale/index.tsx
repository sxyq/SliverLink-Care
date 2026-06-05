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
    '你多久感到被冷落？',
    '你多久感到与他人隔绝？',
    '你多久感到无人可求助？',
    '你多久感到和周围人不够亲近？',
    '你多久感到孤独？',
  ],
};

const optionLabels: Record<WorkbenchScaleType, string[]> = {
  'PHQ-9': ['从不(0分)', '几天(1分)', '一半以上(2分)', '几乎每天(3分)'],
  'GAD-7': ['从不(0分)', '几天(1分)', '一半以上(2分)', '几乎每天(3分)'],
  UCLA: ['从不(0分)', '很少(1分)', '有时(2分)', '经常(3分)'],
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

export default function WorkbenchScalePage() {
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
      setErrorText('缺少老人标识，请返回详情页重新进入');
      return;
    }

    if (!canViewScales(session.role)) {
      setLoading(false);
      setErrorText('当前角色暂不开放量表功能');
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
          setErrorText((error as Error)?.message || '加载量表记录失败');
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
  }, [elderId, session?.role]);

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
        title: '量表已保存',
        icon: 'success',
      });
    } catch (error) {
      setErrorText((error as Error)?.message || '保存量表失败');
    } finally {
      setSaving(false);
    }
  }, [elderId, saving, session?.role, activeDraft]);

  const handleBack = useCallback(() => {
    void Taro.navigateBack({ delta: 1 }).catch(() => Taro.redirectTo({ url: APP_ROUTES.workbenchElderDetail }));
  }, []);

  if (!session) {
    return null;
  }

  return (
    <WorkbenchShell pageClassName='workbench-scale-page'>
      <WorkbenchHeader title='量表填写' subtitle={elderName || undefined} leadingAction={{ label: '返回', icon: '←', onClick: handleBack }} />

      {errorText ? <View className='sl-error-card'>{errorText}</View> : null}
      {loading ? <View className='sl-card'><View className='sl-empty-state'>量表记录加载中...</View></View> : null}

      {!loading ? (
        <>
          <View className='sl-card sl-form-panel'>
            <ScaleTabBar activeType={activeType} onChange={setActiveType} />
          </View>

          <View className='sl-scale-progress-card'>
            <View className='sl-scale-progress-row'>
              <Text>进度 {answeredCount}/{activeDraft.answers.length}</Text>
              <Text>{progressPercent}%</Text>
            </View>
            <View className='sl-progress-track'>
              <View className='sl-progress-bar' style={{ width: `${progressPercent}%` }} />
            </View>
            <View className='sl-scale-progress-row sl-scale-progress-row--strong'>
              <Text>当前量表：{activeType}</Text>
              <Text style={{ color: 'var(--sl-primary-deep)', fontWeight: '700' }}>总分 {displayScore}</Text>
            </View>
            <View className='sl-scale-progress-row'>
              <Text>最近保存：{formatDateTimeLabel(activeRecord?.date)}</Text>
              {canEditScales(session.role) ? (
                <Button
                  className={editing ? 'sl-secondary-button' : 'sl-primary-button'}
                  loading={saving}
                  onClick={editing ? handleSave : () => setEditing(true)}
                >
                  {editing ? '提交保存' : '编辑量表'}
                </Button>
              ) : null}
            </View>
          </View>

          <View className='sl-card sl-scale-window'>
            <View className='sl-scale-window-head'>
              <Text className='sl-scale-window-head__title'>{activeType} 题目</Text>
              <Text className='sl-scale-window-head__meta'>{editing ? '编辑模式：可直接修改' : '查看模式：点击编辑后才可修改'}</Text>
            </View>

            {hasPersistedScoreOnly ? (
              <Text className='sl-scale-window-note'>当前已保存历史总分，但旧记录未保留逐题答案。点击编辑后可重新完整填写本量表。</Text>
            ) : null}

            <ScrollView scrollY className='sl-scale-window-body'>
              {activeDraft.answers.map((answer: WorkbenchScaleAnswer, index) => (
                <View key={`${activeType}-${index}`} className='sl-question'>
                  <Text className='sl-question-text'><Text className='sl-question-num'>{index + 1}.</Text>{answer.question}</Text>
                  <View className='sl-scale-options'>
                    {optionLabels[activeType].map((label, value) => (
                      <View
                        key={`${activeType}-${index}-${label}`}
                        className={
                          answer.value === value
                            ? 'sl-scale-option is-active'
                            : editing
                              ? 'sl-scale-option'
                              : 'sl-scale-option is-readonly'
                        }
                        onClick={editing ? () => updateAnswer(index, value) : undefined}
                      >
                        {label}
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

          <View className='sl-disclaimer'>
            <Text>!</Text>
            <Text>量表结果仅作为随访记录，不作为临床诊断结论。请结合老人近况和实际评估综合判断。</Text>
          </View>
        </>
      ) : null}
    </WorkbenchShell>
  );
}
