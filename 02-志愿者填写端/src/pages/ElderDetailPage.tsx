import { SubjectDetailPage } from '@shared/SubjectDetailPage';
import { FilePenLine } from 'lucide-react';
import type { CareActionCard, CareSubject } from '@shared/types';
import type { AssignedElder } from '../types';
import { useI18n } from '../i18n';

interface ElderDetailPageProps {
  elder: AssignedElder;
  onBack: () => void;
  onEditBasic: () => void;
  onEditHealth: () => void;
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
  onEditHealth,
  onEditMedication,
  onEditScale,
  onManageQrCode,
}: ElderDetailPageProps) {
  const { t } = useI18n();
  const actions: CareActionCard[] = [
    {
      key: 'basic',
      title: t('workbench.basicInfo'),
      description: t('workbench.archiveData'),
      onClick: onEditBasic,
    },
    {
      key: 'health',
      title: t('workbench.medicalRecord'),
      description: t('workbench.healthIndicators'),
      onClick: onEditHealth,
    },
    {
      key: 'medication',
      title: t('workbench.medication'),
      description: t('workbench.medicationRecords'),
      onClick: onEditMedication,
    },
    {
      key: 'scale',
      title: t('workbench.scale'),
      description: 'PHQ / GAD / UCLA',
      onClick: onEditScale,
    },
    {
      key: 'qrcode',
      title: t('workbench.qrManagement'),
      description: t('workbench.scanNameplate'),
      onClick: onManageQrCode,
    },
  ];

  return (
    <SubjectDetailPage
      title={t('workbench.elderDetail')}
      subject={toCareSubject(elder)}
      onBack={onBack}
      actions={actions}
      headerAction={
        <button
          type="button"
          className="sl-page-header-icon sl-page-header-icon-label"
          onClick={onEditBasic}
          aria-label={t('workbench.editEntry')}
          title={t('workbench.editEntry')}
        >
          <FilePenLine size={18} />
          <span>{t('workbench.edit')}</span>
        </button>
      }
    />
  );
}
