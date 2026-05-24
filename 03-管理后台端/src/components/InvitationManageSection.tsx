import { useEffect, useMemo, useState } from 'react';
import { Ban, Copy, Link as LinkIcon, Plus, RefreshCw, RotateCcw, Search, Trash2, Users } from 'lucide-react';
import { createInvitation, deleteInvitation, disableInvitation, fetchElders, fetchFamilyBindings, fetchInvitations } from '../api/adminApi';
import type { ElderRow, FamilyBindingRow, InvitationRow } from '../types';
import { exportToCsv } from '../utils/exportCsv';
import { TableColumnMenu, useTableColumnVisibility, type TableColumnOption } from './TableColumnMenu';
import { StatusTag } from './StatusTag';

type InvitationColumnKey =
  | 'code'
  | 'elder'
  | 'archiveNo'
  | 'invitees'
  | 'expiresAt'
  | 'usage'
  | 'status'
  | 'createdAt'
  | 'actions';

type InvitationInviteeGroup = {
  key: string;
  familyName: string;
  familyPhoneMasked: string;
  relationship: string;
  status: string;
  boundAt: string;
  rows: FamilyBindingRow[];
};

type InvitationViewRow = InvitationRow & {
  invitees: InvitationInviteeGroup[];
};

const invitationColumnOptions: TableColumnOption<InvitationColumnKey>[] = [
  { key: 'code', label: '邀请码', defaultVisible: true },
  { key: 'elder', label: '绑定老人', defaultVisible: true },
  { key: 'archiveNo', label: '档案编号', defaultVisible: true },
  { key: 'invitees', label: '已邀请家属', defaultVisible: true },
  { key: 'expiresAt', label: '有效期至', defaultVisible: true },
  { key: 'usage', label: '使用次数', defaultVisible: true },
  { key: 'status', label: '状态', defaultVisible: true },
  { key: 'createdAt', label: '创建时间', defaultVisible: true },
  { key: 'actions', label: '操作', required: true },
];

const invitationStatusClassMap: Record<string, string> = {
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

function inferInvitationDays(createdAt: string, expiresAt: string) {
  const created = Date.parse(createdAt);
  const expires = Date.parse(expiresAt);
  if (Number.isNaN(created) || Number.isNaN(expires) || expires <= created) return 7;
  const days = Math.floor((expires - created) / (24 * 60 * 60 * 1000));
  return Math.max(1, days);
}

function buildInviteeGroups(rows: FamilyBindingRow[]) {
  const groups = new Map<string, InvitationInviteeGroup>();
  rows.forEach((row) => {
    const key = `${row.invitationCode}__${row.familyName}__${row.familyPhoneMasked}`;
    const existing = groups.get(key);
    if (existing) {
      existing.rows.push(row);
      if (!existing.boundAt || row.boundAt > existing.boundAt) {
        existing.boundAt = row.boundAt;
      }
      if (existing.status !== '已绑定' && row.status === '已绑定') {
        existing.status = row.status;
      }
      return;
    }
    groups.set(key, {
      key,
      familyName: row.familyName,
      familyPhoneMasked: row.familyPhoneMasked,
      relationship: row.relationship,
      status: row.status,
      boundAt: row.boundAt,
      rows: [row],
    });
  });
  return Array.from(groups.values()).sort((left, right) => right.boundAt.localeCompare(left.boundAt));
}

function inviteeSummary(group: InvitationInviteeGroup) {
  const boundCount = group.rows.filter((item) => item.status === '已绑定').length || group.rows.length;
  return `${group.familyName} ${group.familyPhoneMasked}（${boundCount}位老人）`;
}

export function InvitationManageSection({ embedded = false }: { embedded?: boolean }) {
  const [rows, setRows] = useState<InvitationRow[]>([]);
  const [elders, setElders] = useState<ElderRow[]>([]);
  const [bindings, setBindings] = useState<FamilyBindingRow[]>([]);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部状态');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<InvitationViewRow | null>(null);
  const [selectedElder, setSelectedElder] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [maxUses, setMaxUses] = useState(1);
  const [copyTip, setCopyTip] = useState<string | null>(null);
  const columns = useTableColumnVisibility('sl_columns_invitations', invitationColumnOptions);

  async function load() {
    const [invitationRows, elderRows, bindingRows] = await Promise.all([
      fetchInvitations(),
      fetchElders(),
      fetchFamilyBindings(),
    ]);
    setRows(invitationRows);
    setElders(elderRows);
    setBindings(bindingRows);
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  const invitationRows = useMemo<InvitationViewRow[]>(() => {
    const groupedByCode = bindings.reduce<Record<string, FamilyBindingRow[]>>((acc, row) => {
      const code = row.invitationCode || '';
      if (!code) return acc;
      if (!acc[code]) acc[code] = [];
      acc[code].push(row);
      return acc;
    }, {});

    return rows.map((row) => ({
      ...row,
      invitees: buildInviteeGroups(groupedByCode[row.code] || []),
    }));
  }, [bindings, rows]);

  const filtered = useMemo(
    () =>
      invitationRows.filter((row) => {
        const text = [
          row.code,
          row.elderName,
          row.archiveNo,
          ...row.invitees.map((group) => `${group.familyName} ${group.familyPhoneMasked} ${group.relationship}`),
        ]
          .join(' ')
          .toLowerCase();
        const matchKeyword = !keyword.trim() || text.includes(keyword.trim().toLowerCase());
        const matchStatus = statusFilter === '全部状态' || row.status === statusFilter;
        return matchKeyword && matchStatus;
      }),
    [invitationRows, keyword, statusFilter],
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

  async function handleToggleStatus(id: string) {
    await disableInvitation(id);
    await load();
  }

  async function handleDelete(id: string) {
    await deleteInvitation(id);
    await load();
  }

  async function handleRegenerate(row: InvitationRow) {
    if (!row.elderId) {
      throw new Error('当前邀请码缺少绑定老人信息，暂时无法重新生成');
    }
    await createInvitation(row.elderId, inferInvitationDays(row.createdAt, row.expiresAt), row.maxUses);
    await load();
  }

  function handleExport() {
    exportToCsv(
      `invitations-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((row) => ({
        邀请码: row.code,
        绑定老人: row.elderName,
        档案编号: row.archiveNo,
        已邀请家属: row.invitees.length ? row.invitees.map(inviteeSummary).join('；') : '暂无家属',
        有效期至: formatDateTime(row.expiresAt),
        使用次数: `${row.usedCount}/${row.maxUses}`,
        状态: row.status,
        创建时间: formatDateTime(row.createdAt),
      })),
    );
  }

  const content = (
    <>
      {!embedded && (
        <div className="panel-title">
          <LinkIcon size={18} />
          <h3>邀请码列表</h3>
        </div>
      )}

      <div className="toolbar invitation-manage-toolbar">
        <input
          placeholder="按邀请码、老人姓名、档案编号或家属搜索"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option>全部状态</option>
          <option>未使用</option>
          <option>已使用</option>
          <option>已过期</option>
          <option>已作废</option>
        </select>
        <button onClick={() => setKeyword(keyword.trim())}>
          <Search size={14} />
          查询
        </button>
        <button className="secondary" onClick={handleExport} disabled={filtered.length === 0}>
          导出
        </button>
        <TableColumnMenu options={invitationColumnOptions} isVisible={columns.isVisible} onToggle={columns.toggle} onReset={columns.reset} />
        <button className="secondary" onClick={() => setShowCreateDialog(true)}>
          <Plus size={16} />
          生成邀请码
        </button>
      </div>

      <div className="table-shell invitation-table-shell">
        <table className="data-table invitation-manage-table">
          <thead>
            <tr>
              {columns.isVisible('code') && <th>邀请码</th>}
              {columns.isVisible('elder') && <th>绑定老人</th>}
              {columns.isVisible('archiveNo') && <th>档案编号</th>}
              {columns.isVisible('invitees') && <th>已邀请家属</th>}
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
                {columns.isVisible('invitees') && (
                  <td className="col-invitation-invitees">
                    <div className="table-detail-cell">
                      <strong>{row.invitees.length ? `共 ${row.invitees.length} 位家属` : '暂无家属'}</strong>
                      <div className="inline-chip-list">
                        {row.invitees.length ? (
                          row.invitees.slice(0, 2).map((group) => (
                            <span key={group.key} className="inline-chip">
                              {group.familyName} / {group.familyPhoneMasked}
                            </span>
                          ))
                        ) : (
                          <span className="inline-chip inline-chip--muted">待注册</span>
                        )}
                        {row.invitees.length > 2 && <span className="inline-chip">+{row.invitees.length - 2} 位</span>}
                      </div>
                    </div>
                  </td>
                )}
                {columns.isVisible('expiresAt') && <td>{formatDateTime(row.expiresAt)}</td>}
                {columns.isVisible('usage') && <td>{row.usedCount}/{row.maxUses}</td>}
                {columns.isVisible('status') && (
                  <td>
                    <span className={invitationStatusClassMap[row.status] || 'status-tag'}>{row.status}</span>
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
                      <button className="secondary" onClick={() => setSelectedInvitation(row)}>
                        <Users size={14} />
                        查看家属
                      </button>
                      {row.status === '未使用' && (
                        <button className="secondary" onClick={() => handleToggleStatus(row.id)}>
                          <Ban size={14} />
                          作废
                        </button>
                      )}
                      {row.status === '已作废' && (
                        <button className="secondary" onClick={() => handleToggleStatus(row.id)}>
                          <RotateCcw size={14} />
                          恢复
                        </button>
                      )}
                      <button className="secondary" onClick={() => handleRegenerate(row)}>
                        <RefreshCw size={14} />
                        重新生成
                      </button>
                      <button className="danger" onClick={() => handleDelete(row.id)}>
                        <Trash2 size={14} />
                        删除
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={invitationColumnOptions.filter((option) => columns.isVisible(option.key)).length} style={{ color: '#6b7280' }}>
                  暂无邀请码数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  return (
    <>
      {embedded ? content : <section className="panel" style={{ marginTop: 14 }}>{content}</section>}

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

      {selectedInvitation && (
        <div className="modal-overlay" onClick={() => setSelectedInvitation(null)}>
          <div className="modal-content modal-content--wide" onClick={(event) => event.stopPropagation()}>
            <div className="panel-title">
              <Users size={18} />
              <h3>邀请码邀请家属明细</h3>
            </div>

            <div className="scope-summary-grid">
              <div className="scope-summary-card">
                <span>邀请码</span>
                <strong>{selectedInvitation.code}</strong>
              </div>
              <div className="scope-summary-card">
                <span>绑定老人</span>
                <strong>{selectedInvitation.elderName}</strong>
              </div>
              <div className="scope-summary-card">
                <span>家属数量 / 使用次数</span>
                <strong>{selectedInvitation.invitees.length} 位 / {selectedInvitation.usedCount}/{selectedInvitation.maxUses}</strong>
              </div>
            </div>

            <div className="binding-list">
              {selectedInvitation.invitees.length ? (
                selectedInvitation.invitees.map((group) => (
                  <article key={group.key} className="binding-card">
                    <div>
                      <strong>{group.familyName}</strong>
                      <p>手机号：{group.familyPhoneMasked}</p>
                      <p>关系：{group.relationship || '-'}</p>
                      <p>绑定时间：{formatDateTime(group.boundAt)}</p>
                      <p>绑定老人：{group.rows.map((item) => `${item.elderName} / ${item.elderArchiveNo}`).join('；')}</p>
                    </div>
                    <div className="binding-card-actions">
                      <StatusTag status={group.status} />
                    </div>
                  </article>
                ))
              ) : (
                <article className="binding-card">
                  <div>
                    <strong>当前尚无家属使用该邀请码</strong>
                    <p>可以复制邀请链接发送给家属进行注册绑定。</p>
                  </div>
                </article>
              )}
            </div>

            <div className="form-actions">
              <button className="secondary" onClick={() => setSelectedInvitation(null)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
