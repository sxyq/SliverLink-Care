export interface CareSubject {
  id: string;
  archiveNo: string;
  name: string;
  gender?: string;
  age?: number;
  bloodType?: string;
  allergyHistory?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  status?: string;
  summary?: string;
}

export interface CareActionCard {
  key: string;
  title: string;
  description: string;
  tone?: 'default' | 'warning';
  onClick: () => void;
}

export interface CareMedicationRecord {
  id: string;
  name: string;
  dosage: string;
  usage: string;
  timing: string;
  updatedAt?: string;
}
