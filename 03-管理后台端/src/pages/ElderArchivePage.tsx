import { useEffect, useMemo, useState } from 'react';
import { UsersRound } from 'lucide-react';
import { StatusTag } from '../components/StatusTag';
import { TableColumnMenu, useTableColumnVisibility, type TableColumnOption } from '../components/TableColumnMenu';
import { createElder, deleteElder, fetchElders, setElderStatus } from '../api/adminApi';
import type { ElderRow } from '../types';
import { exportToCsv } from '../utils/exportCsv';

interface ElderForm {
  archiveNo: string;
  name: string;
  gender: '男' | '女';
  age: string;
  residence: string;
  emergencyContactName: string;
  emergencyPhone: string;
  relationship: string;
  aboType: string;
  rhType: string;
  allergySummary: string;
}

type ElderColumnKey = 'archiveNo' | 'name' | 'age' | 'residence' | 'phone' | 'volunteer' | 'status' | 'actions';

const ABO_OTHER = '__OTHER_ABO__';
const RH_OTHER = '__OTHER_RH__';
const ALL_STATUS = '全部状态';
const elderColumnOptions: TableColumnOption<ElderColumnKey>[] = [
  { key: 'archiveNo', label: '档案编号', defaultVisible: true },
  { key: 'name', label: '姓名', defaultVisible: true },
  { key: 'age', label: '年龄', defaultVisible: true },
  { key: 'residence', label: '住址', defaultVisible: true },
  { key: 'phone', label: '联系电话', defaultVisible: true },
  { key: 'volunteer', label: '负责志愿者', defaultVisible: true },
  { key: 'status', label: '状态', defaultVisible: true },
  { key: 'actions', label: '操作', required: true },
];

const emptyForm: ElderForm = {
  archiveNo: '',
  name: '',
  gender: '男',
  age: '',
  residence: '',
  emergencyContactName: '',
  emergencyPhone: '',
  relationship: '',
  aboType: '',
  rhType: '',
  allergySummary: '',
};

export function ElderArchivePage() {
  const [rows, setRows] = useState<ElderRow[]>([]);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [form, setForm] = useState<ElderForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [aboMode, setAboMode] = useState<'preset' | 'custom'>('preset');
  const [rhMode, setRhMode] = useState<'preset' | 'custom'>('preset');
  const columns = useTableColumnVisibility('sl_columns_elders', elderColumnOptions);

  async function load() {
    setRows(await fetchElders());
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        const matchKeyword = !keyword || row.name.includes(keyword) || row.archiveNo.includes(keyword);
        const matchStatus = statusFilter === ALL_STATUS || row.status === statusFilter;
        return matchKeyword && matchStatus;
      }),
    [keyword, rows, statusFilter],
  );

  function openCreateDialog() {
    setForm(emptyForm);
    setError('');
    setAboMode('preset');
    setRhMode('preset');
    setShowCreateDialog(true);
  }

  async function handleCreate() {
    setError('');
    const name = form.name.trim();
    const age = Number(form.age);
    const phone = form.emergencyPhone.trim();

    if (!name) {
      setError('请填写老人姓名');
      return;
    }
    if (!Number.isInteger(age) || age <= 0 || age > 130) {
      setError('请填写有效年龄');
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请填写有效联系电话');
      return;
    }

    setSaving(true);
    try {
      await createElder({
        archiveNo: form.archiveNo.trim() || undefined,
        name,
        gender: form.gender,
        age,
        residence: form.residence.trim(),
        emergencyContactName: form.emergencyContactName.trim(),
        emergencyPhone: phone,
        relationship: form.relationship.trim(),
        aboType: form.aboType.trim(),
        rhType: form.rhType.trim(),
        allergySummary: form.allergySummary.trim(),
      });
      setShowCreateDialog(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(row: ElderRow) {
    if (!row.id) return;
    await setElderStatus(row.id, row.status === '启用' ? 'DISABLED' : 'ACTIVE');
    await load();
  }

  async function handleDelete(row: ElderRow) {
    if (!row.id) return;
    if (!window.confirm(`确认删除/停用档案 ${row.archiveNo} 吗？`)) return;
    await deleteElder(row.id);
    await load();
  }

  function handleExport() {
    exportToCsv(
      `elders-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((row) => ({
        档案编号: row.archiveNo,
        姓名: row.name,
        性别: row.gender || '-',
        年龄: String(row.age),
        住址: row.residence || '-',
        联系电话: row.phoneMasked,
        ABO血型: row.aboType || '-',
        Rh血型: row.rhType || '-',
        负责志愿者: row.volunteer,
        状态: row.status,
      })),
    );
  }

  function openMedicationEditor(row: ElderRow) {
    if (!row.id) return;
    const query = new URLSearchParams({
      elderId: row.id,
      archiveNo: row.archiveNo,
      elderName: row.name,
    });
    window.location.assign(`${import.meta.env.BASE_URL}medications?${query.toString()}`);
  }

  function openScaleEditor(row: ElderRow) {
    if (!row.id) return;
    const query = new URLSearchParams({
      elderId: row.id,
      archiveNo: row.archiveNo,
      elderName: row.name,
    });
    window.location.assign(`${import.meta.env.BASE_URL}scales?${query.toString()}`);
  }

  function handleAboChange(value: string) {
    if (value === ABO_OTHER) {
      setAboMode('custom');
      setForm((prev) => ({ ...prev, aboType: '' }));
      return;
    }
    setAboMode('preset');
    setForm((prev) => ({ ...prev, aboType: value }));
  }

  function handleRhChange(value: string) {
    if (value === RH_OTHER) {
      setRhMode('custom');
      setForm((prev) => ({ ...prev, rhType: '' }));
      return;
    }
    setRhMode('preset');
    setForm((prev) => ({ ...prev, rhType: value }));
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">档案管理</p>
          <h2>老人档案</h2>
        </div>
      </header>

      <section className="panel" style={{ marginTop: 14 }}>
        <div className="panel-title">
          <UsersRound size={18} />
          <h3>老人档案列表</h3>
        </div>
        <div className="toolbar">
          <input placeholder="搜索姓名或档案编号" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option>{ALL_STATUS}</option>
            <option>启用</option>
            <option>停用</option>
          </select>
          <button onClick={() => setKeyword(keyword.trim())}>查询</button>
          <button className="secondary" onClick={handleExport} disabled={filtered.length === 0}>
            导出
          </button>
          <TableColumnMenu options={elderColumnOptions} isVisible={columns.isVisible} onToggle={columns.toggle} onReset={columns.reset} />
          <button className="secondary" onClick={openCreateDialog}>
            新增档案
          </button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              {columns.isVisible('archiveNo') && <th>档案编号</th>}
              {columns.isVisible('name') && <th>姓名</th>}
              {columns.isVisible('age') && <th>年龄</th>}
              {columns.isVisible('residence') && <th>住址</th>}
              {columns.isVisible('phone') && <th>联系电话</th>}
              {columns.isVisible('volunteer') && <th>负责志愿者</th>}
              {columns.isVisible('status') && <th>状态</th>}
              {columns.isVisible('actions') && <th>操作</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id || row.archiveNo}>
                {columns.isVisible('archiveNo') && <td>{row.archiveNo}</td>}
                {columns.isVisible('name') && <td>{row.name}</td>}
                {columns.isVisible('age') && <td>{row.age}</td>}
                {columns.isVisible('residence') && <td>{row.residence || '-'}</td>}
                {columns.isVisible('phone') && <td>{row.phoneMasked}</td>}
                {columns.isVisible('volunteer') && <td>{row.volunteer}</td>}
                {columns.isVisible('status') && (
                  <td>
                    <StatusTag status={row.status} />
                  </td>
                )}
                {columns.isVisible('actions') && (
                  <td>
                    <div className="table-actions">
                      <button className="secondary" onClick={() => openMedicationEditor(row)}>
                        用药信息
                      </button>
                      <button className="secondary" onClick={() => openScaleEditor(row)}>
                        量表信息
                      </button>
                      <button className={row.status === '启用' ? 'danger' : 'secondary'} onClick={() => handleToggleStatus(row)}>
                        {row.status === '启用' ? '停用' : '启用'}
                      </button>
                      <button className="danger" onClick={() => handleDelete(row)}>
                        删除
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {showCreateDialog && (
        <div className="modal-overlay" onClick={() => setShowCreateDialog(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="panel-title">
              <UsersRound size={18} />
              <h3>新增老人档案</h3>
            </div>
            <div className="form-grid">
              <label>
                姓名
                <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
              </label>
              <label>
                性别
                <select
                  value={form.gender}
                  onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value as ElderForm['gender'] }))}
                >
                  <option>男</option>
                  <option>女</option>
                </select>
              </label>
              <label>
                年龄
                <input type="number" value={form.age} onChange={(event) => setForm((prev) => ({ ...prev, age: event.target.value }))} />
              </label>
              <label>
                居住地
                <input value={form.residence} onChange={(event) => setForm((prev) => ({ ...prev, residence: event.target.value }))} />
              </label>
              <label>
                紧急联系人
                <input
                  value={form.emergencyContactName}
                  onChange={(event) => setForm((prev) => ({ ...prev, emergencyContactName: event.target.value }))}
                />
              </label>
              <label>
                联系电话
                <input
                  value={form.emergencyPhone}
                  onChange={(event) => setForm((prev) => ({ ...prev, emergencyPhone: event.target.value }))}
                  maxLength={11}
                />
              </label>
              <label>
                与老人关系
                <input value={form.relationship} onChange={(event) => setForm((prev) => ({ ...prev, relationship: event.target.value }))} />
              </label>
              <label>
                ABO 血型
                {aboMode === 'preset' ? (
                  <select value={form.aboType || ''} onChange={(event) => handleAboChange(event.target.value)}>
                    <option value="">未填写</option>
                    <option>A</option>
                    <option>B</option>
                    <option>AB</option>
                    <option>O</option>
                    <option value={ABO_OTHER}>其他（自主填写）</option>
                  </select>
                ) : (
                  <input
                    value={form.aboType}
                    onChange={(event) => setForm((prev) => ({ ...prev, aboType: event.target.value }))}
                    placeholder="请输入 ABO 血型"
                  />
                )}
              </label>
              <label>
                Rh 血型
                {rhMode === 'preset' ? (
                  <select value={form.rhType || ''} onChange={(event) => handleRhChange(event.target.value)}>
                    <option value="">未填写</option>
                    <option>阳性</option>
                    <option>阴性</option>
                    <option value={RH_OTHER}>其他（自主填写）</option>
                  </select>
                ) : (
                  <input
                    value={form.rhType}
                    onChange={(event) => setForm((prev) => ({ ...prev, rhType: event.target.value }))}
                    placeholder="请输入 Rh 血型"
                  />
                )}
              </label>
              <label>
                过敏史
                <input value={form.allergySummary} onChange={(event) => setForm((prev) => ({ ...prev, allergySummary: event.target.value }))} />
              </label>
              <label>
                档案编号（可选）
                <input
                  value={form.archiveNo}
                  onChange={(event) => setForm((prev) => ({ ...prev, archiveNo: event.target.value }))}
                  placeholder="不填写则自动生成"
                />
              </label>
            </div>
            {error && <p className="form-error">{error}</p>}
            <div className="form-actions">
              <button onClick={handleCreate} disabled={saving}>
                {saving ? '保存中...' : '确认新增'}
              </button>
              <button className="secondary" onClick={() => setShowCreateDialog(false)} disabled={saving}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
