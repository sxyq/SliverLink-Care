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

export default function WorkbenchMedicationPage() {
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
      setErrorText('缺少老人标识，请返回详情页重新进入');
      return;
    }

    const activeSession = session;
    let cancelled = false;

    async function load() {
      try {
        await loadMedications(activeSession.role, elderId);
      } catch (error) {
        if (!cancelled) {
          setErrorText((error as Error)?.message || '加载用药信息失败');
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
  }, [elderId, loadMedications, session?.role]);

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
      setErrorText('请先填写药品名称');
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
  }, [draft, editingId]);

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
          title: '保存成功',
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
        title: '保存成功',
        icon: 'success',
      });
    } catch (error) {
      setErrorText((error as Error)?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  }, [session, elderId, saving, items, pendingDeletedIds]);

  const handleBack = useCallback(() => {
    void Taro.navigateBack({ delta: 1 }).catch(() => Taro.redirectTo({ url: `${APP_ROUTES.workbenchElderDetail}?elderId=${encodeURIComponent(elderId)}` }));
  }, [elderId]);

  if (!session) {
    return null;
  }

  return (
    <WorkbenchShell pageClassName='workbench-medication-page'>
      <WorkbenchHeader title='主要用药' subtitle={elderName ? `${elderName} 的用药记录` : '用药记录'} leadingAction={{ label: '返回', icon: '←', onClick: handleBack }} />

      {errorText ? <View className='sl-error-card'>{errorText}</View> : null}
      {loading ? <View className='sl-card'><View className='sl-empty-state'>用药信息加载中...</View></View> : null}

      {!loading ? (
        <>
          <FormSectionCard title='用药清单' hint='按照药品名称、剂量、用法和用药时间逐条维护，提交后同步到老人护理档案。'>
            <View className='sl-submit-bar sl-submit-bar--split workbench-medication-actions'>
              <Button className='sl-secondary-button' onClick={handleOpenCreate}>
                ＋ 添加用药
              </Button>
              <Button className='sl-primary-button' loading={saving} onClick={handleSubmitSave}>
                提交保存
              </Button>
            </View>
          </FormSectionCard>

          {showEditor ? (
            <FormSectionCard title={editingId ? '编辑用药' : '新增用药'}>
              <View className='sl-form-grid'>
                <View className='sl-form-field'>
                  <Text className='sl-form-label'>药品名称</Text>
                  <Input className='sl-form-input' value={draft.name} onInput={(event) => updateDraft('name', event.detail.value)} />
                </View>
                <View className='sl-form-field'>
                  <Text className='sl-form-label'>剂量</Text>
                  <Input className='sl-form-input' value={draft.dosage} onInput={(event) => updateDraft('dosage', event.detail.value)} />
                </View>
                <View className='sl-form-field'>
                  <Text className='sl-form-label'>用法</Text>
                  <Input className='sl-form-input' value={draft.usage} onInput={(event) => updateDraft('usage', event.detail.value)} />
                </View>
                <View className='sl-form-field'>
                  <Text className='sl-form-label'>用药时间</Text>
                  <Input className='sl-form-input' value={draft.timing} onInput={(event) => updateDraft('timing', event.detail.value)} />
                </View>
              </View>
              <View className='sl-submit-bar sl-submit-bar--split workbench-medication-editor-actions'>
                <Button className='sl-secondary-button' onClick={handleCancelEditor}>
                  取消
                </Button>
                <Button className='sl-primary-button' onClick={handleSaveDraft}>
                  确认保存
                </Button>
              </View>
            </FormSectionCard>
          ) : null}

          <View className='sl-table-card'>
            <View className='sl-table-header'>
              <Text>药品名称</Text>
              <Text>剂量</Text>
              <Text>用法</Text>
              <Text>用药时间</Text>
              <Text>操作</Text>
            </View>
            {items.length ? (
              items.map((item) => (
                <View key={item.id} className='sl-table-row'>
                  <Text>{item.name || '-'}</Text>
                  <Text>{item.dosage || '-'}</Text>
                  <Text>{item.usage || '-'}</Text>
                  <Text>{item.timing || '-'}</Text>
                  <View className='sl-table-ops'>
                    <Button className='sl-inline-pill' onClick={() => handleOpenEdit(item)}>
                      编辑
                    </Button>
                    <Button className='sl-inline-pill sl-inline-pill--danger' onClick={() => handleDelete(item)}>
                      删除
                    </Button>
                  </View>
                </View>
              ))
            ) : (
              <View className='sl-table-row sl-table-row--empty'>当前暂无用药记录。</View>
            )}
          </View>

          {dirty ? <Text className='sl-simple-note'>当前修改尚未提交，点击“提交保存”后才会同步到档案记录。</Text> : null}

          <BottomNavGrid elderId={elderId} activeKey='medication' />
        </>
      ) : null}
    </WorkbenchShell>
  );
}
