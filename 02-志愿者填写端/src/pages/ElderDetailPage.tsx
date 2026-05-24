import { SubjectDetailPage } from '@shared/SubjectDetailPage';
import { FilePenLine } from 'lucide-react';
import type { CareActionCard, CareSubject } from '@shared/types';
import type { AssignedElder } from '../types';

interface ElderDetailPageProps {
  elder: AssignedElder;
  onBack: () => void;
  onEditBasic: () => void;
  onEditMedication: () => void;
  onEditScale: () => void;
  onManageQrCode: () => void;
}

function toCareSubject(elder: AssignedElder): CareSubject {
  return {
    id: elder.id,
    archiveNo: elder.archiveNo,
    name: elder.name,
    age: elder.age,
    gender: elder.gender,
    residence: elder.residence,
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
  onEditMedication,
  onEditScale,
  onManageQrCode,
}: ElderDetailPageProps) {
  const actions: CareActionCard[] = [
    {
      key: 'basic',
      title: '基本信息',
      description: '资料与联系人',
      icon: 'User',
      onClick: onEditBasic,
    },
    {
      key: 'medication',
      title: '用药记录',
      description: '剂量与用法',
      icon: 'Pill',
      onClick: onEditMedication,
    },
    {
      key: 'scale',
      title: '量表评估',
      description: 'PHQ / GAD / UCLA',
      icon: 'ClipboardList',
      onClick: onEditScale,
    },
    {
      key: 'qrcode',
      title: '名牌二维码',
      description: '查看与管理',
      icon: 'QrCode',
      onClick: onManageQrCode,
    },
  ];

  return (
    <SubjectDetailPage
      title="老人详情"
      subject={toCareSubject(elder)}
      onBack={onBack}
      actions={actions}
      headerAction={
        <button
          type="button"
          className="sl-page-header-icon sl-page-header-icon-label"
          onClick={onEditBasic}
          aria-label="进入编辑"
          title="进入编辑"
        >
          <FilePenLine size={18} />
          <span>编辑</span>
        </button>
      }
    />
  );
}
