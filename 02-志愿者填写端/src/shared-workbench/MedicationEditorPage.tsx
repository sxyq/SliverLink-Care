import type { ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { CareMedicationRecord } from './types';
import { PageHeader } from '../components/PageHeader';
import { useI18n } from '../i18n';

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
  saveLabel,
  onSaveBatch,
  onCreate,
  onUpdate,
  onDelete,
  onBack,
}: MedicationEditorPageProps) {
  const { t } = useI18n();
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
      alert(t('errors.medicationNameRequired'));
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
    } catch (error) {
      alert(error instanceof Error ? error.message : t('errors.saveRetry'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (batchMode) {
      setDrafts((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    if (!onDelete) return;
    try {
      await onDelete(id);
    } catch (error) {
      alert(error instanceof Error ? error.message : t('errors.deleteRetry'));
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
    } catch (error) {
      alert(error instanceof Error ? error.message : t('errors.saveRetry'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sl-page">
      <PageHeader title={t('workbench.medication')} subtitle={title} onBack={onBack} />

      <section className="sl-card sl-card-soft">
        <div className="sl-section-title">
          <h2>{t('workbench.medicationList')}</h2>
        </div>
        <p className="sl-section-hint">{t('workbench.medicationHint')}</p>
        <div className="sl-submit-bar">
          <button type="button" className="sl-btn sl-btn-secondary" onClick={openCreate}>
            <Plus size={16} />
            {t('workbench.addMedication')}
          </button>
          {batchMode ? (
            <button type="button" className="sl-btn sl-btn-primary" onClick={() => void handleSaveBatch()} disabled={saving}>
              {saving ? t('common.saving') : saveLabel || t('common.save')}
            </button>
          ) : null}
        </div>
      </section>

      {loading ? (
        <section className="sl-card">
          <div className="sl-empty-state">{t('common.loading')}</div>
        </section>
      ) : currentItems.length === 0 ? (
        <section className="sl-card">
          <div className="sl-empty-state">{t('workbench.noMedication')}</div>
        </section>
      ) : (
        <section className="sl-table-card">
          <div className="sl-table-header">
            <span>{t('workbench.medicationName')}</span>
            <span>{t('workbench.dosage')}</span>
            <span>{t('workbench.usage')}</span>
            <span>{t('workbench.medicationTime')}</span>
            <span>{t('workbench.actions')}</span>
          </div>
          {currentItems.map((item) => (
            <div key={item.id} className="sl-table-row">
              <span className="sl-auto-data" dir="auto">{item.name}</span>
              <span className="sl-ltr-data" dir="ltr">{item.dosage || '-'}</span>
              <span className="sl-auto-data" dir="auto">{item.usage || '-'}</span>
              <span className="sl-ltr-data" dir="ltr">{item.timing || '-'}</span>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="sl-ghost-btn" onClick={() => openEdit(item)}>
                  {t('common.edit')}
                </button>
                <button type="button" className="sl-icon-btn" onClick={() => void handleDelete(item.id)} aria-label={t('workbench.deleteMedication')}>
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
            <h3>{editingId ? t('workbench.editMedication') : t('workbench.addMedication')}</h3>
            <div className="sl-form-grid">
              <Field label={t('workbench.medicationName')}>
                <input className="sl-input sl-auto-data" dir="auto" value={editing.name} onChange={(event) => updateDraftField('name', event.target.value)} />
              </Field>
              <Field label={t('workbench.dosage')}>
                <input className="sl-input sl-ltr-data" dir="ltr" value={editing.dosage} onChange={(event) => updateDraftField('dosage', event.target.value)} />
              </Field>
              <Field label={t('workbench.usage')}>
                <input className="sl-input sl-auto-data" dir="auto" value={editing.usage} onChange={(event) => updateDraftField('usage', event.target.value)} />
              </Field>
              <Field label={t('workbench.medicationTime')}>
                <input className="sl-input sl-ltr-data" dir="ltr" value={editing.timing} onChange={(event) => updateDraftField('timing', event.target.value)} />
              </Field>
            </div>
            <div className="sl-modal-actions">
              <button type="button" className="sl-btn sl-btn-secondary" onClick={closeModal}>
                {t('common.cancel')}
              </button>
              <button type="button" className="sl-btn sl-btn-primary" onClick={() => void handleModalSave()} disabled={saving}>
                {saving ? t('common.saving') : t('workbench.confirmSave')}
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
