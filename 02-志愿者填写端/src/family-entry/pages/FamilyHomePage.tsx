import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

  useEffect(() => {
    getBoundElders()
      .then(setElders)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const lower = keyword.trim();
    return elders.filter((elder) => !lower || elder.name.includes(lower) || elder.archiveNo.includes(lower));
  }, [elders, keyword]);

  return (
    <div className="page-container">
      <SubjectListPage
        title="已绑定老人列表"
        loading={loading}
        subjects={filtered.map(toCareSubject)}
        keyword={keyword}
        onKeywordChange={setKeyword}
        onSelect={(subject) => navigate(`/elders/${subject.id}`)}
        primaryHint="家属协管端与志愿者端复用同一套老人工作台，仅权限范围不同。"
        emptyText="暂无已绑定老人"
        searchPlaceholder="请输入老人姓名或档案编号"
      />
    </div>
  );
}
