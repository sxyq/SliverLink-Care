import { useEffect, useMemo, useState } from 'react';
import { Ban, Copy, Link, Plus, Search, Trash2 } from 'lucide-react';
import { TableColumnMenu, useTableColumnVisibility, type TableColumnOption } from '../components/TableColumnMenu';
import { createInvitation, deleteInvitation, disableInvitation, fetchElders, fetchInvitations } from '../api/adminApi';
import type { ElderRow, InvitationRow } from '../types';
import { exportToCsv } from '../utils/exportCsv';

type InvitationColumnKey = 'code' | 'elder' | 'archiveNo' | 'expiresAt' | 'usage' | 'status' | 'createdAt' | 'actions';

const invitationColumnOptions: TableColumnOption<InvitationColumnKey>[] = [
  { key: 'code', label: '邀请码', defaultVisible: true },
  { key: 'elder', label: '绑定老人', defaultVisible: true },
  { key: 'archiveNo', label: '档案编号', defaultVisible: true },
  { key: 'expiresAt', label: '有效期至', defaultVisible: true },
  { key: 'usage', label: '使用次数', defaultVisible: true },
  { key: 'status', label: '状态', defaultVisible: true },
  { key: 'createdAt', label: '创建时间', defaultVisible: true },
  { key: 'actions', label: '操作', required: true },
];

const statusClassMap: Record<string, string> = {
  未使用: 'status-tag status-tag--success',
  已使用: 'status-tag status-tag--info',
  已过期: 'status-tag status-tag--disabled',
  已作废: 'status-tag status-tag--danger',
};

function formatDateTime(value: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

export function InvitationManagePage() {
  const [rows, setRows] = useState<InvitationRow[]>([]);
  const [elders, setElders] = useState<ElderRow[]>([]);
  const [keyword, setKeyword] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedElder, setSelectedElder] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [maxUses, setMaxUses] = useState(1);
  const [copyTip, setCopyTip] = useState<string | null>(null);
  const columns = useTableColumnVisibility('sl_columns_invitations', invitationColumnOptions);

  async function load() {
    const [invitationRows, elderRows] = await Promise.all([fetchInvitations(), fetchElders()]);
    setRows(invitationRows);
    setElders(elderRows);
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (!keyword.trim()) return true;
        const text = `${row.code} ${row.elderName} ${row.archiveNo}`.toLowerCase();
        return text.includes(keyword.trim().toLowerCase());
      }),
    [keyword, rows],
  );

  async function handleCreate() {
    if (!selectedElder) return;
    await createInvitation(selectedElder, expiresInDays, maxUses);
    setShowCreateDialog(false);
    setSelectedElder('');
    setExpiresInDays(7);
    setMaxUses(1);
    await load();
  }

  function handleCopyLink(code: string) {
    const link = `${window.location.origin}/silverlink/family/#/invite/${code}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopyTip(code);
      window.setTimeout(() => setCopyTip(null), 1500);
    });
  }

  async function handleDisable(id: string) {
    await disableInvitation(id);
    await load();
  }

  async function handleDelete(id: string) {
    await deleteInvitation(id);
    await load();
  }

  function handleExport() {
    exportToCsv(
      `invitations-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((row) => ({
        邀请码: row.code,
        绑定老人: row.elderName,
        档案编号: row.archiveNo,
        有效期至: formatDateTime(row.expiresAt),
        使用次数: `${row.usedCount}/${row.maxUses}`,
        状态: row.status,
        创建时间: formatDateTime(row.createdAt),
      })),
    );
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">邀请码管理</p>
          <h2>邀请码管理</h2>
        </div>
      </header>

      <section className="panel" style={{ marginTop: 14 }}>
        <div className="panel-title">
          <Link size={18} />
          <h3>邀请码列表</h3>
        </div>

        <div className="toolbar">
          <Search size={16} style={{ flexShrink: 0, color: '#9ca3af' }} />
          <input
            placeholder="按老人姓名、档案编号或邀请码搜索"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <button className="secondary" onClick={handleExport} disabled={filtered.length === 0}>
            导出
          </button>
          <TableColumnMenu options={invitationColumnOptions} isVisible={columns.isVisible} onToggle={columns.toggle} onReset={columns.reset} />
          <button onClick={() => setShowCreateDialog(true)}>
            <Plus size={16} />
            生成邀请码
          </button>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              {columns.isVisible('code') && <th>邀请码</th>}
              {columns.isVisible('elder') && <th>绑定老人</th>}
              {columns.isVisible('archiveNo') && <th>档案编号</th>}
              {columns.isVisible('expiresAt') && <th>有效期至</th>}
              {columns.isVisible('usage') && <th>使用次数</th>}
              {columns.isVisible('status') && <th>状态</th>}
              {columns.isVisible('createdAt') && <th>创建时间</th>}
              {columns.isVisible('actions') && <th>操作</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id}>
                {columns.isVisible('code') && <td style={{ fontFamily: 'monospace' }}>{row.code}</td>}
                {columns.isVisible('elder') && <td>{row.elderName}</td>}
                {columns.isVisible('archiveNo') && <td>{row.archiveNo}</td>}
                {columns.isVisible('expiresAt') && <td>{formatDateTime(row.expiresAt)}</td>}
                {columns.isVisible('usage') && <td>{row.usedCount}/{row.maxUses}</td>}
                {columns.isVisible('status') && (
                  <td>
                    <span className={statusClassMap[row.status] || 'status-tag'}>{row.status}</span>
                  </td>
                )}
                {columns.isVisible('createdAt') && <td>{formatDateTime(row.createdAt)}</td>}
                {columns.isVisible('actions') && (
                  <td>
                    <div className="table-actions">
                      <button onClick={() => handleCopyLink(row.code)}>
                        <Copy size={14} />
                        {copyTip === row.code ? '已复制' : '复制链接'}
                      </button>
                      {row.status === '未使用' && (
                        <button className="secondary" onClick={() => handleDisable(row.id)}>
                          <Ban size={14} />
                          作废
                        </button>
                      )}
                      <button className="danger" onClick={() => handleDelete(row.id)}>
                        <Trash2 size={14} />
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
              <Plus size={18} />
              <h3>生成邀请码</h3>
            </div>

            <div className="form-grid">
              <label>
                选择老人
                <select value={selectedElder} onChange={(event) => setSelectedElder(event.target.value)}>
                  <option value="">请选择老人</option>
                  {elders.map((elder) => (
                    <option key={elder.id} value={elder.id}>
                      {elder.name}（{elder.archiveNo}）
                    </option>
                  ))}
                </select>
              </label>
              <label>
                有效期（天）
                <input type="number" min={1} value={expiresInDays} onChange={(event) => setExpiresInDays(Number(event.target.value))} />
              </label>
              <label>
                最大使用次数
                <input type="number" min={1} value={maxUses} onChange={(event) => setMaxUses(Number(event.target.value))} />
              </label>
            </div>

            <div className="form-actions">
              <button onClick={handleCreate} disabled={!selectedElder}>确认生成</button>
              <button className="secondary" onClick={() => setShowCreateDialog(false)}>取消</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
