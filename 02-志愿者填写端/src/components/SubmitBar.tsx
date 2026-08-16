import React from 'react';
import { Save } from 'lucide-react';
import { useI18n } from '../i18n';

interface SubmitBarProps {
  onSubmit: () => void;
  onDraft?: () => void;
  loading?: boolean;
}

export const SubmitBar: React.FC<SubmitBarProps> = ({ onSubmit, onDraft, loading }) => {
  const { t } = useI18n();
  return (
    <div className="sl-submit-bar">
      {onDraft && (
        <button type="button" className="sl-btn sl-btn-secondary" onClick={onDraft} disabled={loading}>
          {t('workbench.saveDraft')}
        </button>
      )}
      <button type="button" className="sl-btn sl-btn-primary" onClick={onSubmit} disabled={loading}>
        <Save size={18} />
        {loading ? t('common.saving') : t('workbench.submitSave')}
      </button>
    </div>
  );
};
