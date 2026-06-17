import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input, Text, Textarea, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';

import { APP_ROUTES } from '@/app/app.constants';
import {
  createBasicFormValue,
  fetchWorkbenchElderDetail,
  saveVolunteerBasicInfo,
  updateFamilyContacts,
  type WorkbenchBasicFormValue,
  type WorkbenchElderDetail,
} from '@/services/workbench/elderService';
import { getAuthSession } from '@/store/auth/authStore';
import { getCurrentElderSummary, saveCurrentElderSummary } from '@/store/elder/currentElderStore';
import { canEditBasicInfo, canManageContacts } from '@/utils/permissions';
import BottomNavGrid from '@/components/workbench/BottomNavGrid';
import FormSectionCard from '@/components/workbench/FormSectionCard';
import WorkbenchHeader from '@/components/workbench/WorkbenchHeader';
import WorkbenchShell from '@/components/workbench/WorkbenchShell';

import './index.scss';

type FormField = keyof WorkbenchBasicFormValue;

function updateSummaryFromForm(detail: WorkbenchElderDetail, formValue: WorkbenchBasicFormValue) {
  const cached = getCurrentElderSummary();
  if (!cached || cached.id !== detail.id) {
    return;
  }

  saveCurrentElderSummary({
    ...cached,
    name: formValue.name.trim() || cached.name,
    gender: formValue.gender.trim() || cached.gender,
    age: Number(formValue.age || cached.age || 0),
    residence: formValue.residence.trim(),
    emergencyContactName: formValue.emergencyContactName.trim(),
    emergencyContactPhone: formValue.emergencyContactPhone.trim(),
    emergencyContactRelation: formValue.emergencyContactRelation.trim(),
    bloodType: [formValue.aboType.trim(), formValue.rhType.trim()].filter(Boolean).join(' '),
    allergyHistory: formValue.allergyHistory.trim(),
  });
}

export default function WorkbenchBasicPage() {
  const router = useRouter();
  const elderId = String(router.params?.elderId || '');
  const session = getAuthSession();

  const [detail, setDetail] = useState<WorkbenchElderDetail | null>(null);
  const [formValue, setFormValue] = useState<WorkbenchBasicFormValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    if (!session) {
      void Taro.redirectTo({ url: APP_ROUTES.login });
      return;
    }

    if (!elderId) {
      setErrorText('缺少老人标识，请返回详情页重新进入');
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
          setFormValue(createBasicFormValue(result));
        }
      } catch (error) {
        if (!cancelled) {
          setErrorText((error as Error)?.message || '加载基本信息失败');
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

  const canEditAll = useMemo(() => Boolean(session && canEditBasicInfo(session.role)), [session]);
  const canEditContactOnly = useMemo(() => Boolean(session && canManageContacts(session.role)), [session]);

  const updateField = useCallback((field: FormField, value: string) => {
    setFormValue((current) => (current ? { ...current, [field]: value } : current));
  }, []);

  const isReadOnly = useCallback((field: FormField) => {
    if (canEditAll) {
      return false;
    }

    if (canEditContactOnly) {
      return !field.startsWith('emergency') && !field.startsWith('backup');
    }

    return true;
  }, [canEditAll, canEditContactOnly]);

  const handleSave = useCallback(async () => {
    if (!session || !detail || !formValue || saving) {
      return;
    }

    try {
      setSaving(true);
      setErrorText('');
      if (canEditAll) {
        await saveVolunteerBasicInfo(detail.id, formValue);
      } else if (canEditContactOnly) {
        await updateFamilyContacts(detail.id, formValue);
      }

      updateSummaryFromForm(detail, formValue);
      void Taro.showToast({
        title: '保存成功',
        icon: 'success',
      });
    } catch (error) {
      setErrorText((error as Error)?.message || '保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  }, [session, detail, formValue, saving, canEditAll, canEditContactOnly]);

  const handleBack = useCallback(() => {
    void Taro.navigateBack({ delta: 1 }).catch(() => Taro.redirectTo({ url: `${APP_ROUTES.workbenchElderDetail}?elderId=${encodeURIComponent(elderId)}` }));
  }, [elderId]);

  if (!session) {
    return null;
  }

  const showContactSave = canEditAll || canEditContactOnly;

  return (
    <WorkbenchShell pageClassName='workbench-basic-page'>
      <WorkbenchHeader title='基本信息编辑' leadingAction={{ label: '返回', icon: '←', onClick: handleBack }} />

      {loading ? <View className='sl-card'><View className='sl-empty-state'>基本信息加载中...</View></View> : null}
      {errorText ? <View className='sl-error-card'>{errorText}</View> : null}

      {!loading && detail && formValue ? (
        <>
          <FormSectionCard title='基础信息' hint='按老人档案顺序维护基础资料，关键信息优先放在首屏。'>
            <View className='sl-form-grid workbench-basic-grid'>
              <View className='sl-form-field workbench-basic-grid__name'>
                <Text className='sl-form-label'>姓名</Text>
                <Input
                  className={isReadOnly('name') ? 'sl-form-input is-readonly' : 'sl-form-input'}
                  value={formValue.name}
                  disabled={isReadOnly('name')}
                  onInput={(event) => updateField('name', event.detail.value)}
                />
              </View>

              <View className='sl-form-field workbench-basic-grid__gender'>
                <Text className='sl-form-label'>性别</Text>
                <View className='sl-pill-switch workbench-basic-gender-switch'>
                  {(['男', '女'] as const).map((gender) => (
                    <Button
                      key={gender}
                      className={formValue.gender === gender ? 'sl-pill-switch__item is-active' : 'sl-pill-switch__item'}
                      disabled={isReadOnly('gender')}
                      onClick={() => updateField('gender', gender)}
                    >
                      {gender}
                    </Button>
                  ))}
                </View>
              </View>

              <View className='sl-form-field workbench-basic-grid__age'>
                <Text className='sl-form-label'>年龄</Text>
                <Input
                  className={isReadOnly('age') ? 'sl-form-input is-readonly' : 'sl-form-input'}
                  type='number'
                  value={formValue.age}
                  disabled={isReadOnly('age')}
                  onInput={(event) => updateField('age', event.detail.value)}
                />
              </View>

              <View className='sl-form-field workbench-basic-grid__residence'>
                <Text className='sl-form-label'>居住地</Text>
                <Input
                  className={isReadOnly('residence') ? 'sl-form-input is-readonly' : 'sl-form-input'}
                  value={formValue.residence}
                  disabled={isReadOnly('residence')}
                  onInput={(event) => updateField('residence', event.detail.value)}
                />
              </View>

              <View className='sl-form-field'>
                <Text className='sl-form-label'>ABO 血型</Text>
                <Input
                  className={isReadOnly('aboType') ? 'sl-form-input is-readonly' : 'sl-form-input'}
                  value={formValue.aboType}
                  disabled={isReadOnly('aboType')}
                  onInput={(event) => updateField('aboType', event.detail.value)}
                />
              </View>

              <View className='sl-form-field'>
                <Text className='sl-form-label'>Rh 血型</Text>
                <Input
                  className={isReadOnly('rhType') ? 'sl-form-input is-readonly' : 'sl-form-input'}
                  value={formValue.rhType}
                  disabled={isReadOnly('rhType')}
                  onInput={(event) => updateField('rhType', event.detail.value)}
                />
              </View>

              <View className='sl-form-field sl-form-field--full'>
                <Text className='sl-form-label'>过敏史</Text>
                <Textarea
                  className={isReadOnly('allergyHistory') ? 'sl-form-textarea is-readonly' : 'sl-form-textarea'}
                  value={formValue.allergyHistory}
                  disabled={isReadOnly('allergyHistory')}
                  onInput={(event) => updateField('allergyHistory', event.detail.value)}
                />
              </View>
            </View>
          </FormSectionCard>

          <FormSectionCard title='紧急联系人'>
            <View className='sl-form-grid workbench-basic-grid'>
              <View className='sl-form-field'>
                <Text className='sl-form-label'>联系人</Text>
                <Input
                  className={isReadOnly('emergencyContactName') ? 'sl-form-input is-readonly' : 'sl-form-input'}
                  value={formValue.emergencyContactName}
                  disabled={isReadOnly('emergencyContactName')}
                  onInput={(event) => updateField('emergencyContactName', event.detail.value)}
                />
              </View>

              <View className='sl-form-field'>
                <Text className='sl-form-label'>与老人关系</Text>
                <Input
                  className={isReadOnly('emergencyContactRelation') ? 'sl-form-input is-readonly' : 'sl-form-input'}
                  value={formValue.emergencyContactRelation}
                  disabled={isReadOnly('emergencyContactRelation')}
                  onInput={(event) => updateField('emergencyContactRelation', event.detail.value)}
                />
              </View>

              <View className='sl-form-field sl-form-field--full'>
                <Text className='sl-form-label'>联系电话</Text>
                <Input
                  className={isReadOnly('emergencyContactPhone') ? 'sl-form-input is-readonly' : 'sl-form-input'}
                  type='number'
                  value={formValue.emergencyContactPhone}
                  disabled={isReadOnly('emergencyContactPhone')}
                  onInput={(event) => updateField('emergencyContactPhone', event.detail.value)}
                />
              </View>
            </View>
          </FormSectionCard>

          {canEditContactOnly ? (
            <FormSectionCard title='备用联系人'>
              <View className='sl-form-grid workbench-basic-grid'>
                <View className='sl-form-field'>
                  <Text className='sl-form-label'>联系人</Text>
                  <Input
                    className={isReadOnly('backupContactName') ? 'sl-form-input is-readonly' : 'sl-form-input'}
                    value={formValue.backupContactName}
                    disabled={isReadOnly('backupContactName')}
                    onInput={(event) => updateField('backupContactName', event.detail.value)}
                  />
                </View>

                <View className='sl-form-field'>
                  <Text className='sl-form-label'>与老人关系</Text>
                  <Input
                    className={isReadOnly('backupContactRelation') ? 'sl-form-input is-readonly' : 'sl-form-input'}
                    value={formValue.backupContactRelation}
                    disabled={isReadOnly('backupContactRelation')}
                    onInput={(event) => updateField('backupContactRelation', event.detail.value)}
                  />
                </View>

                <View className='sl-form-field sl-form-field--full'>
                  <Text className='sl-form-label'>联系电话</Text>
                  <Input
                    className={isReadOnly('backupContactPhone') ? 'sl-form-input is-readonly' : 'sl-form-input'}
                    type='number'
                    value={formValue.backupContactPhone}
                    disabled={isReadOnly('backupContactPhone')}
                    onInput={(event) => updateField('backupContactPhone', event.detail.value)}
                  />
                </View>
              </View>
            </FormSectionCard>
          ) : null}

          {showContactSave ? (
            <Button className='sl-primary-button sl-primary-button--wide workbench-basic-save-button' loading={saving} onClick={handleSave}>
              提交保存
            </Button>
          ) : null}

          <BottomNavGrid elderId={detail.id} activeKey='basic' />
        </>
      ) : null}
    </WorkbenchShell>
  );
}
