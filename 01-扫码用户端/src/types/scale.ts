export type ScaleName = 'PHQ-9' | 'GAD-7' | 'UCLA';

export interface ScaleAnswerDetail {
  question: string;
  value: number | null;
}

export interface ScaleSummary {
  name: ScaleName;
  score: number;
  updatedAt: string;
  volunteer: string;
  answers?: ScaleAnswerDetail[];
  level?: string;
  note?: string;
}
