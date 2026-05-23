import React from 'react';
import { Save } from 'lucide-react';

interface SubmitBarProps {
  onSubmit: () => void;
  onDraft?: () => void;
  loading?: boolean;
}

export const SubmitBar: React.FC<SubmitBarProps> = ({ onSubmit, onDraft, loading }) => {
  return (
    <div className="sl-submit-bar">
      {onDraft && (
        <button type="button" className="sl-btn sl-btn-secondary" onClick={onDraft} disabled={loading}>
          保存草稿
        </button>
      )}
      <button type="button" className="sl-btn sl-btn-primary" onClick={onSubmit} disabled={loading}>
        <Save size={18} />
        {loading ? '保存中…' : '提交保存'}
      </button>
    </div>
  );
};
