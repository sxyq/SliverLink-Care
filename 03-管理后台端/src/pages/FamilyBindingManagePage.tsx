import { useEffect, useMemo, useState } from 'react';
import { Search, Unlink, UserX } from 'lucide-react';
import { TableColumnMenu, useTableColumnVisibility, type TableColumnOption } from '../components/TableColumnMenu';
import { fetchFamilyBindings, unbindFamily } from '../api/adminApi';
import type { FamilyBindingRow } from '../types';
import { exportToCsv } from '../utils/exportCsv';

type FamilyBindingColumnKey =
  | 'familyName'
  | 'phone'
  | 'relationship'
  | 'elderName'
  | 'archiveNo'
  | 'invitationCode'
  | 'createMethod'
  | 'boundAt'
  | 'status'
  | 'actions';

const familyBindingColumnOptions: TableColumnOption<FamilyBindingColumnKey>[] = [
  { key: 'familyName', label: '家属姓名', defaultVisible: true },
  { key: 'phone', label: '手机号', defaultVisible: true },
  { key: 'relationship', label: '与老人关系', defaultVisible: true },
  { key: 'elderName', label: '绑定老人', defaultVisible: true },
  { key: 'archiveNo', label: '档案编号', defaultVisible: true },
  { key: 'invitationCode', label: '邀请码', defaultVisible: true },
  { key: 'createMethod', label: '创建方式', defaultVisible: true },
  { key: 'boundAt', label: '绑定时间', defaultVisible: true },
  { key: 'status', label: '状态', defaultVisible: true },
  { key: 'actions', label: '操作', required: true },
];

const statusClassMap: Record<string, string> = {
  已绑定: 'status-tag status-tag--success',
  已解绑: 'status-tag status-tag--disabled',
};

function formatDateTime(value: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

export function FamilyBindingManagePage() {
  const [rows, setRows] = useState<FamilyBindingRow[]>([]);
  const [keyword, setKeyword] = useState('');
  const columns = useTableColumnVisibility('sl_columns_family_bindings', familyBindingColumnOptions);

  async function load() {
    setRows(await fetchFamilyBindings());
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (!keyword.trim()) return true;
        const text = `${row.familyName} ${row.familyPhoneMasked} ${row.elderName} ${row.elderArchiveNo}`.toLowerCase();
        return text.includes(keyword.trim().toLowerCase());
      }),
    [keyword, rows],
  );

  async function handleUnbind(id: string) {
    await unbindFamily(id);
    await load();
  }

  function handleExport() {
    exportToCsv(
      `family-bindings-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((row) => ({
        家属姓名: row.familyName,
        手机号: row.familyPhoneMasked,
        与老人关系: row.relationship,
        绑定老人: row.elderName,
        档案编号: row.elderArchiveNo,
        邀请码: row.invitationCode,
        创建方式: row.createMethod || '邀请码注册',
        绑定时间: formatDateTime(row.boundAt),
        状态: row.status,
      })),
    );
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">家属绑定管理</p>
          <h2>家属绑定管理</h2>
        </div>
      </header>

      <section className="panel" style={{ marginTop: 14 }}>
        <div className="panel-title">
          <UserX size={18} />
          <h3>家属绑定列表</h3>
        </div>

        <div className="toolbar">
          <Search size={16} style={{ flexShrink: 0, color: '#9ca3af' }} />
          <input
            placeholder="按手机号、老人姓名或档案编号搜索"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <button className="secondary" onClick={handleExport} disabled={filtered.length === 0}>
            导出
          </button>
          <TableColumnMenu options={familyBindingColumnOptions} isVisible={columns.isVisible} onToggle={columns.toggle} onReset={columns.reset} />
        </div>

        <div className="table-shell">
        <table className="data-table">
          <thead>
            <tr>
              {columns.isVisible('familyName') && <th>家属姓名</th>}
              {columns.isVisible('phone') && <th>手机号</th>}
              {columns.isVisible('relationship') && <th>与老人关系</th>}
              {columns.isVisible('elderName') && <th>绑定老人</th>}
              {columns.isVisible('archiveNo') && <th>档案编号</th>}
              {columns.isVisible('invitationCode') && <th>邀请码</th>}
              {columns.isVisible('createMethod') && <th>创建方式</th>}
              {columns.isVisible('boundAt') && <th>绑定时间</th>}
              {columns.isVisible('status') && <th>状态</th>}
              {columns.isVisible('actions') && <th>操作</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id}>
                {columns.isVisible('familyName') && <td>{row.familyName}</td>}
                {columns.isVisible('phone') && <td>{row.familyPhoneMasked}</td>}
                {columns.isVisible('relationship') && <td>{row.relationship}</td>}
                {columns.isVisible('elderName') && <td>{row.elderName}</td>}
                {columns.isVisible('archiveNo') && <td>{row.elderArchiveNo}</td>}
                {columns.isVisible('invitationCode') && <td style={{ fontFamily: 'monospace' }}>{row.invitationCode}</td>}
                {columns.isVisible('createMethod') && <td>{row.createMethod || '邀请码注册'}</td>}
                {columns.isVisible('boundAt') && <td>{formatDateTime(row.boundAt)}</td>}
                {columns.isVisible('status') && (
                  <td>
                    <span className={statusClassMap[row.status] || 'status-tag'}>{row.status}</span>
                  </td>
                )}
                {columns.isVisible('actions') && (
                  <td>
                    <div className="table-actions">
                      {row.status === '已绑定' ? (
                        <button className="danger" onClick={() => handleUnbind(row.id)}>
                          <Unlink size={14} />
                          解绑
                        </button>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: 13 }}>已解绑</span>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>
    </>
  );
}
