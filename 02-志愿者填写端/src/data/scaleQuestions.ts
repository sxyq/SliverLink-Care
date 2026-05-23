import type { ScaleAnswer, ScaleType } from '../types';

export const phq9QuestionsData: string[] = [
  '做事时提不起劲或没有乐趣',
  '感到心情低落、沮丧或绝望',
  '入睡困难、睡不安稳或睡眠过多',
  '感觉疲倦或没有活力',
  '食欲不振或吃太多',
  '觉得自己很糟或觉得自己很失败，或让自己或家人失望',
  '对事物专注有困难，例如阅读报纸或看电视时',
  '动作或说话速度缓慢到别人已经察觉？或刚好相反——烦躁或坐立不安、动来动去的情况更胜于平常',
  '有不如死掉或用某种方式伤害自己的念头',
];

export const gad7QuestionsData: string[] = [
  '感觉紧张，焦虑或急切',
  '不能停止或控制担忧',
  '对各种各样的事情担忧过多',
  '很难放松下来',
  '烦躁不安，坐立不宁',
  '变得容易烦恼或急躁',
  '感到似乎将有可怕的事情发生而害怕',
];

export const uclaQuestionsData: string[] = [
  '你多久感到缺乏陪伴？',
  '你多久感到被遗弃？',
  '你多久感到无人可求助？',
  '你多久感到孤立无援？',
  '你多久感到与朋友隔绝？',
  '你多久感到与周围人关系不和谐？',
  '你多久感到自己是群体的一员？（反向计分）',
  '你多久感到没有人真正理解你？',
  '你多久感到被冷落？',
  '你多久感到与他人的关系密切？（反向计分）',
  '你多久感到在社交场合感到孤独？',
  '你多久感到与他人的联系中断？',
  '你多久感到身边没有人可以倾诉？',
  '你多久感到无人可以倾诉？',
  '你多久感到没有人真正亲近你？',
  '你多久感到没有人可以求助？',
  '你多久感到被排斥？',
  '你多久感到与他人隔绝？',
  '你多久感到在人群中仍然孤独？',
  '你多久感到与他人的关系没有意义？',
];

export function createScaleAnswers(type: ScaleType): ScaleAnswer[] {
  const questions =
    type === 'PHQ-9'
      ? phq9QuestionsData
      : type === 'GAD-7'
      ? gad7QuestionsData
      : uclaQuestionsData;
  return questions.map((q) => ({ question: q, value: null }));
}
