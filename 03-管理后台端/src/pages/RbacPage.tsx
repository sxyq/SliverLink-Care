import { useEffect, useMemo, useState } from 'react';
import { KeyRound, UserCog, Users } from 'lucide-react';
import { TableColumnMenu, useTableColumnVisibility, type TableColumnOption } from '../components/TableColumnMenu';
import { fetchFamilyBindings, fetchVolunteers } from '../api/adminApi';
import type { FamilyBindingRow, VolunteerRow } from '../types';

type ManagedRole = '系统管理员' | '项目管理员' | '护理志愿者' | '家属协管账号';
type AccountGroup = 'admin' | 'volunteer' | 'family';
type RbacColumnKey = 'name' | 'loginId' | 'source' | 'role' | 'scope' | 'status';

interface AccountRow {
  id: string;
  name: string;
  loginId: string;
  source: string;
  role: ManagedRole;
  dataScope: string;
  status: string;
  group: AccountGroup;
}

interface PendingRoleChange {
  row: AccountRow;
  nextRole: ManagedRole;
}

const ROLE_STORAGE_KEY = 'sl_account_role_assignments';
const rbacColumnOptions: TableColumnOption<RbacColumnKey>[] = [
  { key: 'name', label: '账号名称', defaultVisible: true },
  { key: 'loginId', label: '登录标识', defaultVisible: true },
  { key: 'source', label: '账号来源', defaultVisible: true },
  { key: 'role', label: '账号类型', defaultVisible: true },
  { key: 'scope', label: '数据范围', defaultVisible: true },
  { key: 'status', label: '状态', defaultVisible: true },
];

const roleOptions: ManagedRole[] = ['系统管理员', '项目管理员', '护理志愿者', '家属协管账号'];

const groupLabels: Record<AccountGroup, string> = {
  admin: '管理员账号',
  volunteer: '医护/志愿者账号',
  family: '家属协管账号',
};

const groupIcons = {
  admin: KeyRound,
  volunteer: Users,
  family: UserCog,
} as const;

function readRoleAssignments() {
  try {
    const raw = localStorage.getItem(ROLE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ManagedRole>) : {};
  } catch {
    return {};
  }
}

function writeRoleAssignments(assignments: Record<string, ManagedRole>) {
  localStorage.setItem(ROLE_STORAGE_KEY, JSON.stringify(assignments));
}

function formatScopeByRole(role: ManagedRole, detail: string) {
  switch (role) {
    case '系统管理员':
      return '全项目数据与后台管理';
    case '项目管理员':
      return '本项目业务数据与运营配置';
    case '护理志愿者':
      return detail || '仅负责本人分配老人';
    case '家属协管账号':
      return detail || '仅可查看和维护绑定老人';
    default:
      return detail;
  }
}

function buildFamilyAccounts(rows: FamilyBindingRow[], assignments: Record<string, ManagedRole>) {
  const grouped = new Map<
    string,
    {
      id: string;
      name: string;
      loginId: string;
      source: string;
      status: string;
      elders: string[];
    }
  >();

  rows.forEach((row) => {
    const key = `${row.familyName}-${row.familyPhoneMasked}`;
    const elderText = `${row.elderName}（${row.elderArchiveNo}）`;
    const existing = grouped.get(key);

    if (existing) {
      existing.elders.push(elderText);
      if (existing.status !== '已绑定') {
        existing.status = row.status;
      }
      return;
    }

    grouped.set(key, {
      id: row.id,
      name: row.familyName,
      loginId: row.familyPhoneMasked,
      source: row.invitationCode ? `邀请码 ${row.invitationCode}` : row.createMethod || '邀请码注册',
      status: row.status,
      elders: [elderText],
    });
  });

  return Array.from(grouped.values()).map<AccountRow>((item) => {
    const accountId = `family-${item.id}`;
    const role = assignments[accountId] || '家属协管账号';

    return {
      id: accountId,
      name: item.name,
      loginId: item.loginId,
      source: item.source,
      role,
      dataScope: formatScopeByRole(role, item.elders.join('、')),
      status: item.status,
      group: 'family',
    };
  });
}

export function RbacPage() {
  const [volunteers, setVolunteers] = useState<VolunteerRow[]>([]);
  const [familyBindings, setFamilyBindings] = useState<FamilyBindingRow[]>([]);
  const [assignments, setAssignments] = useState<Record<string, ManagedRole>>(() => readRoleAssignments());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [pendingChange, setPendingChange] = useState<PendingRoleChange | null>(null);
  const [confirmAccount, setConfirmAccount] = useState('admin');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const columns = useTableColumnVisibility('sl_columns_rbac_accounts', rbacColumnOptions);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [volunteerRows, familyRows] = await Promise.all([fetchVolunteers(), fetchFamilyBindings()]);
        if (!alive) return;
        setVolunteers(volunteerRows);
        setFamilyBindings(familyRows);
      } catch (loadError) {
        if (!alive) return;
        setError(loadError instanceof Error ? loadError.message : '加载账户权限数据失败');
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, []);

  const adminRows = useMemo<AccountRow[]>(
    () => [
      {
        id: 'admin-account',
        name: '平台管理员',
        loginId: 'admin',
        source: '系统内置账号',
        role: assignments['admin-account'] || '系统管理员',
        dataScope: formatScopeByRole(assignments['admin-account'] || '系统管理员', ''),
        status: '启用',
        group: 'admin',
      },
    ],
    [assignments],
  );

  const volunteerRows = useMemo<AccountRow[]>(
    () =>
      volunteers.map((row) => {
        const accountId = `volunteer-${row.id}`;
        const role = assignments[accountId] || '护理志愿者';
        return {
          id: accountId,
          name: row.name,
          loginId: row.account,
          source: row.createMethod || '后台创建',
          role,
          dataScope: formatScopeByRole(role, `当前负责 ${row.elderCount} 位老人`),
          status: row.status,
          group: 'volunteer',
        };
      }),
    [assignments, volunteers],
  );

  const familyRows = useMemo(() => buildFamilyAccounts(familyBindings, assignments), [assignments, familyBindings]);

  function handleRoleIntent(row: AccountRow, nextRole: ManagedRole) {
    if (row.role === nextRole) return;
    setConfirmError('');
    setConfirmAccount('admin');
    setConfirmPassword('');
    setPendingChange({ row, nextRole });
  }

  function handleConfirmRoleChange() {
    if (!pendingChange) return;

    const normalizedAccount = confirmAccount.trim();
    const normalizedPassword = confirmPassword.trim();
    const accountValid = normalizedAccount === 'admin';
    const passwordValid = normalizedPassword === 'admin';

    if (!accountValid || !passwordValid) {
      setConfirmError('当前管理员账号或密码不正确，未执行账号类型变更。');
      return;
    }

    const nextAssignments = {
      ...assignments,
      [pendingChange.row.id]: pendingChange.nextRole,
    };
    setAssignments(nextAssignments);
    writeRoleAssignments(nextAssignments);
    setFeedback(`已将 ${pendingChange.row.name} 的账号类型改为 ${pendingChange.nextRole}。`);
    setPendingChange(null);
    setConfirmError('');
    setConfirmPassword('');
  }

  function renderAccountTable(group: AccountGroup, rows: AccountRow[]) {
    const Icon = groupIcons[group];

    return (
      <section className="panel" style={{ marginTop: 14 }}>
        <div className="panel-title">
          <Icon size={18} />
          <h3>{groupLabels[group]}</h3>
          <TableColumnMenu
            options={rbacColumnOptions}
            isVisible={columns.isVisible}
            onToggle={columns.toggle}
            onReset={columns.reset}
          />
        </div>
        <div className="table-shell rbac-summary-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {columns.isVisible('name') && <th>账号名称</th>}
                {columns.isVisible('loginId') && <th>登录标识</th>}
                {columns.isVisible('source') && <th>账号来源</th>}
                {columns.isVisible('role') && <th>账号类型</th>}
                {columns.isVisible('scope') && <th>数据范围</th>}
                {columns.isVisible('status') && <th>状态</th>}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={rbacColumnOptions.filter((item) => columns.isVisible(item.key)).length} className="empty-cell">
                    暂无账号
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    {columns.isVisible('name') && <td>{row.name}</td>}
                    {columns.isVisible('loginId') && <td>{row.loginId}</td>}
                    {columns.isVisible('source') && <td>{row.source}</td>}
                    {columns.isVisible('role') && (
                      <td>
                        <select value={row.role} onChange={(event) => handleRoleIntent(row, event.target.value as ManagedRole)}>
                          {roleOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}
                    {columns.isVisible('scope') && <td style={{ minWidth: 280 }}>{row.dataScope}</td>}
                    {columns.isVisible('status') && (
                      <td>
                        <span className={`status-tag ${row.status === '启用' || row.status === '已绑定' ? 'status-tag--active' : 'status-tag--disabled'}`}>
                          {row.status}
                        </span>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">权限控制</p>
          <h2>账号权限管理</h2>
        </div>
      </header>

      {feedback ? (
        <section className="panel" style={{ marginTop: 14 }}>
          <p className="scope-hint" style={{ color: '#0f766e', margin: 0 }}>
            {feedback}
          </p>
        </section>
      ) : null}

      {error ? (
        <section className="panel" style={{ marginTop: 14 }}>
          <p className="form-error">{error}</p>
        </section>
      ) : null}

      {renderAccountTable('admin', adminRows)}
      {renderAccountTable('volunteer', volunteerRows)}
      {renderAccountTable('family', familyRows)}

      {loading ? (
        <section className="panel" style={{ marginTop: 14 }}>
          <p className="scope-hint">正在加载账户数据...</p>
        </section>
      ) : null}

      {pendingChange ? (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>确认修改账号类型</h3>
            <div className="form-grid">
              <label>
                <span>目标账号</span>
                <input value={pendingChange.row.name} readOnly />
              </label>
              <label>
                <span>新账号类型</span>
                <input value={pendingChange.nextRole} readOnly />
              </label>
              <label>
                <span>当前管理员账号</span>
                <input value={confirmAccount} onChange={(event) => setConfirmAccount(event.target.value)} />
              </label>
              <label>
                <span>当前管理员密码</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </label>
            </div>
            {confirmError ? <p className="form-error">{confirmError}</p> : null}
            <div className="form-actions">
              <button onClick={handleConfirmRoleChange}>确认修改</button>
              <button
                className="secondary"
                onClick={() => {
                  setPendingChange(null);
                  setConfirmError('');
                  setConfirmPassword('');
                }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
