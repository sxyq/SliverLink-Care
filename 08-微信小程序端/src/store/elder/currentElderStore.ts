import type { RoleType } from '@/app/app.constants';
import { STORAGE_KEYS } from '@/app/app.constants';
import { getStorageValue, removeStorageValue, setStorageValue } from '@/utils/storage';

export interface CurrentElderSummary {
  id: string;
  archiveNo: string;
  name: string;
  age: number;
  gender: string;
  residence: string;
  bloodType: string;
  allergyHistory: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  lastUpdate: string;
  role: RoleType;
}

let currentElderCache: CurrentElderSummary | null | undefined;

export function getCurrentElderSummary() {
  if (currentElderCache === undefined) {
    currentElderCache = getStorageValue<CurrentElderSummary | null>(STORAGE_KEYS.currentElderSummary, null);
  }
  return currentElderCache;
}

export function saveCurrentElderSummary(summary: CurrentElderSummary) {
  currentElderCache = summary;
  setStorageValue(STORAGE_KEYS.currentElderSummary, summary);
  return summary;
}

export function clearCurrentElderSummary() {
  currentElderCache = null;
  removeStorageValue(STORAGE_KEYS.currentElderSummary);
}
