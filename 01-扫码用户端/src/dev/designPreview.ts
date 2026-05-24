import type { ElderBasicInfo, HealthRecord, Medication, ScaleSummary } from '../types';

export function isDesignPreviewEnabled() {
  return import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === '1';
}

export function getDesignPreviewArchive(): {
  healthRecord: HealthRecord;
  medications: Medication[];
  scaleSummaries: ScaleSummary[];
} {
  return {
    healthRecord: {
      date: '2026-06-12',
      volunteer: '赵社工',
      heightCm: 160,
      weightKg: 55,
      waistCm: 84,
      bmi: 21.5,
      healthSelfAssessment: '高血压，2型糖尿病',
      selfCareAssessment: '日常生活可自理',
      cognitiveScreening: '青霉素过敏',
      emotionScreening: '白内障术后',
    },
    medications: [
      { name: '苯磺酸氨氯地平片', dosage: '5mg', usage: '每日1次', time: '每日1次' },
      { name: '二甲双胍缓释片', dosage: '0.5g', usage: '每日2次', time: '每日2次' },
      { name: '阿托伐他汀钙片', dosage: '20mg', usage: '每晚1次', time: '每晚1次' },
    ],
    scaleSummaries: [
      {
        name: 'PHQ-9',
        score: 4,
        updatedAt: '2026-06-12',
        volunteer: '赵社工',
        answers: [
          { question: '做事时提不起劲或没有乐趣', value: 0 },
          { question: '感到心情低落、沮丧或绝望', value: 1 },
          { question: '入睡困难、睡不安稳或睡眠过多', value: 1 },
          { question: '感觉疲倦或没有活力', value: 1 },
          { question: '食欲不振或吃太多', value: 0 },
          { question: '觉得自己很糟或觉得自己很失败，或让自己或家人失望', value: 0 },
          { question: '对事物专注有困难，例如阅读报纸或看电视时', value: 1 },
          { question: '动作或说话速度缓慢到别人已经察觉？或刚好相反——烦躁或坐立不安、动来动去的情况更胜于平常', value: 0 },
          { question: '有不如死掉或用某种方式伤害自己的念头', value: 0 },
        ],
      },
      {
        name: 'GAD-7',
        score: 3,
        updatedAt: '2026-06-12',
        volunteer: '赵社工',
        answers: [
          { question: '感觉紧张，焦虑或急切', value: 1 },
          { question: '不能停止或控制担忧', value: 0 },
          { question: '对各种各样的事情担忧过多', value: 1 },
          { question: '很难放松下来', value: 0 },
          { question: '烦躁不安，坐立不宁', value: 0 },
          { question: '变得容易烦恼或急躁', value: 1 },
          { question: '感到似乎将有可怕的事情发生而害怕', value: 0 },
        ],
      },
      {
        name: 'UCLA',
        score: 28,
        updatedAt: '2026-06-10',
        volunteer: '赵社工',
        answers: [
          { question: '你多久感到缺乏陪伴？', value: 2 },
          { question: '你多久感到被遗弃？', value: 1 },
          { question: '你多久感到无人可求助？', value: 1 },
          { question: '你多久感到孤立无援？', value: 2 },
          { question: '你多久感到与朋友隔绝？', value: 1 },
          { question: '你多久感到与周围人关系不和谐？', value: 1 },
          { question: '你多久感到自己是群体的一员？（反向计分）', value: 0 },
          { question: '你多久感到没有人真正理解你？', value: 2 },
          { question: '你多久感到被冷落？', value: 1 },
          { question: '你多久感到与他人的关系密切？（反向计分）', value: 0 },
          { question: '你多久感到在社交场合感到孤独？', value: 2 },
          { question: '你多久感到与他人的联系中断？', value: 2 },
          { question: '你多久感到身边没有人可以倾诉？', value: 2 },
          { question: '你多久感到无人可以倾诉？', value: 1 },
          { question: '你多久感到没有人真正亲近你？', value: 2 },
          { question: '你多久感到没有人可以求助？', value: 1 },
          { question: '你多久感到被排斥？', value: 1 },
          { question: '你多久感到与他人隔绝？', value: 2 },
          { question: '你多久感到在人群中仍然孤独？', value: 2 },
          { question: '你多久感到与他人的关系没有意义？', value: 2 },
        ],
      },
    ],
  };
}

export function getDesignPreviewBasicInfo(): ElderBasicInfo {
  return {
    id: 'elder-preview-001',
    archiveNo: 'A1779472746389',
    name: '王桂兰',
    gender: '女',
    age: 82,
    residence: '滨江社区 3 栋 2 单元',
    emergencyContact: '王丽',
    emergencyPhoneMasked: '138****6666',
    emergencyPhoneDial: '13800006666',
    relationship: '女儿',
    aboType: 'O',
    rhType: '阳性',
    allergySummary: '无明确药物过敏史',
  };
}
