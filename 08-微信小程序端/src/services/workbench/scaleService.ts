import { httpClient } from '@/services/api/httpClient';

export type WorkbenchScaleType = 'PHQ-9' | 'GAD-7' | 'UCLA';

export interface WorkbenchScaleAnswer {
  question: string;
  value: number | null;
}

export interface WorkbenchScaleRecord {
  name: WorkbenchScaleType;
  score: number;
  date: string;
  volunteer: string;
  answers: WorkbenchScaleAnswer[];
}

export interface WorkbenchScaleDraft {
  type: WorkbenchScaleType;
  answers: WorkbenchScaleAnswer[];
}

export async function fetchVolunteerScaleRecords(elderId: string): Promise<WorkbenchScaleRecord[]> {
  const rows = await httpClient.get<Array<Record<string, unknown>>>(`/api/elder/${encodeURIComponent(elderId)}/scale-records`);
  return rows.map((row) => ({
    name: String(row.name || row.scale || 'PHQ-9') as WorkbenchScaleType,
    score: Number(row.score || 0),
    date: String(row.date || row.recordDate || row.updatedAt || ''),
    volunteer: String(row.volunteer || ''),
    answers: Array.isArray(row.answers)
      ? row.answers.map((item) => {
          const answer = (item || {}) as Record<string, unknown>;
          return {
            question: String(answer.question || ''),
            value: answer.value == null ? null : Number(answer.value),
          };
        })
      : [],
  }));
}

export async function saveVolunteerScaleRecord(elderId: string, draft: WorkbenchScaleDraft) {
  const score = draft.answers.reduce((sum, item) => sum + (item.value ?? 0), 0);
  return httpClient.post<{ recordId: string }>(`/api/elder/${encodeURIComponent(elderId)}/scale-records`, [
    {
      name: draft.type,
      scale: draft.type,
      score,
      date: new Date().toISOString().slice(0, 10),
      answers: draft.answers,
    },
  ]);
}
