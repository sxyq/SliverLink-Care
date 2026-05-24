import { http } from './httpClient';
import type { BasicInfo, HealthFormState, Medication, ScaleForm, ScaleRecord, ScaleType } from '../types';

export async function saveBasicInfo(elderId: string, form: BasicInfo) {
  return http<{ recordId: string }>(`/api/elder/${elderId}/basic`, {
    method: 'PUT',
    body: JSON.stringify({
      name: form.name,
      gender: form.gender,
      age: Number(form.age || 0),
      residence: form.residence,
      emergencyContactName: form.emergencyContactName,
      emergencyPhone: form.emergencyContactPhone,
      relationship: form.emergencyContactRelation,
      aboType: form.aboBloodType,
      rhType: form.rhBloodType,
      allergySummary: form.allergyHistory,
    }),
  });
}

export async function saveHealthRecord(elderId: string, form: HealthFormState) {
  const height = Number(form.heightCm || 0);
  const weight = Number(form.weightKg || 0);
  const bmi = height > 0 ? weight / ((height / 100) ** 2) : 0;
  return http<{ recordId: string }>(`/api/elder/${elderId}/health-records`, {
    method: 'POST',
    body: JSON.stringify({
      date: new Date().toISOString().slice(0, 10),
      heightCm: height,
      weightKg: weight,
      waistCm: Number(form.waistCm || 0),
      bmi: Number(bmi.toFixed(1)),
      healthSelfAssessment: form.healthSelfAssessment,
      selfCareAssessment: form.selfCareAssessment,
      cognitiveScreening: form.cognitiveScreening,
      emotionScreening: form.emotionScreening,
    }),
  });
}

export async function saveMedications(elderId: string, items: Medication[]) {
  return http<{ recordId: string }>(`/api/elder/${elderId}/medications`, {
    method: 'POST',
    body: JSON.stringify(items.map((item) => ({
      id: item.id,
      name: item.name,
      dosage: item.dosage,
      usage: item.usage,
      timing: item.timing,
      time: item.timing,
    }))),
  });
}

export async function saveScaleRecords(elderId: string, scale: ScaleForm) {
  const score = scale.answers.reduce((sum, answer) => sum + (answer.value ?? 0), 0);
  return http<{ recordId: string }>(`/api/elder/${elderId}/scale-records`, {
    method: 'POST',
    body: JSON.stringify([{
      name: scale.type,
      scale: scale.type,
      score,
      date: new Date().toISOString().slice(0, 10),
      answers: scale.answers,
    }]),
  });
}

export async function fetchScaleRecords(elderId: string): Promise<ScaleRecord[]> {
  const rows = await http<Array<Record<string, unknown>>>(`/api/elder/${elderId}/scale-records`);
  return rows.map((row) => ({
    scale: String(row.scale || row.name || 'PHQ-9') as ScaleType,
    name: String(row.name || row.scale || 'PHQ-9') as ScaleType,
    score: Number(row.score || 0),
    date: String(row.date || row.updatedAt || ''),
    volunteer: String(row.volunteer || ''),
    answers: Array.isArray(row.answers)
      ? row.answers.map((item) => {
          const answer = (item ?? {}) as Record<string, unknown>;
          return {
            question: String(answer.question || ''),
            value: answer.value == null ? null : Number(answer.value),
          };
        })
      : [],
  }));
}
