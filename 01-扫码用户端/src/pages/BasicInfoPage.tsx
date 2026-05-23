import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Brain,
  CalendarDays,
  ClipboardList,
  FileText,
  HeartPulse,
  Phone,
  Pill,
  ShieldCheck,
  Stethoscope,
  User,
} from 'lucide-react';
import { InfoCard } from '../components/InfoCard';
import { ActionButton } from '../components/ActionButton';
import { SensitiveField } from '../components/SensitiveField';
import { MedicationList } from '../components/MedicationList';
import { maskName } from '../utils/mask';
import type { ElderBasicInfo, HealthRecord, Medication } from '../types';

interface BasicInfoPageProps {
  data: ElderBasicInfo;
  verified?: boolean;
  healthRecord?: HealthRecord | null;
  medications?: Medication[] | null;
  archiveLoading?: boolean;
}

function formatNumber(value: number, suffix = '') {
  if (!Number.isFinite(value) || value === 0) return '未填写';
  return `${value}${suffix}`;
}

function formatEmergencyContact(data: ElderBasicInfo) {
  const contactMatch = (data.emergencyContact || '').match(/^(.+?)(?:（(.+?)）|\((.+?)\))?$/);
  const emergencyContactName = contactMatch?.[1]?.trim() || data.emergencyContact || '';
  const embeddedRelationship = contactMatch?.[2] || contactMatch?.[3] || '';
  const relationship = data.relationship || embeddedRelationship || '';
  const honorific = /女|母|妻|姐|妹|姑|姨|奶/.test(relationship)
    ? '女士'
    : /男|父|夫|哥|弟|爷|叔|伯/.test(relationship)
      ? '男士'
      : '人士';
  return relationship
    ? `${emergencyContactName} ${honorific}（${relationship}）`
    : `${emergencyContactName} ${honorific}`;
}

export function BasicInfoPage({
  data,
  verified = false,
  healthRecord,
  medications,
  archiveLoading,
}: BasicInfoPageProps) {
  const navigate = useNavigate();
  const emergencyContactDisplay = formatEmergencyContact(data);

  const basicItems = [
    { label: '姓名', value: maskName(data.name) },
    { label: '性别', value: data.gender },
    { label: '年龄', value: `${data.age} 岁` },
    { label: '紧急联系人', value: emergencyContactDisplay },
    { label: '联系电话', value: <SensitiveField value={data.emergencyPhoneMasked} /> },
    { label: 'ABO 血型', value: data.aboType },
    { label: 'Rh 血型', value: data.rhType },
    { label: '过敏史摘要', value: data.allergySummary, wide: true },
  ];

  const healthItems = healthRecord
    ? [
        { label: '填写日期', value: healthRecord.date || '未填写' },
        { label: '负责人员', value: healthRecord.volunteer || '未填写' },
        { label: '身高', value: formatNumber(healthRecord.heightCm, ' cm') },
        { label: '体重', value: formatNumber(healthRecord.weightKg, ' kg') },
        { label: '腰围', value: formatNumber(healthRecord.waistCm, ' cm') },
        { label: 'BMI', value: healthRecord.bmi ? healthRecord.bmi.toFixed(1) : '未填写' },
        { label: '健康状态自评', value: healthRecord.healthSelfAssessment || '未填写', wide: true },
        { label: '生活自理能力', value: healthRecord.selfCareAssessment || '未填写', wide: true },
        { label: '认知功能筛查', value: healthRecord.cognitiveScreening || '未填写', wide: true },
        { label: '情感状态筛查', value: healthRecord.emotionScreening || '未填写', wide: true },
      ]
    : [];

  return (
    <div className="sl-page">
      <header className="sl-hero">
        <div>
          <h1>智联名牌</h1>
        </div>
        <ShieldCheck size={40} />
      </header>

      <section className="sl-card sl-profile">
        <div className="sl-profile-head">
          <div className="sl-profile-avatar">
            <User size={32} />
          </div>
          <div className="sl-profile-meta">
            <span className="sl-tag">{data.archiveNo}</span>
            <h2>{maskName(data.name)}</h2>
            <p>{data.gender} · {data.age} 岁</p>
          </div>
        </div>
      </section>

      <InfoCard items={basicItems}>
        <ActionButton icon={Phone} variant="emergency" href={`tel:${data.emergencyPhoneDial}`}>
          一键拨打紧急联系人
        </ActionButton>
      </InfoCard>

      {!verified && (
        <section className="sl-card sl-menu-card">
          <div className="sl-menu-title">
            <ShieldCheck size={18} />
            <span>查看详细健康信息需完成身份验证</span>
          </div>
          <ActionButton icon={HeartPulse} variant="primary" onClick={() => navigate('/verify?target=home')}>
            进行身份验证
          </ActionButton>
        </section>
      )}

      {verified && (
        <>
          <div className="sl-badge-bar">
            <span className="sl-badge verified">
              <ShieldCheck size={14} />
              已通过身份验证
            </span>
          </div>

          {archiveLoading && <div className="sl-card sl-loading-card">正在读取健康档案...</div>}

          {!archiveLoading && healthRecord && (
            <section className="sl-card">
              <div className="sl-section-title">
                <Stethoscope size={20} />
                <h2>健康档案</h2>
              </div>
              <dl className="sl-info-grid">
                {healthItems.map((item, idx) => (
                  <div key={idx} className={item.wide ? 'wide' : ''}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {!archiveLoading && medications && medications.length > 0 && (
            <section className="sl-card">
              <div className="sl-section-title">
                <Pill size={20} />
                <h2>主要用药</h2>
              </div>
              <MedicationList items={medications} />
              <p className="sl-disclaimer">用药信息仅供照护参考，请遵医嘱。</p>
            </section>
          )}

          <section className="sl-card sl-scale-entry">
            <div className="sl-scale-entry-copy">
              <span className="sl-scale-entry-icon">
                <ClipboardList size={22} />
              </span>
              <div>
                <h2>量表记录</h2>
                <p>PHQ-9、GAD-7、UCLA 量表摘要和详情</p>
              </div>
            </div>
            <ActionButton icon={FileText} variant="secondary" onClick={() => navigate('/scale')}>
              查看量表记录
            </ActionButton>
          </section>

          <section className="sl-card sl-health-notes">
            <div>
              <Activity size={18} />
              <span>健康档案为社区随访信息，不替代医疗诊断。</span>
            </div>
            <div>
              <Brain size={18} />
              <span>量表结果仅作照护参考，异常情况请及时就医。</span>
            </div>
            <div>
              <CalendarDays size={18} />
              <span>信息以最近一次志愿者随访记录为准。</span>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
