import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import type { ElderInfo } from '../types';
import { getElderDetail, updateElderContacts } from '../api/familyElderApi';
import TopBar from '../components/TopBar';
import { useI18n } from '../../i18n';

export default function ContactManagePage() {
  const { elderId } = useParams<{ elderId: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [elder, setElder] = useState<ElderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [backupName, setBackupName] = useState('');
  const [backupPhone, setBackupPhone] = useState('');
  const [backupRelation, setBackupRelation] = useState('');

  useEffect(() => {
    if (!elderId) {
      setElder(null);
      setLoading(false);
      return;
    }
    getElderDetail(elderId).then((data) => {
      if (data) {
        setElder(data);
        setEmergencyName(data.emergencyContactName);
        setEmergencyPhone(data.emergencyContactPhone);
        setEmergencyRelation(data.emergencyContactRelation);
        setBackupName(data.backupContactName);
        setBackupPhone(data.backupContactPhone);
        setBackupRelation(data.backupContactRelation);
      }
    }).finally(() => setLoading(false));
  }, [elderId]);

  const phoneChanged =
    emergencyPhone !== (elder?.emergencyContactPhone || '') ||
    backupPhone !== (elder?.backupContactPhone || '');

  const handleSave = async () => {
    if (!elderId) return;
    setSaving(true);
    try {
      const result = await updateElderContacts(elderId, {
        emergencyContactName: emergencyName,
        emergencyContactPhone: emergencyPhone,
        emergencyContactRelation: emergencyRelation,
        backupContactName: backupName,
        backupContactPhone: backupPhone,
        backupContactRelation: backupRelation,
      });
      if (result.success) {
        alert(t('common.save'));
        navigate(-1);
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : t('errors.profileSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <TopBar title={t('family.contactManage')} />
        <div className="page-container text-center text-secondary">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title={t('family.contactManage')} />
      <div className="page-container">
        <div className="card">
          <div className="section-title" style={{ marginTop: 0 }}>{t('family.primaryContactTitle')}</div>
          <div className="form-group">
            <label className="form-label">{t('common.name')}</label>
            <input className="form-input sl-auto-data" dir="auto" value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">{t('common.phoneLabel')}</label>
            <input
              className="form-input sl-ltr-data"
              type="tel"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('common.relationship')}</label>
            <input className="form-input sl-auto-data" dir="auto" value={emergencyRelation} onChange={(e) => setEmergencyRelation(e.target.value)} />
          </div>
        </div>

        <div className="card">
          <div className="section-title" style={{ marginTop: 0 }}>{t('family.backupContactTitle')}</div>
          <div className="form-group">
            <label className="form-label">{t('common.name')}</label>
            <input className="form-input sl-auto-data" dir="auto" value={backupName} onChange={(e) => setBackupName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">{t('common.phoneLabel')}</label>
            <input
              className="form-input sl-ltr-data"
              type="tel"
              value={backupPhone}
              onChange={(e) => setBackupPhone(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('common.relationship')}</label>
            <input className="form-input sl-auto-data" dir="auto" value={backupRelation} onChange={(e) => setBackupRelation(e.target.value)} />
          </div>
        </div>

        {phoneChanged && (
          <div className="warn-banner">
            <ShieldAlert size={16} />
            <span>{t('family.phoneVerificationRequired')}</span>
          </div>
        )}

        <div className="info-banner">
          <ShieldAlert size={16} />
          <span>{t('family.mainContactCannotCode')}</span>
        </div>

        <button
          className="btn btn-primary btn-block mt-16"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </div>
  );
}
