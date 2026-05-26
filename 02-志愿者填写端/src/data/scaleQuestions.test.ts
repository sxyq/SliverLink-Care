import { describe, expect, it } from 'vitest';
import {
  createScaleAnswers,
  gad7QuestionsData,
  phq9QuestionsData,
  uclaQuestionsData,
} from './scaleQuestions';

describe('createScaleAnswers', () => {
  it('returns 9 questions with value=null for PHQ-9', () => {
    const answers = createScaleAnswers('PHQ-9');
    expect(answers).toHaveLength(9);
    answers.forEach((a) => {
      expect(a.value).toBeNull();
    });
  });

  it('returns 7 questions with value=null for GAD-7', () => {
    const answers = createScaleAnswers('GAD-7');
    expect(answers).toHaveLength(7);
    answers.forEach((a) => {
      expect(a.value).toBeNull();
    });
  });

  it('returns 20 questions with value=null for UCLA', () => {
    const answers = createScaleAnswers('UCLA');
    expect(answers).toHaveLength(20);
    answers.forEach((a) => {
      expect(a.value).toBeNull();
    });
  });

  it('preserves PHQ-9 question text content', () => {
    const answers = createScaleAnswers('PHQ-9');
    const questions = answers.map((a) => a.question);
    expect(questions).toEqual(phq9QuestionsData);
    expect(questions[0]).toBe('做事时提不起劲或没有乐趣');
    expect(questions[8]).toBe('有不如死掉或用某种方式伤害自己的念头');
  });

  it('preserves GAD-7 question text content', () => {
    const answers = createScaleAnswers('GAD-7');
    const questions = answers.map((a) => a.question);
    expect(questions).toEqual(gad7QuestionsData);
    expect(questions[0]).toBe('感觉紧张，焦虑或急切');
    expect(questions[6]).toBe('感到似乎将有可怕的事情发生而害怕');
  });

  it('preserves UCLA question text content', () => {
    const answers = createScaleAnswers('UCLA');
    const questions = answers.map((a) => a.question);
    expect(questions).toEqual(uclaQuestionsData);
    expect(questions[0]).toBe('你多久感到缺乏陪伴？');
    expect(questions[19]).toBe('你多久感到与他人的关系没有意义？');
  });
});
