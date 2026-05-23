import { SubjectDetailPage } from '@shared/SubjectDetailPage';
import type { CareActionCard, CareSubject } from '@shared/types';
import type { AssignedElder } from '../types';

interface ElderDetailPageProps {
  elder: AssignedElder;
  onBack: () => void;
  onEditBasic: () => void;
  onEditHealth: () => void;
  onEditMedication: () => void;
  onEditScale: () => void;
}

function toCareSubject(elder: AssignedElder): CareSubject {
  return {
    id: elder.id,
    archiveNo: elder.archiveNo,
    name: elder.name,
    age: elder.age,
    gender: elder.gender,
    emergencyContactName: elder.emergencyContactName,
    emergencyContactPhone: elder.emergencyContactPhone,
    emergencyContactRelation: elder.emergencyContactRelation,
    bloodType: [elder.aboType, elder.rhType].filter(Boolean).join(' '),
    allergyHistory: elder.allergySummary,
    status: elder.status,
  };
}

export function ElderDetailPage({
  elder,
  onBack,
  onEditBasic,
  onEditHealth,
  onEditMedication,
  onEditScale,
}: ElderDetailPageProps) {
  const actions: CareActionCard[] = [
    {
      key: 'basic',
      title: '基本信息',
      description: '维护老人基本资料、联系人、血型与过敏史。',
      onClick: onEditBasic,
    },
    {
      key: 'health',
      title: '健康档案',
      description: '填写身高、体重、BMI、自评与认知情感筛查。',
      onClick: onEditHealth,
    },
    {
      key: 'medication',
      title: '主要用药',
      description: '维护当前用药名称、剂量、用法与用药时间。',
      onClick: onEditMedication,
    },
    {
      key: 'scale',
      title: '量表填写',
      description: '填写 PHQ-9、GAD-7 与 UCLA 量表。',
      onClick: onEditScale,
    },
  ];

  return <SubjectDetailPage title="老人详情" subject={toCareSubject(elder)} onBack={onBack} actions={actions} />;
}
