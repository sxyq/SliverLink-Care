import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { getBoundElders } from '../api/familyElderApi';
import type { ElderInfo } from '../types';
import { SubjectListPage } from '@shared/SubjectListPage';
import type { CareSubject } from '@shared/types';

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
    summary: '仅显示当前账号已绑定的老人档案',
  };
}

export default function FamilyHomePage() {
  const navigate = useNavigate();
  const [elders, setElders] = useState<ElderInfo[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [showBindModal, setShowBindModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    getBoundElders()
      .then(setElders)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const lower = keyword.trim();
    return elders.filter((elder) => !lower || elder.name.includes(lower) || elder.archiveNo.includes(lower));
  }, [elders, keyword]);

  const maxBindings = 4;
  const remainingSlots = Math.max(0, maxBindings - elders.length);
  const limitReached = elders.length >= maxBindings;

  function handleBindConfirm() {
    const code = inviteCode.trim();
    if (!code) return;
    setShowBindModal(false);
    setInviteCode('');
    navigate(`/invite/${encodeURIComponent(code)}`);
  }

  return (
    <div className="page-container">
      <SubjectListPage
        title="已绑定老人"
        loading={loading}
        subjects={filtered.map(toCareSubject)}
        keyword={keyword}
        onKeywordChange={setKeyword}
        onSelect={(subject) => navigate(`/elders/${subject.id}`)}
        primaryHint={`当前家属账号已绑定 ${elders.length}/4 位老人，仅可查看和维护已绑定档案。`}
        emptyText="暂无已绑定老人"
        searchPlaceholder="请输入老人姓名或档案编号"
        preProfilePanel={
          <section className={`sl-add-archive-panel${limitReached ? ' is-disabled' : ''}`}>
            <div className="sl-add-archive-copy">
              <span className="sl-add-archive-kicker">邀请码绑定</span>
              <strong>增加档案</strong>
              <p>
                {limitReached
                  ? `当前已绑定 ${elders.length}/${maxBindings} 位，已达到上限。`
                  : `当前已绑定 ${elders.length}/${maxBindings} 位，还可新增 ${remainingSlots} 位。`}
              </p>
            </div>

            <div className="sl-add-archive-side">
              <span className={`sl-add-archive-cap${limitReached ? ' is-limit' : ''}`}>
                {elders.length}/{maxBindings}
              </span>
              <button
                type="button"
                className="sl-add-archive-btn"
                disabled={limitReached}
                onClick={() => setShowBindModal(true)}
              >
                <Plus size={16} />
                输入邀请码
              </button>
            </div>
          </section>
        }
      />

      {showBindModal ? (
        <div className="sl-modal-overlay" onClick={() => setShowBindModal(false)}>
          <div className="sl-modal-card" onClick={(event) => event.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <h3>增加档案</h3>
              <button
                type="button"
                className="sl-page-header-icon"
                onClick={() => setShowBindModal(false)}
                aria-label="关闭增加档案"
              >
                <X size={18} />
              </button>
            </div>

            <div className="sl-form-stack">
              <div className="sl-card sl-card-soft">
                <div className="sl-form-stack">
                  <div>
                    <div className="sl-summary-label">绑定上限</div>
                    <div className="sl-summary-value">
                      当前已绑定 {elders.length}/4 位老人
                    </div>
                  </div>
                  <label className="sl-label">
                    <span className="sl-label-text">邀请码</span>
                    <input
                      className="sl-input"
                      placeholder="请输入后台发放的邀请码"
                      value={inviteCode}
                      onChange={(event) => setInviteCode(event.target.value)}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="sl-modal-actions">
              <button type="button" className="sl-btn sl-btn-secondary" onClick={() => setShowBindModal(false)}>
                取消
              </button>
              <button
                type="button"
                className="sl-btn sl-btn-primary"
                disabled={!inviteCode.trim()}
                onClick={handleBindConfirm}
              >
                继续绑定
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
