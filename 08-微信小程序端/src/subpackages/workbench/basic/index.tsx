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
import { useI18n } from '@/i18n';

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
  const { t } = useI18n();
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
          setFormValue(createBasicFormValue(result));
        }
      } catch (error) {
        if (!cancelled) {
          setErrorText((error as Error)?.message || t('errors.loadBasicFailed'));
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
        title: t('errors.basicInfoSaved'),
        icon: 'success',
      });
    } catch (error) {
      setErrorText((error as Error)?.message || t('errors.saveRetry'));
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
      <WorkbenchHeader title={t('workbench.basicInfoEdit')} leadingAction={{ label: t('common.back'), icon: '←', onClick: handleBack }} />

      {loading ? <View className='sl-card'><View className='sl-empty-state'>{t('common.loading')} {t('workbench.basicInfo')}</View></View> : null}
      {errorText ? <View className='sl-error-card'>{errorText}</View> : null}

      {!loading && detail && formValue ? (
        <>
          <FormSectionCard title={t('workbench.basicInfo')} hint={t('workbench.basicInfoHint')}>
            <View className='sl-form-grid workbench-basic-grid'>
              <View className='sl-form-field workbench-basic-grid__name'>
                <Text className='sl-form-label'>{t('common.name')}</Text>
                <Input
                  className={isReadOnly('name') ? 'sl-form-input is-readonly sl-auto-data' : 'sl-form-input sl-auto-data'}
                  value={formValue.name}
                  disabled={isReadOnly('name')}
                  {...{ dir: 'auto' }}
                  onInput={(event) => updateField('name', event.detail.value)}
                />
              </View>

              <View className='sl-form-field workbench-basic-grid__gender'>
                <Text className='sl-form-label'>{t('common.gender')}</Text>
                <View className='sl-pill-switch workbench-basic-gender-switch'>
                  {(['男', '女'] as const).map((gender) => (
                    <Button
                      key={gender}
                      className={formValue.gender === gender ? 'sl-pill-switch__item is-active' : 'sl-pill-switch__item'}
                      disabled={isReadOnly('gender')}
                      onClick={() => updateField('gender', gender)}
                    >
                      {gender === '男' ? t('common.male') : t('common.female')}
                    </Button>
                  ))}
                </View>
              </View>

              <View className='sl-form-field workbench-basic-grid__age'>
                <Text className='sl-form-label'>{t('common.age')}</Text>
                <Input
                  className={isReadOnly('age') ? 'sl-form-input is-readonly sl-ltr-data' : 'sl-form-input sl-ltr-data'}
                  type='number'
                  value={formValue.age}
                  disabled={isReadOnly('age')}
                  onInput={(event) => updateField('age', event.detail.value)}
                />
              </View>

              <View className='sl-form-field workbench-basic-grid__residence'>
                <Text className='sl-form-label'>{t('workbench.residence')}</Text>
                <Input
                  className={isReadOnly('residence') ? 'sl-form-input is-readonly sl-auto-data' : 'sl-form-input sl-auto-data'}
                  value={formValue.residence}
                  disabled={isReadOnly('residence')}
                  {...{ dir: 'auto' }}
                  onInput={(event) => updateField('residence', event.detail.value)}
                />
              </View>

              <View className='sl-form-field'>
                <Text className='sl-form-label'>{t('scan.aboType')}</Text>
                <Input
                  className={isReadOnly('aboType') ? 'sl-form-input is-readonly sl-ltr-data' : 'sl-form-input sl-ltr-data'}
                  value={formValue.aboType}
                  disabled={isReadOnly('aboType')}
                  onInput={(event) => updateField('aboType', event.detail.value)}
                />
              </View>

              <View className='sl-form-field'>
                <Text className='sl-form-label'>{t('scan.rhType')}</Text>
                <Input
                  className={isReadOnly('rhType') ? 'sl-form-input is-readonly sl-ltr-data' : 'sl-form-input sl-ltr-data'}
                  value={formValue.rhType}
                  disabled={isReadOnly('rhType')}
                  onInput={(event) => updateField('rhType', event.detail.value)}
                />
              </View>

              <View className='sl-form-field sl-form-field--full'>
                <Text className='sl-form-label'>{t('common.allergyHistory')}</Text>
                <Textarea
                  className={isReadOnly('allergyHistory') ? 'sl-form-textarea is-readonly sl-auto-data' : 'sl-form-textarea sl-auto-data'}
                  value={formValue.allergyHistory}
                  disabled={isReadOnly('allergyHistory')}
                  {...{ dir: 'auto' }}
                  onInput={(event) => updateField('allergyHistory', event.detail.value)}
                />
              </View>
            </View>
          </FormSectionCard>

          <FormSectionCard title={t('workbench.emergencyContact')}>
            <View className='sl-form-grid workbench-basic-grid'>
              <View className='sl-form-field'>
                <Text className='sl-form-label'>{t('common.contact')}</Text>
                <Input
                  className={isReadOnly('emergencyContactName') ? 'sl-form-input is-readonly sl-auto-data' : 'sl-form-input sl-auto-data'}
                  value={formValue.emergencyContactName}
                  disabled={isReadOnly('emergencyContactName')}
                  {...{ dir: 'auto' }}
                  onInput={(event) => updateField('emergencyContactName', event.detail.value)}
                />
              </View>

              <View className='sl-form-field'>
                <Text className='sl-form-label'>{t('common.relationship')}</Text>
                <Input
                  className={isReadOnly('emergencyContactRelation') ? 'sl-form-input is-readonly sl-auto-data' : 'sl-form-input sl-auto-data'}
                  value={formValue.emergencyContactRelation}
                  disabled={isReadOnly('emergencyContactRelation')}
                  {...{ dir: 'auto' }}
                  onInput={(event) => updateField('emergencyContactRelation', event.detail.value)}
                />
              </View>

              <View className='sl-form-field sl-form-field--full'>
                <Text className='sl-form-label'>{t('common.contactPhone')}</Text>
                <Input
                  className={isReadOnly('emergencyContactPhone') ? 'sl-form-input is-readonly sl-ltr-data' : 'sl-form-input sl-ltr-data'}
                  type='number'
                  value={formValue.emergencyContactPhone}
                  disabled={isReadOnly('emergencyContactPhone')}
                  onInput={(event) => updateField('emergencyContactPhone', event.detail.value)}
                />
              </View>
            </View>
          </FormSectionCard>

          {canEditContactOnly ? (
            <FormSectionCard title={t('workbench.backupContact')}>
              <View className='sl-form-grid workbench-basic-grid'>
                <View className='sl-form-field'>
                  <Text className='sl-form-label'>{t('common.contact')}</Text>
                  <Input
                    className={isReadOnly('backupContactName') ? 'sl-form-input is-readonly sl-auto-data' : 'sl-form-input sl-auto-data'}
                    value={formValue.backupContactName}
                    disabled={isReadOnly('backupContactName')}
                    {...{ dir: 'auto' }}
                    onInput={(event) => updateField('backupContactName', event.detail.value)}
                  />
                </View>

                <View className='sl-form-field'>
                  <Text className='sl-form-label'>{t('common.relationship')}</Text>
                  <Input
                    className={isReadOnly('backupContactRelation') ? 'sl-form-input is-readonly sl-auto-data' : 'sl-form-input sl-auto-data'}
                    value={formValue.backupContactRelation}
                    disabled={isReadOnly('backupContactRelation')}
                    {...{ dir: 'auto' }}
                    onInput={(event) => updateField('backupContactRelation', event.detail.value)}
                  />
                </View>

                <View className='sl-form-field sl-form-field--full'>
                  <Text className='sl-form-label'>{t('common.contactPhone')}</Text>
                  <Input
                    className={isReadOnly('backupContactPhone') ? 'sl-form-input is-readonly sl-ltr-data' : 'sl-form-input sl-ltr-data'}
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
              {t('workbench.submitSave')}
            </Button>
          ) : null}

          <BottomNavGrid elderId={detail.id} activeKey='basic' />
        </>
      ) : null}
    </WorkbenchShell>
  );
}
