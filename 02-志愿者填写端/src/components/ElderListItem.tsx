import React from 'react';
import { User, Edit3 } from 'lucide-react';
import type { AssignedElder } from '../types';

interface ElderListItemProps {
  elder: AssignedElder;
  selected: boolean;
  onClick: () => void;
  onEdit: () => void;
}

const statusClass: Record<string, string> = {
  待随访: 'sl-status-pending',
  已完成: 'sl-status-done',
  需复核: 'sl-status-review',
};

export const ElderListItem: React.FC<ElderListItemProps> = ({ elder, selected, onClick, onEdit }) => {
  return (
    <div className={`sl-elder-item${selected ? ' sl-elder-item-active' : ''}`} onClick={onClick}>
      <div className="sl-elder-avatar">
        <User size={20} />
      </div>
      <div className="sl-elder-info">
        <div className="sl-elder-name-row">
          <strong>{elder.name}</strong>
          <span className={`sl-status-badge ${statusClass[elder.status] || ''}`}>{elder.status}</span>
        </div>
        <span className="sl-elder-meta">档案编号 {elder.archiveNo}</span>
      </div>
      <button className="sl-elder-edit" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
        <Edit3 size={16} />
        <span>编辑</span>
      </button>
    </div>
  );
};
