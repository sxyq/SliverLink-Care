import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';

import { APP_ROUTES, ROLE_TYPES, type RoleType } from '@/app/app.constants';
import {
  cacheVolunteerMedications,
  createFamilyMedication,
  deleteFamilyMedication,
  fetchWorkbenchMedications,
  getCachedVolunteerMedications,
  saveVolunteerMedications,
  updateFamilyMedication,
  type WorkbenchMedicationDraft,
  type WorkbenchMedicationItem,
} from '@/services/workbench/medicationService';
import { getAuthSession } from '@/store/auth/authStore';
import { getCurrentElderSummary } from '@/store/elder/currentElderStore';
import BottomNavGrid from '@/components/workbench/BottomNavGrid';
import FormSectionCard from '@/components/workbench/FormSectionCard';
import WorkbenchHeader from '@/components/workbench/WorkbenchHeader';
import WorkbenchShell from '@/components/workbench/WorkbenchShell';
import { useI18n } from '@/i18n';
import { I18nPageShell } from '@/components/layout/I18nPageShell';

import './index.scss';

const emptyDraft: WorkbenchMedicationDraft = {
  name: '',
  dosage: '',
  usage: '',
  timing: '',
};

type MedicationField = keyof WorkbenchMedicationDraft;

function toDraft(item: WorkbenchMedicationItem): WorkbenchMedicationDraft {
  return {
    id: item.id,
    name: item.name,
    dosage: item.dosage,
    usage: item.usage,
    timing: item.timing,
  };
}

function toPersistDraft(item: WorkbenchMedicationItem): WorkbenchMedicationDraft {
  return {
    id: item.id.startsWith('temp-') ? '' : item.id,
    name: item.name,
    dosage: item.dosage,
    usage: item.usage,
    timing: item.timing,
  };
}

function WorkbenchMedicationPage() {
  const { t } = useI18n();
  const router = useRouter();
  const elderId = String(router.params?.elderId || '');
  const session = getAuthSession();
  const cachedSummary = getCurrentElderSummary();
  const elderName = cachedSummary?.id === elderId ? cachedSummary.name : '';

  const [items, setItems] = useState<WorkbenchMedicationItem[]>([]);
  const [pendingDeletedIds, setPendingDeletedIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<WorkbenchMedicationDraft>(emptyDraft);
  const [editingId, setEditingId] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState('');

  const loadMedications = useCallback(async (role: RoleType, nextElderId: string) => {
    setLoading(true);
    setErrorText('');
    const result = await fetchWorkbenchMedications(role, nextElderId);
    setItems(result);
    setPendingDeletedIds([]);
  }, []);

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

    const activeSession = session;
    let cancelled = false;

    async function load() {
      try {
        await loadMedications(activeSession.role, elderId);
      } catch (error) {
        if (!cancelled) {
          setErrorText((error as Error)?.message || t('errors.loadMedicationFailed'));
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
  }, [elderId, loadMedications, session?.role, t]);

  const dirty = useMemo(() => {
    return Boolean(pendingDeletedIds.length || items.some((item) => item.id.startsWith('temp-')));
  }, [items, pendingDeletedIds]);

  const updateDraft = useCallback((field: MedicationField, value: string) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }, []);

  const handleOpenCreate = useCallback(() => {
    setDraft(emptyDraft);
    setEditingId('');
    setShowEditor(true);
    setErrorText('');
  }, []);

  const handleOpenEdit = useCallback((item: WorkbenchMedicationItem) => {
    setDraft(toDraft(item));
    setEditingId(item.id);
    setShowEditor(true);
    setErrorText('');
  }, []);

  const handleCancelEditor = useCallback(() => {
    setDraft(emptyDraft);
    setEditingId('');
    setShowEditor(false);
  }, []);

  const handleSaveDraft = useCallback(() => {
    if (!draft.name.trim()) {
      setErrorText(t('errors.medicationNameRequired'));
      return;
    }

    if (editingId) {
      setItems((current) =>
        current.map((item) =>
          item.id === editingId
            ? {
                ...item,
                name: draft.name.trim(),
                dosage: draft.dosage.trim(),
                usage: draft.usage.trim(),
                timing: draft.timing.trim(),
              }
            : item,
        ),
      );
    } else {
      setItems((current) => [
        ...current,
        {
          id: `temp-${Date.now()}`,
          name: draft.name.trim(),
          dosage: draft.dosage.trim(),
          usage: draft.usage.trim(),
          timing: draft.timing.trim(),
          updatedAt: '',
        },
      ]);
    }

    handleCancelEditor();
  }, [draft, editingId, t]);

  const handleDelete = useCallback((item: WorkbenchMedicationItem) => {
    setItems((current) => current.filter((row) => row.id !== item.id));
    if (!item.id.startsWith('temp-')) {
      setPendingDeletedIds((current) => Array.from(new Set([...current, item.id])));
    }
  }, []);

  const handleSubmitSave = useCallback(async () => {
    if (!session || !elderId || saving) {
      return;
    }

    try {
      setSaving(true);
      setErrorText('');

      if (session.role === ROLE_TYPES.volunteer) {
        await saveVolunteerMedications(elderId, items.map(toPersistDraft));
        const cachedItems = items.map((item) => ({
          ...item,
          updatedAt: item.updatedAt || new Date().toISOString(),
        }));
        cacheVolunteerMedications(elderId, cachedItems);
        setItems(getCachedVolunteerMedications(elderId));
        setPendingDeletedIds([]);
        void Taro.showToast({
          title: t('errors.medicationSaved'),
          icon: 'success',
        });
        return;
      }

      for (const deletedId of pendingDeletedIds) {
        await deleteFamilyMedication(elderId, deletedId);
      }

      const nextItems: WorkbenchMedicationItem[] = [];
      for (const item of items) {
        if (item.id.startsWith('temp-')) {
          const created = await createFamilyMedication(elderId, toPersistDraft(item));
          nextItems.push(created);
          continue;
        }

        const updated = await updateFamilyMedication(elderId, item.id, toPersistDraft(item));
        nextItems.push({
          ...item,
          ...updated,
        });
      }

      setItems(nextItems);
      setPendingDeletedIds([]);
      void Taro.showToast({
        title: t('errors.medicationSaved'),
        icon: 'success',
      });
    } catch (error) {
      setErrorText((error as Error)?.message || t('errors.saveRetry'));
    } finally {
      setSaving(false);
    }
  }, [session, elderId, saving, items, pendingDeletedIds, t]);

  const handleBack = useCallback(() => {
    void Taro.navigateBack({ delta: 1 }).catch(() => Taro.redirectTo({ url: `${APP_ROUTES.workbenchElderDetail}?elderId=${encodeURIComponent(elderId)}` }));
  }, [elderId]);

  if (!session) {
    return null;
  }

  return (
    <WorkbenchShell pageClassName='workbench-medication-page'>
      <WorkbenchHeader title={t('workbench.medication')} subtitle={elderName ? `${elderName} ${t('workbench.medicationRecords')}` : t('workbench.medicationRecords')} leadingAction={{ label: t('common.back'), icon: '←', onClick: handleBack }} />

      {errorText ? <View className='sl-error-card'>{errorText}</View> : null}
      {loading ? <View className='sl-card'><View className='sl-empty-state'>{t('common.loading')} {t('workbench.medicationRecords')}</View></View> : null}

      {!loading ? (
        <>
          <FormSectionCard title={t('workbench.medicationList')} hint={t('workbench.medicationHint')}>
            <View className='sl-submit-bar sl-submit-bar--split workbench-medication-actions'>
              <Button className='sl-secondary-button' onClick={handleOpenCreate}>
                  ＋ {t('workbench.addMedication')}
              </Button>
              <Button className='sl-primary-button' loading={saving} onClick={handleSubmitSave}>
                {t('workbench.submitSave')}
              </Button>
            </View>
          </FormSectionCard>

          {showEditor ? (
            <FormSectionCard title={editingId ? t('workbench.medicationEdit') : t('workbench.medicationAdd')}>
              <View className='sl-form-grid'>
                <View className='sl-form-field'>
                  <Text className='sl-form-label'>{t('workbench.medicationName')}</Text>
                  <Input className='sl-form-input sl-auto-data' {...{ dir: 'auto' }} value={draft.name} onInput={(event) => updateDraft('name', event.detail.value)} />
                </View>
                <View className='sl-form-field'>
                  <Text className='sl-form-label'>{t('workbench.dosage')}</Text>
                  <Input className='sl-form-input sl-ltr-data' value={draft.dosage} onInput={(event) => updateDraft('dosage', event.detail.value)} />
                </View>
                <View className='sl-form-field'>
                  <Text className='sl-form-label'>{t('workbench.usage')}</Text>
                  <Input className='sl-form-input sl-auto-data' {...{ dir: 'auto' }} value={draft.usage} onInput={(event) => updateDraft('usage', event.detail.value)} />
                </View>
                <View className='sl-form-field'>
                  <Text className='sl-form-label'>{t('workbench.medicationTime')}</Text>
                  <Input className='sl-form-input sl-auto-data' {...{ dir: 'auto' }} value={draft.timing} onInput={(event) => updateDraft('timing', event.detail.value)} />
                </View>
              </View>
              <View className='sl-submit-bar sl-submit-bar--split workbench-medication-editor-actions'>
                <Button className='sl-secondary-button' onClick={handleCancelEditor}>
                  {t('common.cancel')}
                </Button>
                <Button className='sl-primary-button' onClick={handleSaveDraft}>
                  {t('workbench.confirmSave')}
                </Button>
              </View>
            </FormSectionCard>
          ) : null}

          <View className='sl-table-card'>
            <View className='sl-table-header'>
              <Text>{t('workbench.medicationName')}</Text>
              <Text>{t('workbench.dosage')}</Text>
              <Text>{t('workbench.usage')}</Text>
              <Text>{t('workbench.medicationTime')}</Text>
              <Text>{t('workbench.actions')}</Text>
            </View>
            {items.length ? (
              items.map((item) => (
                <View key={item.id} className='sl-table-row'>
                  <Text className='sl-auto-data' {...{ dir: 'auto' }}>{item.name || '-'}</Text>
                  <Text className='sl-ltr-data'>{item.dosage || '-'}</Text>
                  <Text className='sl-auto-data' {...{ dir: 'auto' }}>{item.usage || '-'}</Text>
                  <Text className='sl-auto-data' {...{ dir: 'auto' }}>{item.timing || '-'}</Text>
                  <View className='sl-table-ops'>
                    <Button className='sl-inline-pill' onClick={() => handleOpenEdit(item)}>
                      {t('common.edit')}
                    </Button>
                    <Button className='sl-inline-pill sl-inline-pill--danger' onClick={() => handleDelete(item)}>
                      {t('common.delete')}
                    </Button>
                  </View>
                </View>
              ))
            ) : (
              <View className='sl-table-row sl-table-row--empty'>{t('errors.noMedicationRecords')}</View>
            )}
          </View>

          {dirty ? <Text className='sl-simple-note'>{t('errors.unsavedMedication')}</Text> : null}

          <BottomNavGrid elderId={elderId} activeKey='medication' />
        </>
      ) : null}
    </WorkbenchShell>
  );
}

export default function WorkbenchMedicationPageEntry() {
  return (
    <I18nPageShell navigationTitleKey='workbench.medication'>
      <WorkbenchMedicationPage />
    </I18nPageShell>
  );
}
