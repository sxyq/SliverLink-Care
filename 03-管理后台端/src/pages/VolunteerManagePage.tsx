import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Home, Link2, Link as LinkIcon, UserCheck, Users } from 'lucide-react';
import { InvitationManageSection } from '../components/InvitationManageSection';
import { StatusTag } from '../components/StatusTag';
import { TableColumnMenu, useTableColumnVisibility, type TableColumnOption } from '../components/TableColumnMenu';
import {
  createVolunteer,
  deleteVolunteer,
  fetchElders,
  fetchFamilyBindings,
  fetchVolunteers,
  unbindFamily,
  updateVolunteer,
  updateVolunteerScope,
} from '../api/adminApi';
import type { ElderScopeOption, FamilyBindingRow, VolunteerRow } from '../types';
import { exportToCsv } from '../utils/exportCsv';

type VolunteerForm = {
  name: string;
  account: string;
  phone: string;
  password: string;
  status: string;
};

type PageTab = 'volunteer' | 'family' | 'invitation';

type FamilyGroup = {
  key: string;
  familyName: string;
  familyPhoneMasked: string;
  relationship: string;
  status: string;
  rows: FamilyBindingRow[];
};

type ScopeRegistry = Record<string, string[]>;
type VolunteerCreateMeta = Record<string, { createdAt: string; createMethod: string }>;
type VolunteerColumnKey = 'id' | 'account' | 'create' | 'assigned' | 'status' | 'lastSubmit' | 'actions';
type FamilyColumnKey = 'name' | 'phone' | 'relationship' | 'create' | 'method' | 'code' | 'count' | 'status' | 'actions';

const ACTIVE_STATUS = '启用';
const DISABLED_STATUS = '停用';
const BOUND_STATUS = '已绑定';
const UNBOUND_STATUS = '已解绑';
const ALL_STATUS = '全部状态';
const volunteerMetaKey = 'sl_volunteer_create_meta_v1';
const volunteerColumnOptions: TableColumnOption<VolunteerColumnKey>[] = [
  { key: 'id', label: '志愿者 ID', defaultVisible: true },
  { key: 'account', label: '账号信息', defaultVisible: true },
  { key: 'create', label: '创建信息', defaultVisible: true },
  { key: 'assigned', label: '负责老人', defaultVisible: true },
  { key: 'status', label: '状态', defaultVisible: true },
  { key: 'lastSubmit', label: '最近提交时间', defaultVisible: true },
  { key: 'actions', label: '操作', required: true },
];
const familyColumnOptions: TableColumnOption<FamilyColumnKey>[] = [
  { key: 'name', label: '家属姓名', defaultVisible: true },
  { key: 'phone', label: '手机号', defaultVisible: true },
  { key: 'relationship', label: '关系', defaultVisible: true },
  { key: 'create', label: '创建时间', defaultVisible: true },
  { key: 'method', label: '创建方式', defaultVisible: true },
  { key: 'code', label: '邀请码', defaultVisible: true },
  { key: 'count', label: '绑定老人数量', defaultVisible: true },
  { key: 'status', label: '状态', defaultVisible: true },
  { key: 'actions', label: '操作', required: true },
];

const emptyForm: VolunteerForm = {
  name: '',
  account: '',
  phone: '',
  password: 'Volunteer@123456',
  status: ACTIVE_STATUS,
};

function loadVolunteerMeta(): VolunteerCreateMeta {
  try {
    const raw = localStorage.getItem(volunteerMetaKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as VolunteerCreateMeta;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveVolunteerMeta(meta: VolunteerCreateMeta) {
  localStorage.setItem(volunteerMetaKey, JSON.stringify(meta));
}

function formatDateTime(value: number | string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  const second = `${date.getSeconds()}`.padStart(2, '0');
  return `${year}/${month}/${day} ${hour}:${minute}:${second}`;
}

function deriveCreatedAtFromId(id: string) {
  const match = id.match(/(\d{13})$/);
  if (!match) return '';
  const timestamp = Number(match[1]);
  if (!Number.isFinite(timestamp)) return '';
  return formatDateTime(timestamp);
}

function buildScopeRegistry(volunteers: VolunteerRow[]) {
  return volunteers.reduce<ScopeRegistry>((acc, volunteer) => {
    acc[volunteer.id] = volunteer.assignedElderIds || [];
    return acc;
  }, {});
}

export function VolunteerManagePage() {
  const [tab, setTab] = useState<PageTab>('volunteer');
  const [rows, setRows] = useState<VolunteerRow[]>([]);
  const [elders, setElders] = useState<ElderScopeOption[]>([]);
  const [familyRows, setFamilyRows] = useState<FamilyBindingRow[]>([]);
  const [scopeRegistry, setScopeRegistry] = useState<ScopeRegistry>({});
  const [volunteerMeta, setVolunteerMeta] = useState<VolunteerCreateMeta>({});
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showScopeDialog, setShowScopeDialog] = useState(false);
  const [showAddElderPanel, setShowAddElderPanel] = useState(false);
  const [scopeRailCollapsed, setScopeRailCollapsed] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<VolunteerRow | null>(null);
  const [selectedElderIds, setSelectedElderIds] = useState<string[]>([]);
  const [showFamilyDialog, setShowFamilyDialog] = useState(false);
  const [selectedFamilyGroup, setSelectedFamilyGroup] = useState<FamilyGroup | null>(null);
  const [form, setForm] = useState<VolunteerForm>(emptyForm);
  const [error, setError] = useState('');
  const [scopeError, setScopeError] = useState('');
  const volunteerColumns = useTableColumnVisibility('sl_columns_volunteers', volunteerColumnOptions);
  const familyColumns = useTableColumnVisibility('sl_columns_family_groups', familyColumnOptions);

  async function load() {
    const [volunteers, elderRows, bindings] = await Promise.all([
      fetchVolunteers(),
      fetchElders(),
      fetchFamilyBindings(),
    ]);
    const localMeta = loadVolunteerMeta();

    const elderOptions = elderRows
      .map((item) => ({
        id: item.id || '',
        archiveNo: item.archiveNo,
        name: item.name,
        age: item.age,
        status: item.status,
      }))
      .filter((item) => item.id);

    const nextRegistry = buildScopeRegistry(volunteers);
    setScopeRegistry(nextRegistry);
    setVolunteerMeta(localMeta);
    setRows(
      volunteers.map((row) => ({
        ...row,
        elderCount: nextRegistry[row.id]?.length ?? row.elderCount,
        createdAt: row.createdAt && row.createdAt !== '-' ? row.createdAt : localMeta[row.id]?.createdAt || deriveCreatedAtFromId(row.id) || '-',
        createMethod: row.createMethod && row.createMethod !== '-' ? row.createMethod : localMeta[row.id]?.createMethod || '后台创建',
      })),
    );
    setElders(elderOptions);
    setFamilyRows(bindings);
  }

  useEffect(() => {
    load();
  }, []);

  const filteredVolunteers = useMemo(
    () =>
      rows.filter((row) => {
        const text = `${row.name} ${row.account} ${row.id} ${row.invitationCode || ''} ${row.createMethod || ''}`;
        const matchKeyword = !keyword || text.includes(keyword);
        const matchStatus = statusFilter === ALL_STATUS || row.status === statusFilter;
        return matchKeyword && matchStatus;
      }),
    [keyword, rows, statusFilter],
  );

  const familyGroups = useMemo<FamilyGroup[]>(() => {
    const grouped = new Map<string, FamilyGroup>();
    familyRows.forEach((row) => {
      const key = `${row.familyName}__${row.familyPhoneMasked}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.rows.push(row);
        if (existing.status !== BOUND_STATUS && row.status === BOUND_STATUS) {
          existing.status = row.status;
        }
      } else {
        grouped.set(key, {
          key,
          familyName: row.familyName,
          familyPhoneMasked: row.familyPhoneMasked,
          relationship: row.relationship,
          status: row.status,
          rows: [row],
        });
      }
    });
    return Array.from(grouped.values());
  }, [familyRows]);

  const filteredFamilies = useMemo(
    () =>
      familyGroups.filter((group) => {
        const text = [
          group.familyName,
          group.familyPhoneMasked,
          group.relationship,
          ...group.rows.map((item) => `${item.elderName} ${item.elderArchiveNo} ${item.invitationCode}`),
        ].join(' ');
        const matchKeyword = !keyword || text.includes(keyword);
        const matchStatus = statusFilter === ALL_STATUS || group.status === statusFilter;
        return matchKeyword && matchStatus;
      }),
    [familyGroups, keyword, statusFilter],
  );

  const assignedElders = useMemo(
    () => elders.filter((item) => selectedElderIds.includes(item.id)),
    [elders, selectedElderIds],
  );

  const assignedEldersByVolunteer = useMemo(() => {
    const elderMap = new Map(elders.map((item) => [item.id, item]));
    return rows.reduce<Record<string, ElderScopeOption[]>>((acc, row) => {
      const ids = scopeRegistry[row.id] || [];
      acc[row.id] = ids.map((id) => elderMap.get(id)).filter(Boolean) as ElderScopeOption[];
      return acc;
    }, {});
  }, [elders, rows, scopeRegistry]);

  const availableElders = useMemo(() => {
    if (!selectedVolunteer) return [];
    const assignedToOthers = new Set(
      Object.entries(scopeRegistry)
        .filter(([volunteerId]) => volunteerId !== selectedVolunteer.id)
        .flatMap(([, elderIds]) => elderIds),
    );

    return elders.filter((elder) => !assignedToOthers.has(elder.id) && !selectedElderIds.includes(elder.id));
  }, [elders, scopeRegistry, selectedElderIds, selectedVolunteer]);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  }

  function closeDialog() {
    setShowDialog(false);
    resetForm();
  }

  function openCreateDialog() {
    resetForm();
    setShowDialog(true);
  }

  function openEditDialog(row: VolunteerRow) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      account: row.account,
      phone: row.phone || '',
      password: '',
      status: row.status,
    });
    setError('');
    setShowDialog(true);
  }

  function openScopeDialog(row: VolunteerRow) {
    setSelectedVolunteer(row);
    setSelectedElderIds(scopeRegistry[row.id] || []);
    setShowAddElderPanel(false);
    setScopeRailCollapsed(false);
    setScopeError('');
    setShowScopeDialog(true);
  }

  function closeScopeDialog() {
    setShowScopeDialog(false);
    setSelectedVolunteer(null);
    setSelectedElderIds([]);
    setShowAddElderPanel(false);
    setScopeRailCollapsed(false);
    setScopeError('');
  }

  function openFamilyDialog(group: FamilyGroup) {
    setSelectedFamilyGroup(group);
    setShowFamilyDialog(true);
  }

  function closeFamilyDialog() {
    setSelectedFamilyGroup(null);
    setShowFamilyDialog(false);
  }

  async function handleSubmit() {
    const name = form.name.trim();
    const account = form.account.trim();
    if (!name || !account) {
      setError('请填写志愿者姓名和账号');
      return;
    }

    if (editingId) {
      const payload: Record<string, string> = {
        name,
        account,
        phone: form.phone,
        status: form.status === ACTIVE_STATUS ? 'ACTIVE' : 'DISABLED',
      };
      const password = form.password.trim();
      if (password) {
        payload.password = password;
      }
      await updateVolunteer(editingId, payload);
    } else {
      const createdAt = formatDateTime(new Date());
      const result = await createVolunteer({
        name,
        account,
        phone: form.phone,
        password: form.password || 'Volunteer@123456',
      });
      if (result?.id) {
        const nextMeta = {
          ...volunteerMeta,
          [result.id]: {
            createdAt,
            createMethod: '后台创建',
          },
        };
        saveVolunteerMeta(nextMeta);
        setVolunteerMeta(nextMeta);
      }
    }

    closeDialog();
    await load();
  }

  async function handleDelete(id: string) {
    await deleteVolunteer(id);
    const nextRegistry = { ...scopeRegistry };
    delete nextRegistry[id];
    setScopeRegistry(nextRegistry);
    await load();
  }

  async function handleToggleStatus(row: VolunteerRow) {
    await updateVolunteer(row.id, {
      name: row.name,
      account: row.account,
      status: row.status === ACTIVE_STATUS ? 'DISABLED' : 'ACTIVE',
    });
    await load();
  }

  function addElderToVolunteer(elderId: string) {
    setSelectedElderIds((prev) => (prev.includes(elderId) ? prev : [...prev, elderId]));
    setScopeError('');
  }

  function removeElderFromVolunteer(elderId: string) {
    setSelectedElderIds((prev) => prev.filter((item) => item !== elderId));
    setScopeError('');
  }

  async function handleSaveScope() {
    if (!selectedVolunteer) return;
    if (!selectedElderIds.length) {
      setScopeError('请至少保留 1 位负责老人');
      return;
    }

    await updateVolunteerScope(selectedVolunteer.id, selectedElderIds);
    const nextRegistry = { ...scopeRegistry, [selectedVolunteer.id]: selectedElderIds };
    setScopeRegistry(nextRegistry);
    setRows((prev) =>
      prev.map((row) => (row.id === selectedVolunteer.id ? { ...row, elderCount: selectedElderIds.length } : row)),
    );
    closeScopeDialog();
  }

  async function handleUnbindFamily(id: string) {
    await unbindFamily(id);
    await load();
    if (!selectedFamilyGroup) return;
    const remained = selectedFamilyGroup.rows.filter((item) => item.id !== id);
    if (!remained.length) {
      closeFamilyDialog();
      return;
    }
    setSelectedFamilyGroup({ ...selectedFamilyGroup, rows: remained });
  }

  function handleExport() {
    if (tab === 'volunteer') {
      exportToCsv(
        `volunteers-${new Date().toISOString().slice(0, 10)}.csv`,
        filteredVolunteers.map((row) => ({
          志愿者ID: row.id,
          姓名: row.name,
          账号: row.account,
          创建时间: row.createdAt || '-',
          创建方式: row.createMethod || '后台创建',
          邀请码: row.createMethod?.includes('邀请') ? row.invitationCode || '-' : '-',
          负责老人数量: String(scopeRegistry[row.id]?.length ?? row.elderCount),
          状态: row.status,
          最近提交时间: row.lastSubmit,
        })),
      );
      return;
    }

    exportToCsv(
      `family-groups-${new Date().toISOString().slice(0, 10)}.csv`,
      filteredFamilies.map((group) => ({
        家属姓名: group.familyName,
        手机号: group.familyPhoneMasked,
        关系: group.relationship,
        创建时间: group.rows[0]?.boundAt || '-',
        创建方式: group.rows[0]?.createMethod || '邀请码注册',
        邀请码: group.rows[0]?.invitationCode || '-',
        绑定老人数量: String(group.rows.filter((item) => item.status === BOUND_STATUS).length || group.rows.length),
        状态: group.status,
      })),
    );
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">志愿者管理</p>
          <h2>志愿者、家属与邀请码管理</h2>
        </div>
      </header>

      <section className="panel volunteer-manage-panel" style={{ marginTop: 14 }}>
        <div className="panel-title">
          {tab === 'invitation' ? <LinkIcon size={18} /> : <Users size={18} />}
          <h3>{tab === 'invitation' ? '邀请码列表' : '人员账号列表'}</h3>
        </div>

        <div className="segmented-tabs volunteer-manage-tabs">
          <button className={tab === 'volunteer' ? 'active' : ''} onClick={() => setTab('volunteer')}>
            志愿者
          </button>
          <button className={tab === 'family' ? 'active' : ''} onClick={() => setTab('family')}>
            家属协管
          </button>
          <button className={tab === 'invitation' ? 'active' : ''} onClick={() => setTab('invitation')}>
            邀请码管理
          </button>
        </div>

        {tab !== 'invitation' && (
        <div className="toolbar volunteer-manage-toolbar">
          <div className="volunteer-manage-toolbar__search">
            <input
              placeholder={tab === 'volunteer' ? '搜索姓名、账号、ID、邀请码' : '搜索家属、老人姓名、档案编号'}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option>{ALL_STATUS}</option>
              <option>{ACTIVE_STATUS}</option>
              <option>{DISABLED_STATUS}</option>
              <option>{BOUND_STATUS}</option>
              <option>{UNBOUND_STATUS}</option>
            </select>
            <button onClick={() => setKeyword(keyword.trim())}>查询</button>
          </div>
          <div className="volunteer-manage-toolbar__actions">
            <button className="secondary" onClick={handleExport}>
              导出
            </button>
            {tab === 'volunteer' ? (
              <TableColumnMenu
                options={volunteerColumnOptions}
                isVisible={volunteerColumns.isVisible}
                onToggle={volunteerColumns.toggle}
                onReset={volunteerColumns.reset}
              />
            ) : (
              <TableColumnMenu
                options={familyColumnOptions}
                isVisible={familyColumns.isVisible}
                onToggle={familyColumns.toggle}
                onReset={familyColumns.reset}
              />
            )}
            {tab === 'volunteer' && (
              <button className="secondary" onClick={openCreateDialog}>
                新增志愿者账号
              </button>
            )}
          </div>
        </div>
        )}

        {tab === 'invitation' ? (
          <InvitationManageSection embedded />
        ) : tab === 'volunteer' ? (
          <div className="table-shell volunteer-table-shell">
          <table className="data-table volunteer-manage-table">
            <thead>
              <tr>
                {volunteerColumns.isVisible('id') && <th className="col-volunteer-id">志愿者 ID</th>}
                {volunteerColumns.isVisible('account') && <th className="col-volunteer-account">账号信息</th>}
                {volunteerColumns.isVisible('create') && <th className="col-volunteer-create">创建信息</th>}
                {volunteerColumns.isVisible('assigned') && <th className="col-volunteer-assigned">负责老人</th>}
                {volunteerColumns.isVisible('status') && <th className="col-volunteer-status">状态</th>}
                {volunteerColumns.isVisible('lastSubmit') && <th className="col-volunteer-submit">最近提交时间</th>}
                {volunteerColumns.isVisible('actions') && <th className="col-volunteer-actions">操作</th>}
              </tr>
            </thead>
            <tbody>
              {filteredVolunteers.map((row) => {
                const assignedList = assignedEldersByVolunteer[row.id] || [];
                return (
                  <tr key={row.id}>
                    {volunteerColumns.isVisible('id') && <td className="col-volunteer-id">{row.id}</td>}
                    {volunteerColumns.isVisible('account') && (
                      <td className="col-volunteer-account">
                        <div className="table-detail-cell">
                          <strong>{row.name}</strong>
                          <p>账号：{row.account}</p>
                        </div>
                      </td>
                    )}
                    {volunteerColumns.isVisible('create') && (
                      <td className="col-volunteer-create">
                        <div className="table-detail-cell">
                          <strong>{row.createMethod || '后台创建'}</strong>
                          <p>创建时间：{row.createdAt || '-'}</p>
                          <p>邀请码：{row.invitationCode || '-'}</p>
                        </div>
                      </td>
                    )}
                    {volunteerColumns.isVisible('assigned') && (
                      <td className="col-volunteer-assigned">
                        <div className="table-detail-cell">
                          <strong>共 {assignedList.length || row.elderCount} 位</strong>
                          <div className="inline-chip-list">
                            {assignedList.length ? (
                              assignedList.map((elder) => (
                                <span key={elder.id} className="inline-chip">
                                  {elder.name} / {elder.archiveNo} / {elder.age}岁
                                </span>
                              ))
                            ) : (
                              <span className="inline-chip inline-chip--muted">暂无分配</span>
                            )}
                          </div>
                        </div>
                      </td>
                    )}
                    {volunteerColumns.isVisible('status') && (
                      <td className="col-volunteer-status">
                        <StatusTag status={row.status} />
                      </td>
                    )}
                    {volunteerColumns.isVisible('lastSubmit') && <td className="col-volunteer-submit">{row.lastSubmit}</td>}
                    {volunteerColumns.isVisible('actions') && (
                      <td className="col-volunteer-actions">
                        <div className="table-actions">
                          <button onClick={() => openScopeDialog(row)}>负责老人</button>
                          <button onClick={() => openEditDialog(row)}>编辑</button>
                          <button onClick={() => handleToggleStatus(row)}>
                            {row.status === ACTIVE_STATUS ? DISABLED_STATUS : ACTIVE_STATUS}
                          </button>
                          <button className="danger" onClick={() => handleDelete(row.id)}>
                            删除
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        ) : (
          <div className="table-shell volunteer-table-shell">
          <table className="data-table volunteer-manage-table volunteer-manage-table--family">
            <thead>
              <tr>
                {familyColumns.isVisible('name') && <th>家属姓名</th>}
                {familyColumns.isVisible('phone') && <th>手机号</th>}
                {familyColumns.isVisible('relationship') && <th>关系</th>}
                {familyColumns.isVisible('create') && <th>创建时间</th>}
                {familyColumns.isVisible('method') && <th>创建方式</th>}
                {familyColumns.isVisible('code') && <th>邀请码</th>}
                {familyColumns.isVisible('count') && <th>绑定老人数量</th>}
                {familyColumns.isVisible('status') && <th>状态</th>}
                {familyColumns.isVisible('actions') && <th>操作</th>}
              </tr>
            </thead>
            <tbody>
              {filteredFamilies.map((group) => (
                <tr key={group.key}>
                  {familyColumns.isVisible('name') && <td>{group.familyName}</td>}
                  {familyColumns.isVisible('phone') && <td>{group.familyPhoneMasked}</td>}
                  {familyColumns.isVisible('relationship') && <td>{group.relationship}</td>}
                  {familyColumns.isVisible('create') && <td>{group.rows[0]?.boundAt || '-'}</td>}
                  {familyColumns.isVisible('method') && <td>{group.rows[0]?.createMethod || '邀请码注册'}</td>}
                  {familyColumns.isVisible('code') && <td>{group.rows[0]?.invitationCode || '-'}</td>}
                  {familyColumns.isVisible('count') && <td>{group.rows.filter((item) => item.status === BOUND_STATUS).length || group.rows.length}</td>}
                  {familyColumns.isVisible('status') && (
                    <td>
                      <StatusTag status={group.status} />
                    </td>
                  )}
                  {familyColumns.isVisible('actions') && (
                    <td>
                      <div className="table-actions">
                        <button onClick={() => openFamilyDialog(group)}>查看绑定老人</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {!filteredFamilies.length && (
                <tr>
                  <td colSpan={familyColumnOptions.filter((option) => familyColumns.isVisible(option.key)).length} style={{ color: '#6b7280' }}>
                    暂无家属绑定数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        )}
      </section>

      {showDialog && (
        <div className="modal-overlay" onClick={closeDialog}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="panel-title">
              <UserCheck size={18} />
              <h3>{editingId ? `编辑志愿者 ${editingId}` : '新增志愿者账号'}</h3>
            </div>

            <div className="form-grid">
              <label>
                姓名
                <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
              </label>
              <label>
                账号
                <input value={form.account} onChange={(event) => setForm((prev) => ({ ...prev, account: event.target.value }))} />
              </label>
              <label>
                手机号
                <input value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
              </label>
              <label>
                {editingId ? '修改密码' : '初始密码'}
                <input value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} />
              </label>
              <label>
                状态
                <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
                  <option>{ACTIVE_STATUS}</option>
                  <option>{DISABLED_STATUS}</option>
                </select>
              </label>
            </div>

            {error && <p className="form-error">{error}</p>}

            <div className="form-actions">
              <button onClick={handleSubmit}>{editingId ? '保存修改' : '确认新增'}</button>
              <button className="secondary" onClick={closeDialog}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {showScopeDialog && selectedVolunteer && (
        <div className="modal-overlay" onClick={closeScopeDialog}>
          <div className="modal-content modal-content--wide modal-content--scrollable" onClick={(event) => event.stopPropagation()}>
            <div className="panel-title">
              <Home size={18} />
              <h3>负责老人管理 - {selectedVolunteer.name}</h3>
            </div>

            <div className="modal-scroll-body">
              <div className="scope-summary-grid">
                <div className="scope-summary-card">
                  <span>志愿者账号</span>
                  <strong>{selectedVolunteer.account}</strong>
                </div>
                <div className="scope-summary-card">
                  <span>当前负责数量</span>
                  <strong>{assignedElders.length}</strong>
                </div>
                <div className="scope-summary-card">
                  <span>可添加老人</span>
                  <strong>{availableElders.length}</strong>
                </div>
              </div>

              <div className="toolbar" style={{ marginBottom: 14 }}>
                <button className="secondary" onClick={() => setShowAddElderPanel((prev) => !prev)}>
                  {showAddElderPanel ? '收起添加' : '添加老人'}
                </button>
              </div>

              <div className={`scope-dialog-layout${scopeRailCollapsed ? ' scope-dialog-layout--rail-collapsed' : ''}`}>
                <div className="scope-dialog-main">
                  {showAddElderPanel ? (
                    <div className="scope-list scope-list--single">
                      {availableElders.map((elder) => (
                        <article key={elder.id} className="binding-card">
                          <div>
                            <strong>{elder.name}</strong>
                            <p>{elder.archiveNo}</p>
                            <p>
                              {elder.age} 岁 / {elder.status}
                            </p>
                          </div>
                          <div className="binding-card-actions">
                            <button onClick={() => addElderToVolunteer(elder.id)}>添加</button>
                          </div>
                        </article>
                      ))}

                      {!availableElders.length && (
                        <article className="binding-card">
                          <div>
                            <strong>暂无可添加老人</strong>
                            <p>每位老人只能分配给一位志愿者，当前没有空闲老人。</p>
                          </div>
                        </article>
                      )}
                    </div>
                  ) : (
                    <div className="binding-list">
                      {assignedElders.map((elder) => (
                        <article key={elder.id} className="binding-card">
                          <div>
                            <strong>{elder.name}</strong>
                            <p>{elder.archiveNo}</p>
                            <p>
                              {elder.age} 岁 / {elder.status}
                            </p>
                          </div>
                          <div className="binding-card-actions">
                            <button className="danger" onClick={() => removeElderFromVolunteer(elder.id)}>
                              删除
                            </button>
                          </div>
                        </article>
                      ))}

                      {!assignedElders.length && (
                        <article className="binding-card">
                          <div>
                            <strong>当前未分配老人</strong>
                            <p>请通过“添加老人”为该志愿者分配服务对象。</p>
                          </div>
                        </article>
                      )}
                    </div>
                  )}
                </div>

                <aside className={`scope-name-rail${scopeRailCollapsed ? ' scope-name-rail--collapsed' : ''}`}>
                  <div className="scope-name-rail-header">
                    {!scopeRailCollapsed && (
                      <div>
                        <strong>已选老人</strong>
                        <span>{assignedElders.length} 位</span>
                      </div>
                    )}
                    <button
                      type="button"
                      className="scope-name-rail-toggle"
                      onClick={() => setScopeRailCollapsed((prev) => !prev)}
                      aria-label={scopeRailCollapsed ? '展开已选老人' : '收起已选老人'}
                    >
                      {scopeRailCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                    </button>
                  </div>

                  {scopeRailCollapsed ? (
                    <div className="scope-name-rail-count">{assignedElders.length}</div>
                  ) : (
                    <div className="scope-name-rail-body">
                      {assignedElders.length ? (
                        assignedElders.map((elder) => (
                          <button
                            key={elder.id}
                            type="button"
                            className="scope-name-chip"
                            onClick={() => removeElderFromVolunteer(elder.id)}
                            title={`${elder.name} / ${elder.archiveNo}`}
                          >
                            <span>{elder.name}</span>
                            <small>{elder.archiveNo}</small>
                          </button>
                        ))
                      ) : (
                        <p className="scope-name-rail-empty">暂无已选老人</p>
                      )}
                    </div>
                  )}
                </aside>
              </div>

              {scopeError && <p className="form-error">{scopeError}</p>}
            </div>

            <div className="form-actions">
              <button onClick={handleSaveScope}>保存负责老人</button>
              <button className="secondary" onClick={closeScopeDialog}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {showFamilyDialog && selectedFamilyGroup && (
        <div className="modal-overlay" onClick={closeFamilyDialog}>
          <div className="modal-content modal-content--wide modal-content--scrollable" onClick={(event) => event.stopPropagation()}>
            <div className="panel-title">
              <Link2 size={18} />
              <h3>家属绑定老人审查</h3>
            </div>

            <div className="modal-scroll-body">
              <div className="scope-summary-grid">
                <div className="scope-summary-card">
                  <span>家属姓名</span>
                  <strong>{selectedFamilyGroup.familyName}</strong>
                </div>
                <div className="scope-summary-card">
                  <span>手机号</span>
                  <strong>{selectedFamilyGroup.familyPhoneMasked}</strong>
                </div>
                <div className="scope-summary-card">
                  <span>关系 / 绑定数量</span>
                  <strong>
                    {selectedFamilyGroup.relationship} / {selectedFamilyGroup.rows.length}
                  </strong>
                </div>
              </div>

              <div className="binding-list">
                {selectedFamilyGroup.rows.map((row) => (
                  <article key={row.id} className="binding-card">
                    <div>
                      <strong>{row.elderName}</strong>
                      <p>{row.elderArchiveNo}</p>
                      <p>邀请码：{row.invitationCode || '-'}</p>
                      <p>绑定时间：{row.boundAt || '-'}</p>
                    </div>
                    <div className="binding-card-actions">
                      <StatusTag status={row.status} />
                      {row.status === BOUND_STATUS && (
                        <button className="danger" onClick={() => handleUnbindFamily(row.id)}>
                          解绑
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button className="secondary" onClick={closeFamilyDialog}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


