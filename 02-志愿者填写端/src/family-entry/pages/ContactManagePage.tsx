import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import type { ElderInfo } from '../types';
import { getElderDetail, updateElderContacts } from '../api/familyElderApi';
import TopBar from '../components/TopBar';

export default function ContactManagePage() {
  const { elderId } = useParams<{ elderId: string }>();
  const navigate = useNavigate();
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
        alert('保存成功');
        navigate(-1);
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : '保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <TopBar title="联系人维护" />
        <div className="page-container text-center text-secondary">加载中...</div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="联系人维护" />
      <div className="page-container">
        <div className="card">
          <div className="section-title" style={{ marginTop: 0 }}>主联系人</div>
          <div className="form-group">
            <label className="form-label">姓名</label>
            <input className="form-input" value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">电话</label>
            <input
              className="form-input"
              type="tel"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">关系</label>
            <input className="form-input" value={emergencyRelation} onChange={(e) => setEmergencyRelation(e.target.value)} />
          </div>
        </div>

        <div className="card">
          <div className="section-title" style={{ marginTop: 0 }}>备用联系人</div>
          <div className="form-group">
            <label className="form-label">姓名</label>
            <input className="form-input" value={backupName} onChange={(e) => setBackupName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">电话</label>
            <input
              className="form-input"
              type="tel"
              value={backupPhone}
              onChange={(e) => setBackupPhone(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">关系</label>
            <input className="form-input" value={backupRelation} onChange={(e) => setBackupRelation(e.target.value)} />
          </div>
        </div>

        {phoneChanged && (
          <div className="warn-banner">
            <ShieldAlert size={16} />
            <span>修改电话号码后需短信验真确认</span>
          </div>
        )}

        <div className="info-banner">
          <ShieldAlert size={16} />
          <span>主联系人收不到验证码120秒后可切换备用手机号</span>
        </div>

        <button
          className="btn btn-primary btn-block mt-16"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  );
}
