import type { CSSProperties, ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { CareMedicationRecord } from './types';

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
        setDrafts((prev: CareMedicationRecord[]) =>
          prev.map((item: CareMedicationRecord) => (item.id === editingId ? { ...editing } : item)),
        );
      } else {
        setDrafts((prev: CareMedicationRecord[]) => [...prev, { ...editing, id: `draft-${Date.now()}` }]);
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
      setDrafts((prev: CareMedicationRecord[]) => prev.filter((item: CareMedicationRecord) => item.id !== id));
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
        drafts.map((item: CareMedicationRecord) => ({
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
    <div style={{ display: 'grid', gap: 16 }}>
      <section className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <strong style={{ fontSize: 16 }}>{title}</strong>
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--sl-text-secondary, #5F6F7A)' }}>
              统一用药维护工作台，家属端与志愿者端共用同一套表单交互。
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {onBack ? (
              <button type="button" onClick={onBack} style={plainButtonStyle}>
                返回
              </button>
            ) : null}
            <button type="button" onClick={openCreate} style={primaryButtonStyle}>
              <Plus size={16} />
              新增药品
            </button>
            {batchMode ? (
              <button type="button" onClick={() => void handleSaveBatch()} style={primaryButtonStyle} disabled={saving}>
                {saving ? '保存中...' : saveLabel}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--sl-text-secondary, #5F6F7A)' }}>
          加载中...
        </div>
      ) : currentItems.length === 0 ? (
        <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--sl-text-secondary, #5F6F7A)' }}>
          暂无用药记录
        </div>
      ) : (
        currentItems.map((item: CareMedicationRecord) => (
          <section key={item.id} className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <strong style={{ fontSize: 16 }}>{item.name}</strong>
                <div style={{ marginTop: 8, fontSize: 13, color: 'var(--sl-text-secondary, #5F6F7A)' }}>
                  剂量 {item.dosage || '-'} · 用法 {item.usage || '-'} · 用药时间 {item.timing || '-'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => openEdit(item)} style={plainButtonStyle}>
                  编辑
                </button>
                <button type="button" onClick={() => void handleDelete(item.id)} style={dangerButtonStyle}>
                  <Trash2 size={14} />
                  删除
                </button>
              </div>
            </div>
          </section>
        ))
      )}

      {showModal ? (
        <div style={overlayStyle} onClick={closeModal}>
          <div style={modalStyle} onClick={(event) => event.stopPropagation()}>
            <strong style={{ fontSize: 16 }}>{editingId ? '编辑药品' : '新增药品'}</strong>
            <div style={formGridStyle}>
              <Field label="药品名称">
                <input value={editing.name} onChange={(event) => updateDraftField('name', event.target.value)} style={inputStyle} />
              </Field>
              <Field label="剂量">
                <input value={editing.dosage} onChange={(event) => updateDraftField('dosage', event.target.value)} style={inputStyle} />
              </Field>
              <Field label="用法">
                <input value={editing.usage} onChange={(event) => updateDraftField('usage', event.target.value)} style={inputStyle} />
              </Field>
              <Field label="用药时间">
                <input value={editing.timing} onChange={(event) => updateDraftField('timing', event.target.value)} style={inputStyle} />
              </Field>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={closeModal} style={plainButtonStyle}>
                取消
              </button>
              <button type="button" onClick={() => void handleModalSave()} style={primaryButtonStyle} disabled={saving}>
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
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 12, color: 'var(--sl-text-secondary, #5F6F7A)' }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle: CSSProperties = {
  width: '100%',
  minHeight: 42,
  borderRadius: 10,
  border: '1px solid var(--sl-border, #D8E7EA)',
  background: 'var(--sl-card-bg, #FFFFFF)',
  padding: '10px 12px',
  fontSize: 14,
};

const primaryButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  border: 'none',
  borderRadius: 10,
  background: 'var(--sl-primary, #126B78)',
  color: '#FFFFFF',
  padding: '10px 14px',
  cursor: 'pointer',
};

const plainButtonStyle: CSSProperties = {
  border: '1px solid var(--sl-border, #D8E7EA)',
  borderRadius: 10,
  background: 'var(--sl-card-bg, #FFFFFF)',
  color: 'var(--sl-text, #18222D)',
  padding: '10px 14px',
  cursor: 'pointer',
};

const dangerButtonStyle: CSSProperties = {
  ...plainButtonStyle,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  color: '#D94444',
};

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(24, 34, 45, 0.35)',
  display: 'grid',
  placeItems: 'center',
  padding: 20,
  zIndex: 999,
};

const modalStyle: CSSProperties = {
  width: 'min(100%, 560px)',
  borderRadius: 16,
  background: 'var(--sl-card-bg, #FFFFFF)',
  padding: 20,
  display: 'grid',
  gap: 16,
};

const formGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 12,
};
