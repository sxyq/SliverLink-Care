import React from 'react';
import { Pill } from 'lucide-react';
import type { Medication } from '../types';

interface MedicationListProps {
  items: Medication[];
}

export function MedicationList({ items }: MedicationListProps) {
  return (
    <div className="sl-medication-list">
      {items.map((item, idx) => (
        <div className="sl-medication-item" key={idx}>
          <Pill size={18} className="sl-medication-icon" />
          <div className="sl-medication-body">
            <div className="sl-medication-name">{item.name}</div>
            <div className="sl-medication-meta">
              {item.dosage} · {item.usage} · {item.time}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
