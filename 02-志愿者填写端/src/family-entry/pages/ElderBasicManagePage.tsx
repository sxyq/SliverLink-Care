import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import { getElderDetail } from '../api/familyElderApi';
import type { ElderInfo } from '../types';
import { SubjectDetailPage } from '@shared/SubjectDetailPage';
import type { CareActionCard, CareSubject } from '@shared/types';
import { downloadNameplatePdf } from '../../shared-workbench/nameplateExport';

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
  const [elder, setElder] = useState<ElderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!elderId) return;
    getElderDetail(elderId)
      .then(setElder)
      .finally(() => setLoading(false));
  }, [elderId]);

  if (loading) {
    return <div className="page-container text-center text-secondary">加载中...</div>;
  }

  if (!elder) {
    return (
      <div className="page-container empty-state">
        <p>未找到老人信息</p>
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
      alert(error instanceof Error ? error.message : '导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  }

  const actions: CareActionCard[] = [
    {
      key: 'contacts',
      title: '联系人维护',
      description: '更新主联系人、备用联系人及与老人的关系。',
      onClick: () => navigate(`/elders/${elder.id}/contacts`),
    },
    {
      key: 'medications',
      title: '用药信息',
      description: '查看并维护当前药物名称、剂量、用法和时间。',
      onClick: () => navigate(`/elders/${elder.id}/medications`),
    },
    {
      key: 'qrcode',
      title: '二维码查看',
      description: '查看当前老人二维码及名牌 PDF 相关信息。',
      onClick: () => navigate(`/elders/${elder.id}/qrcode`),
    },
  ];

  return (
    <div className="page-container">
      <SubjectDetailPage
        title="老人信息"
        subject={toCareSubject(elder)}
        onBack={() => navigate('/')}
        actions={actions}
        headerAction={
          <button
            type="button"
            className="sl-page-header-icon sl-page-header-icon-label"
            onClick={handleExport}
            disabled={exporting}
            aria-label="导出名牌 PDF"
            title="导出名牌 PDF"
          >
            <Download size={18} />
            <span>{exporting ? '导出中' : '导出'}</span>
          </button>
        }
      />
    </div>
  );
}
