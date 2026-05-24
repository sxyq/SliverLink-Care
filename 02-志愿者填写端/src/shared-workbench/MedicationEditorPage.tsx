import type { ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { CareMedicationRecord } from './types';
import { PageHeader } from '../components/PageHeader';

type DraftMedication = Omit<CareMedicationRecord, 'updatedAt'>;

interface MedicationEditorPageProps {
  title: string;
  loading?: boolean;
  medications: CareMedicationRecord[];
  saveLabel?: string;
  onSaveBatch?: (items: DraftMedication[]) => Promise<void>;
  onCreate?: (item: DraftMedication) => Promise<void>;
  onUpdate?: (medicationId: string, item: DraftMedication) => Promise<void>;
  onDelete?: (medicationId: string) => Promise<void>;
  onBack?: () => void;
}

const emptyDraft = (): DraftMedication => ({
  id: '',
  name: '',
  dosage: '',
  usage: '',
  timing: '',
});

export function MedicationEditorPage({
  title,
  loading = false,
  medications,
  saveLabel = '保存',
  onSaveBatch,
  onCreate,
  onUpdate,
  onDelete,
  onBack,
}: MedicationEditorPageProps) {
  const batchMode = useMemo(() => Boolean(onSaveBatch) && !onCreate && !onUpdate && !onDelete, [onCreate, onDelete, onSaveBatch, onUpdate]);
  const [drafts, setDrafts] = useState<CareMedicationRecord[]>(medications);
  const [editing, setEditing] = useState<DraftMedication>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDrafts(medications);
  }, [medications]);

  const currentItems = batchMode ? drafts : medications;

  function openCreate() {
    setEditing(emptyDraft());
    setEditingId(null);
    setShowModal(true);
  }

  function openEdit(item: CareMedicationRecord) {
    setEditing({
      id: item.id,
      name: item.name,
      dosage: item.dosage,
      usage: item.usage,
      timing: item.timing,
    });
    setEditingId(item.id);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(emptyDraft());
    setEditingId(null);
  }

  function updateDraftField(field: keyof DraftMedication, value: string) {
    setEditing((prev) => ({ ...prev, [field]: value }));
  }

  async function handleModalSave() {
    if (!editing.name.trim()) {
      alert('请输入药品名称');
      return;
    }

    if (batchMode) {
      if (editingId) {
        setDrafts((prev) => prev.map((item) => (item.id === editingId ? { ...item, ...editing } : item)));
      } else {
        setDrafts((prev) => [...prev, { ...editing, id: `draft-${Date.now()}` }]);
      }
      closeModal();
      return;
    }

    setSaving(true);
    try {
      if (editingId && onUpdate) {
        await onUpdate(editingId, editing);
      } else if (onCreate) {
        await onCreate(editing);
      }
      closeModal();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (batchMode) {
      setDrafts((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    if (onDelete) {
      await onDelete(id);
    }
  }

  async function handleSaveBatch() {
    if (!onSaveBatch) return;
    setSaving(true);
    try {
      await onSaveBatch(
        drafts.map((item) => ({
          id: item.id,
          name: item.name,
          dosage: item.dosage,
          usage: item.usage,
          timing: item.timing,
        })),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sl-page">
      <PageHeader title="主要用药" subtitle={title} onBack={onBack} />

      <section className="sl-card sl-card-soft">
        <div className="sl-section-title">
          <h2>用药清单</h2>
        </div>
        <p className="sl-section-hint">按照药品名称、剂量、用法和用药时间逐条维护，提交后同步到老人护理档案。</p>
        <div className="sl-submit-bar">
          <button type="button" className="sl-btn sl-btn-secondary" onClick={openCreate}>
            <Plus size={16} />
            添加用药
          </button>
          {batchMode ? (
            <button type="button" className="sl-btn sl-btn-primary" onClick={() => void handleSaveBatch()} disabled={saving}>
              {saving ? '保存中...' : saveLabel}
            </button>
          ) : null}
        </div>
      </section>

      {loading ? (
        <section className="sl-card">
          <div className="sl-empty-state">加载中...</div>
        </section>
      ) : currentItems.length === 0 ? (
        <section className="sl-card">
          <div className="sl-empty-state">暂无用药记录</div>
        </section>
      ) : (
        <section className="sl-table-card">
          <div className="sl-table-header">
            <span>药品名称</span>
            <span>剂量</span>
            <span>用法</span>
            <span>用药时间</span>
            <span>操作</span>
          </div>
          {currentItems.map((item) => (
            <div key={item.id} className="sl-table-row">
              <span>{item.name}</span>
              <span>{item.dosage || '-'}</span>
              <span>{item.usage || '-'}</span>
              <span>{item.timing || '-'}</span>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="sl-ghost-btn" onClick={() => openEdit(item)}>
                  编辑
                </button>
                <button type="button" className="sl-icon-btn" onClick={() => void handleDelete(item.id)} aria-label="删除药品">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {showModal ? (
        <div className="sl-modal-overlay" onClick={closeModal}>
          <div className="sl-modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>{editingId ? '编辑药品' : '新增药品'}</h3>
            <div className="sl-form-grid">
              <Field label="药品名称">
                <input className="sl-input" value={editing.name} onChange={(event) => updateDraftField('name', event.target.value)} />
              </Field>
              <Field label="剂量">
                <input className="sl-input" value={editing.dosage} onChange={(event) => updateDraftField('dosage', event.target.value)} />
              </Field>
              <Field label="用法">
                <input className="sl-input" value={editing.usage} onChange={(event) => updateDraftField('usage', event.target.value)} />
              </Field>
              <Field label="用药时间">
                <input className="sl-input" value={editing.timing} onChange={(event) => updateDraftField('timing', event.target.value)} />
              </Field>
            </div>
            <div className="sl-modal-actions">
              <button type="button" className="sl-btn sl-btn-secondary" onClick={closeModal}>
                取消
              </button>
              <button type="button" className="sl-btn sl-btn-primary" onClick={() => void handleModalSave()} disabled={saving}>
                {saving ? '保存中...' : '确认保存'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="sl-label">
      <span className="sl-label-text">{label}</span>
      {children}
    </label>
  );
}
