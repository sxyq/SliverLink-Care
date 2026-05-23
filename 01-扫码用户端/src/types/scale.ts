export type ScaleName = 'PHQ-9' | 'GAD-7' | 'UCLA';

export interface ScaleSummary {
  name: ScaleName;
  score: number;
  updatedAt: string;
  volunteer: string;
  level?: string;
  note?: string;
}
