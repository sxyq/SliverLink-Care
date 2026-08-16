import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import { getElderDetail } from '../api/familyElderApi';
import type { ElderInfo } from '../types';
import { SubjectDetailPage } from '@shared/SubjectDetailPage';
import type { CareActionCard, CareSubject } from '@shared/types';
import { downloadNameplatePdf } from '../../shared-workbench/nameplateExport';
import { useI18n } from '../../i18n';

function toCareSubject(elder: ElderInfo): CareSubject {
  return {
    id: elder.id,
    archiveNo: elder.archiveNo,
    name: elder.name,
    age: elder.age,
    gender: elder.gender,
    emergencyContactName: elder.emergencyContactName,
    emergencyContactPhone: elder.emergencyContactPhone,
    emergencyContactRelation: elder.emergencyContactRelation,
    bloodType: elder.bloodType,
    allergyHistory: elder.allergyHistory,
  };
}

export default function ElderBasicManagePage() {
  const { elderId } = useParams<{ elderId: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [elder, setElder] = useState<ElderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!elderId) {
      setElder(null);
      setLoading(false);
      return;
    }
    getElderDetail(elderId)
      .then(setElder)
      .finally(() => setLoading(false));
  }, [elderId]);

  if (loading) {
    return <div className="page-container text-center text-secondary">{t('common.loading')}</div>;
  }

  if (!elder) {
    return (
      <div className="page-container empty-state">
        <p>{t('errors.noElderInfo')}</p>
      </div>
    );
  }

  const currentElder = elder;

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      await downloadNameplatePdf({
        elderId: currentElder.id,
        archiveNo: currentElder.archiveNo,
        tokenStorageKey: 'family_token',
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : t('errors.exportRetry'));
    } finally {
      setExporting(false);
    }
  }

  const actions: CareActionCard[] = [
    {
      key: 'contacts',
      title: t('family.contactManage'),
      description: t('family.contactManageDescription'),
      onClick: () => navigate(`/elders/${elder.id}/contacts`),
    },
    {
      key: 'medications',
      title: t('family.medicationInfo'),
      description: t('family.medicationManageDescription'),
      onClick: () => navigate(`/elders/${elder.id}/medications`),
    },
    {
      key: 'qrcode',
      title: t('family.qrView'),
      description: t('family.qrViewDescription'),
      onClick: () => navigate(`/elders/${elder.id}/qrcode`),
    },
  ];

  return (
    <div className="page-container">
      <SubjectDetailPage
        title={t('workbench.elderInfo')}
        subject={toCareSubject(elder)}
        onBack={() => navigate('/')}
        actions={actions}
        headerAction={
          <button
            type="button"
            className="sl-page-header-icon sl-page-header-icon-label"
            onClick={handleExport}
            disabled={exporting}
            aria-label={t('workbench.exportNameplatePdf')}
            title={t('workbench.exportNameplatePdf')}
          >
            <Download size={18} />
            <span>{exporting ? t('common.exporting') : t('common.export')}</span>
          </button>
        }
      />
    </div>
  );
}
