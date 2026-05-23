import React, { useEffect, useMemo, useState } from 'react';
import { fetchAssignedElders } from '../api/volunteerApi';
import type { AssignedElder } from '../types';
import { SubjectListPage } from '@shared/SubjectListPage';
import type { CareSubject } from '@shared/types';

interface Props {
  onSelect: (elder: AssignedElder) => void;
  onEditBasic: (elder: AssignedElder) => void;
}

function toCareSubject(elder: AssignedElder): CareSubject {
  return {
    id: elder.id,
    archiveNo: elder.archiveNo,
    name: elder.name,
    gender: elder.gender,
    age: elder.age,
    emergencyContactName: elder.emergencyContactName,
    emergencyContactPhone: elder.emergencyContactPhone,
    emergencyContactRelation: elder.emergencyContactRelation,
    allergyHistory: elder.allergySummary,
    status: elder.status,
    summary: elder.lastVisitDate ? `最近随访 ${elder.lastVisitDate}` : '等待随访处理',
  };
}

export const AssignedElderListPage: React.FC<Props> = ({ onSelect, onEditBasic }) => {
  const [elders, setElders] = useState<AssignedElder[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignedElders()
      .then(setElders)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const lower = keyword.trim();
    return elders.filter((elder) => !lower || elder.name.includes(lower) || elder.archiveNo.includes(lower));
  }, [elders, keyword]);

  const index = useMemo(() => new Map(elders.map((elder) => [elder.id, elder])), [elders]);

  return (
    <SubjectListPage
      title="负责老人列表"
      loading={loading}
      subjects={filtered.map(toCareSubject)}
      keyword={keyword}
      onKeywordChange={setKeyword}
      onSelect={(subject) => {
        const elder = index.get(subject.id);
        if (elder) onSelect(elder);
      }}
      onSecondaryAction={(subject) => {
        const elder = index.get(subject.id);
        if (elder) onEditBasic(elder);
      }}
      secondaryActionLabel="编辑"
      primaryHint="只展示当前志愿者负责的老人档案。"
      emptyText="暂无已分配老人"
      searchPlaceholder="请输入老人姓名或档案编号"
    />
  );
};
