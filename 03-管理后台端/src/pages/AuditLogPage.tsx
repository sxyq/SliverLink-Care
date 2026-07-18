import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, ClipboardList } from 'lucide-react';
import { StatusTag } from '../components/StatusTag';
import { TableColumnMenu, useTableColumnVisibility, type TableColumnOption } from '../components/TableColumnMenu';
import { createAuditLogExport, downloadAuditLogExport, fetchAuditLogExport, fetchAuditLogPage, fetchAuditLogSummary, fetchElders } from '../api/adminApi';
import type { AuditLog, AuditLogFilters, AuditLogSummary, ElderRow } from '../types';

type AuditCategory = 'admin' | 'medical' | 'family' | 'visitor';
type AuditColumnKey = 'time' | 'operator' | 'action' | 'target' | 'ip' | 'result';
type VisitorDetailColumnKey = 'time' | 'name' | 'phone' | 'idCard' | 'verificationMethod' | 'action' | 'target' | 'ip' | 'result';
type VisitorSummaryColumnKey = 'time' | 'name' | 'phone' | 'verificationMethod' | 'result';
type VisitorWidgetId =
  | 'identity-registration'
  | 'verification-distribution'
  | 'action-distribution'
  | 'target-distribution'
  | 'daily-distribution'
  | 'recent-visitor'
  | 'visitor-table';
type WidgetKind = 'metric' | 'panel';
type WidgetSizePreset = 'compact' | 'standard' | 'wide' | 'tall' | 'large';

type VisitorWidgetConfig = {
  id: VisitorWidgetId;
  title: string;
  kind: WidgetKind;
  defaultSize: WidgetSizePreset;
};

const auditColumnOptions: TableColumnOption<AuditColumnKey>[] = [
  { key: 'time', label: '时间', defaultVisible: true },
  { key: 'operator', label: '操作人', defaultVisible: true },
  { key: 'action', label: '类型', defaultVisible: true },
  { key: 'target', label: '对象', defaultVisible: true },
  { key: 'ip', label: '来源 IP', defaultVisible: true },
  { key: 'result', label: '结果', defaultVisible: true },
];

const visitorSummaryColumnOptions: TableColumnOption<VisitorSummaryColumnKey>[] = [
  { key: 'time', label: '时间', defaultVisible: true },
  { key: 'name', label: '登记姓名', defaultVisible: true },
  { key: 'phone', label: '登记手机号', defaultVisible: true },
  { key: 'verificationMethod', label: '验证方式', defaultVisible: true },
  { key: 'result', label: '结果', defaultVisible: true },
];

const visitorDetailColumnOptions: TableColumnOption<VisitorDetailColumnKey>[] = [
  { key: 'time', label: '时间', defaultVisible: true },
  { key: 'name', label: '登记姓名', defaultVisible: true },
  { key: 'phone', label: '登记手机号', defaultVisible: true },
  { key: 'idCard', label: '身份证信息', defaultVisible: true },
  { key: 'verificationMethod', label: '验证方式', defaultVisible: true },
  { key: 'action', label: '类型', defaultVisible: true },
  { key: 'target', label: '对象', defaultVisible: true },
  { key: 'ip', label: '来源 IP', defaultVisible: true },
  { key: 'result', label: '结果', defaultVisible: true },
];

const VISITOR_WIDGETS: VisitorWidgetConfig[] = [
  { id: 'identity-registration', title: '身份登记访问', kind: 'panel', defaultSize: 'wide' },
  { id: 'recent-visitor', title: '最近访问记录', kind: 'panel', defaultSize: 'wide' },
  { id: 'visitor-table', title: '访问人员记录', kind: 'panel', defaultSize: 'wide' },
  { id: 'verification-distribution', title: '验证方式分布', kind: 'panel', defaultSize: 'standard' },
  { id: 'target-distribution', title: '访问对象分布', kind: 'panel', defaultSize: 'standard' },
  { id: 'daily-distribution', title: '按日期统计', kind: 'panel', defaultSize: 'standard' },
  { id: 'action-distribution', title: '访问类型分布', kind: 'panel', defaultSize: 'wide' },
];

const actionLabelMap: Record<string, string> = {
  LOGIN: '登录',
  LOGOUT: '退出登录',
  SCAN_QR: '扫码访问',
  IDENTITY_VERIFY: '身份登记验证',
  SMS_RELAY_START: '短信验证发起',
  SMS_RELAY_STATUS: '短信验证状态检查',
  SMS_SEND: '短信验证',
  VIEW_BASIC_INFO: '查看完整基础信息',
  VIEW_ARCHIVE: '查看健康档案',
  VIEW_MEDICATIONS: '查看主要用药',
  VIEW_SCALES: '查看量表记录',
  GENERATE_QR: '生成二维码',
  DISABLE_QR: '停用二维码',
  REGENERATE_QR: '重新生成二维码',
  CREATE_ELDER: '新增老人档案',
  UPDATE_ELDER: '修改老人档案',
  DELETE_ELDER: '删除老人档案',
  UPDATE_ELDER_STATUS: '变更老人状态',
  CREATE_VOLUNTEER: '新增志愿者',
  UPDATE_VOLUNTEER: '修改志愿者',
  DELETE_VOLUNTEER: '删除志愿者',
  UPDATE_VOLUNTEER_SCOPE: '调整负责老人',
  UPDATE_BASIC: '修改基本信息',
  SAVE_HEALTH_RECORD: '保存健康档案',
  SAVE_MEDICATIONS: '保存用药信息',
  SAVE_SCALE_RECORDS: '保存量表记录',
  UPDATE_CONTACTS: '修改联系人',
  VIEW_MY_ELDERS: '查看我的老人',
  VIEW_FAMILY_ELDER: '查看老人详情',
  VIEW_FAMILY_MEDICATIONS: '查看家属用药',
  ADD_FAMILY_MEDICATION: '家属新增用药',
  UPDATE_FAMILY_MEDICATION: '家属修改用药',
  DELETE_FAMILY_MEDICATION: '家属删除用药',
  VIEW_FAMILY_QRCODE: '查看家属二维码',
  UNBIND_FAMILY: '解绑家属',
  INVITATION_SEND_SMS: '邀请短信验证',
  INVITATION_REGISTER: '邀请码注册',
  CREATE_INVITATION: '新增邀请码',
  DISABLE_INVITATION: '停用邀请码',
  DELETE_INVITATION: '删除邀请码',
  SEED_DATA: '初始化数据',
};

function formatTime(value: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

function getLogGroup(log: AuditLog): AuditCategory {
  const role = (log.role || '').toUpperCase();
  if (role === 'SYSTEM_ADMIN') return 'admin';
  if (role === 'VOLUNTEER') return 'medical';
  if (role === 'FAMILY') return 'family';
  if (role === 'VISITOR' || role === 'SCAN_USER' || role === 'ANONYMOUS' || role === 'FAMILY') return 'visitor';

  const operator = (log.operator || '').toLowerCase();
  if (operator.includes('admin') || operator.includes('audit') || operator.includes('管理')) return 'admin';
  if (operator.includes('volunteer') || operator.includes('志愿者') || operator.includes('医护')) return 'medical';
  if (operator.includes('family') || operator.includes('家属')) return 'family';
  return 'visitor';
}

function categoryTitle(category: AuditCategory) {
  if (category === 'admin') return '管理员操作';
  if (category === 'medical') return '医护/志愿者操作';
  if (category === 'family') return '家属操作';
  return '访问人员记录';
}

function groupCount<T>(items: T[], keyGetter: (item: T) => string) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = keyGetter(item) || '未分类';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function formatPercent(value: number, total: number) {
  if (!total) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

function getVisitorPhone(log: AuditLog) {
  if (log.visitorPhone) {
    return log.visitorPhone;
  }
  if (log.visitorPhoneMasked) {
    return log.visitorPhoneMasked;
  }
  const operator = log.operator || '';
  const target = log.target || '';
  const phonePattern = /1\d{2}\*{0,4}\d{0,4}/;

  if (phonePattern.test(operator)) {
    return operator.match(phonePattern)?.[0] || '-';
  }
  if (log.action === 'SMS_SEND' && phonePattern.test(target)) {
    return target.match(phonePattern)?.[0] || '-';
  }
  return '-';
}

function getVisitorName(log: AuditLog) {
  return log.visitorName || '-';
}

function getVisitorIdCard(log: AuditLog) {
  return log.visitorIdCard || log.visitorIdCardMasked || '-';
}

function getVerificationMethodLabel(method: string | undefined) {
  const normalized = (method || '').trim().toUpperCase();
  if (normalized === 'IDENTITY') return '身份登记';
  if (normalized === 'SMS_RELAY') return '短信中转';
  if (normalized === 'DIRECT_SMS') return '短信验证码';
  return method || '-';
}

function getDisplayOperator(log: AuditLog, category: AuditCategory) {
  return category === 'visitor' ? getVisitorPhone(log) : log.operator || '-';
}

function getActionLabel(action: string) {
  return actionLabelMap[action] || action || '-';
}

function resolveVisitorTarget(log: AuditLog, elders: ElderRow[]) {
  const target = log.target || '';
  const matchedElder = elders.find((elder) => elder.archiveNo === target || elder.id === target);
  if (matchedElder) {
    return {
      label: `${matchedElder.name}（${matchedElder.archiveNo}）`,
      elder: matchedElder,
    };
  }
  if (/1\d{2}\*{0,4}\d{0,4}/.test(target)) {
    return {
      label: `手机号 ${target}`,
      elder: null,
    };
  }
  if (target === 'system' || target === 'silverlink_care') {
    return {
      label: '系统初始化数据',
      elder: null,
    };
  }
  return {
    label: target || '-',
    elder: null,
  };
}

function getSlotClassName(kind: WidgetKind, size: WidgetSizePreset) {
  return `dashboard-module-slot dashboard-module-slot--${kind}-${size}`;
}

export function AuditLogPage({ category }: { category: AuditCategory }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [elders, setElders] = useState<ElderRow[]>([]);
  const [filterResult, setFilterResult] = useState<string>('全部');
  const [filterAction, setFilterAction] = useState<string>('全部');
  const [filterVerificationMethod, setFilterVerificationMethod] = useState<string>('全部');
  const [filterOperator, setFilterOperator] = useState('');
  const [filterTarget, setFilterTarget] = useState('');
  const [filterIp, setFilterIp] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [summary, setSummary] = useState<AuditLogSummary | null>(null);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportId, setExportId] = useState('');
  const [exportMessage, setExportMessage] = useState('');
  const [selectedVisitorTarget, setSelectedVisitorTarget] = useState<{ log: AuditLog; elder: ElderRow } | null>(null);
  const columns = useTableColumnVisibility(`sl_columns_audit_${category}`, auditColumnOptions);
  const visitorDetailColumns = useTableColumnVisibility('sl_columns_audit_visitor_detail', visitorDetailColumnOptions);
  const visitorSummaryColumns = useTableColumnVisibility('sl_columns_audit_visitor_summary', visitorSummaryColumnOptions);

  const categoryRole: Record<AuditCategory, string> = {
    admin: 'SYSTEM_ADMIN', medical: 'VOLUNTEER', family: 'FAMILY', visitor: 'VISITOR',
  };

  const verificationMethodValue: Record<string, string> = {
    '身份登记': 'IDENTITY', '短信中转': 'SMS_RELAY', '短信验证码': 'DIRECT_SMS',
  };

  function activeFilters(): AuditLogFilters {
    return {
      from: dateFrom || undefined,
      to: dateTo || undefined,
      operator: filterOperator.trim() || undefined,
      target: filterTarget.trim() || undefined,
      sourceIp: filterIp.trim() || undefined,
      action: filterAction === '全部' ? undefined : filterAction,
      result: filterResult === '全部' ? undefined : filterResult,
      verificationMethod: filterVerificationMethod === '全部' ? undefined : verificationMethodValue[filterVerificationMethod],
      role: categoryRole[category],
    };
  }

  async function loadPage(cursor?: string | null, previous?: string[]) {
    setLoading(true);
    try {
      const filters = activeFilters();
      const [page, nextSummary] = await Promise.all([fetchAuditLogPage(filters, cursor), fetchAuditLogSummary(filters)]);
      setLogs(page.items);
      setCurrentCursor(cursor || null);
      setNextCursor(page.nextCursor);
      setSummary(nextSummary);
      setCursorHistory(previous || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchElders().then(setElders).catch(() => undefined);
    loadPage().catch(() => undefined);
  }, [category]);

  useEffect(() => {
    if (!exportId) return undefined;
    const timer = window.setInterval(() => {
      fetchAuditLogExport(exportId).then(async (task) => {
        if (task.status === 'COMPLETED' && task.downloadReady) {
          window.clearInterval(timer);
          await downloadAuditLogExport(exportId);
          setExportMessage(`已导出 ${task.rowCount} 条记录`);
          setExportId('');
        } else if (task.status === 'FAILED') {
          window.clearInterval(timer);
          setExportMessage(task.error || '导出失败');
          setExportId('');
        }
      }).catch(() => undefined);
    }, 800);
    return () => window.clearInterval(timer);
  }, [exportId]);

  const actions = Array.from(new Set(logs.map((item) => item.action).filter(Boolean)));

  const filtered = logs;

  const abnormalCount = summary?.failureCount ?? filtered.filter((item) => item.result === '失败').length;
  const successCount = summary?.successCount ?? filtered.filter((item) => item.result === '成功').length;
  const uniqueIpCount = summary?.sourceIpCount ?? new Set(filtered.map((item) => item.ip).filter(Boolean)).size;
  const visitorActionCounts = useMemo(() => summary
    ? Object.fromEntries(summary.actions.map((item) => [getActionLabel(item.label), item.value]))
    : groupCount(filtered, (item) => getActionLabel(item.action || '')), [filtered, summary]);
  const visitorVerificationCounts = useMemo(
    () => summary
      ? Object.fromEntries(summary.verificationMethods.map((item) => [getVerificationMethodLabel(item.label), item.value]))
      : groupCount(filtered, (item) => getVerificationMethodLabel(item.verificationMethod)),
    [filtered, summary],
  );
  const identityRegistrationVisitors = useMemo(() => {
    const registry = new Map<string, { name: string; phone: string; idCard: string }>();
    [...filtered]
      .filter((item) => {
        const method = getVerificationMethodLabel(item.verificationMethod);
        const action = getActionLabel(item.action || '');
        return method === '身份登记' || action === '身份登记验证' || action === '身份登记';
      })
      .sort((a, b) => b.time.localeCompare(a.time))
      .forEach((item) => {
        const name = getVisitorName(item);
        const phone = getVisitorPhone(item);
        const idCard = getVisitorIdCard(item);
        const key = [name, phone, idCard].join('__');
        if (!registry.has(key)) {
          registry.set(key, { name, phone, idCard });
        }
      });

    return Array.from(registry.values()).slice(0, 8);
  }, [filtered]);
  const visitorTargetCounts = useMemo(
    () => groupCount(filtered, (item) => resolveVisitorTarget(item, elders).label || '未标记对象'),
    [elders, filtered],
  );
  const visitorDailyCounts = useMemo(() => summary
    ? Object.fromEntries(summary.trend.map((item) => [item.day, item.value]))
    : groupCount(filtered, (item) => item.time?.slice(0, 10) || '未标记日期'), [filtered, summary]);
  const latestVisitorLogs = useMemo(() => [...filtered].sort((a, b) => b.time.localeCompare(a.time)).slice(0, 6), [filtered]);

  function resetFilters() {
    setFilterResult('全部');
    setFilterAction('全部');
    setFilterVerificationMethod('全部');
    setFilterOperator('');
    setFilterTarget('');
    setFilterIp('');
    setDateFrom('');
    setDateTo('');
    setCursorHistory([]);
    setCurrentCursor(null);
    setNextCursor(null);
  }

  async function handleExport() {
    setExportMessage('正在生成导出文件');
    const task = await createAuditLogExport(activeFilters());
    setExportId(task.id);
  }

  const operatorHeader = category === 'visitor' ? '手机号' : category === 'family' ? '家属账号' : '操作人';
  const operatorPlaceholder = category === 'visitor' ? '筛选手机号或姓名' : category === 'family' ? '筛选家属账号' : '筛选操作人';
  const mainColSpan = auditColumnOptions.filter((option) => columns.isVisible(option.key)).length;
  const visitorDetailColSpan = visitorDetailColumnOptions.filter((option) => visitorDetailColumns.isVisible(option.key)).length;
  const visitorSummaryColSpan = visitorSummaryColumnOptions.filter((option) => visitorSummaryColumns.isVisible(option.key)).length;
  const visibleVisitorWidgets = VISITOR_WIDGETS.map((item) => item.id);

  function renderVisitorWidget(widgetId: VisitorWidgetId): ReactNode {
    switch (widgetId) {
      case 'verification-distribution':
        return (
          <article className="panel analytics-card dashboard-module audit-scroll-panel">
            <div className="panel-title">
              <ClipboardList size={18} />
              <h3>验证方式分布</h3>
            </div>
            <div className="audit-scroll-content">
              <div className="bar-list">
                {Object.entries(visitorVerificationCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([label, value]) => (
                    <div key={label} className="bar-row">
                      <div className="bar-meta">
                        <span>{label}</span>
                        <strong>{value}</strong>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill bar-fill--teal" style={{ width: formatPercent(value, filtered.length) }} />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </article>
        );
      case 'identity-registration':
        return (
          <article className="panel analytics-card dashboard-module audit-scroll-panel">
            <div className="panel-title">
              <ClipboardList size={18} />
              <h3>访问验证人员</h3>
            </div>
            <p style={{ margin: '0 0 12px', color: 'var(--color-text-secondary)', fontSize: 13 }}>
              展示通过身份登记完成访问验证的人员基础信息，已按人员去重。
            </p>
            <div className="audit-scroll-content">
              <div className="visitor-registration-grid">
                {identityRegistrationVisitors.length === 0 ? (
                  <div className="visitor-registration-empty">当前筛选条件下暂无身份登记人员</div>
                ) : (
                  identityRegistrationVisitors.map((visitor, index) => {
                    return (
                      <article key={`identity-registration-${visitor.phone}-${index}`} className="visitor-registration-card">
                        <div className="visitor-registration-head">
                          <strong>{visitor.name}</strong>
                        </div>
                        <div className="visitor-registration-meta">
                          <span>登记手机号</span>
                          <strong>{visitor.phone}</strong>
                        </div>
                        <div className="visitor-registration-meta">
                          <span>身份证</span>
                          <strong>{visitor.idCard}</strong>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          </article>
        );
      case 'action-distribution':
        return (
          <article className="panel analytics-card dashboard-module audit-scroll-panel">
            <div className="panel-title">
              <ClipboardList size={18} />
              <h3>访问类型分布</h3>
            </div>
            <div className="audit-scroll-content">
              <div className="bar-list">
              {Object.entries(visitorActionCounts).map(([label, value]) => (
                <div key={label} className="bar-row">
                  <div className="bar-meta">
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: formatPercent(value, filtered.length) }} />
                  </div>
                </div>
              ))}
              </div>
            </div>
          </article>
        );
      case 'target-distribution':
        return (
          <article className="panel analytics-card dashboard-module audit-scroll-panel">
            <div className="panel-title">
              <ClipboardList size={18} />
              <h3>访问对象分布</h3>
            </div>
            <div className="audit-scroll-content">
              <div className="bar-list">
              {Object.entries(visitorTargetCounts).slice(0, 8).map(([label, value]) => (
                <div key={label} className="bar-row">
                  <div className="bar-meta">
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill bar-fill--teal" style={{ width: formatPercent(value, filtered.length) }} />
                  </div>
                </div>
              ))}
              </div>
            </div>
          </article>
        );
      case 'daily-distribution':
        return (
          <article className="panel analytics-card dashboard-module audit-scroll-panel">
            <div className="panel-title">
              <ClipboardList size={18} />
              <h3>按日期统计</h3>
            </div>
            <div className="audit-scroll-content">
              <div className="bar-list">
              {Object.entries(visitorDailyCounts)
                .sort(([a], [b]) => a.localeCompare(b))
                .slice(-7)
                .map(([label, value]) => (
                  <div key={label} className="bar-row">
                    <div className="bar-meta">
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill bar-fill--gold" style={{ width: formatPercent(value, filtered.length) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>
        );
      case 'recent-visitor':
        return (
          <article className="panel analytics-card dashboard-module audit-scroll-panel">
            <div className="panel-title">
              <ClipboardList size={18} />
              <h3>最近访问记录</h3>
            </div>
            <div className="toolbar" style={{ marginBottom: 10 }}>
              <TableColumnMenu
                options={visitorSummaryColumnOptions}
                isVisible={visitorSummaryColumns.isVisible}
                onToggle={visitorSummaryColumns.toggle}
                onReset={visitorSummaryColumns.reset}
              />
            </div>
            <div className="audit-scroll-table-wrap">
              <table className="data-table">
              <thead>
                <tr>
                  {visitorSummaryColumns.isVisible('time') && <th>时间</th>}
                  {visitorSummaryColumns.isVisible('name') && <th>登记姓名</th>}
                  {visitorSummaryColumns.isVisible('phone') && <th>登记手机号</th>}
                  {visitorSummaryColumns.isVisible('verificationMethod') && <th>验证方式</th>}
                  {visitorSummaryColumns.isVisible('result') && <th>结果</th>}
                </tr>
              </thead>
              <tbody>
                {latestVisitorLogs.length === 0 ? (
                  <tr>
                    <td colSpan={visitorSummaryColSpan} style={{ color: 'var(--color-text-secondary)' }}>
                      暂无记录
                    </td>
                  </tr>
                ) : (
                  latestVisitorLogs.map((log, index) => (
                    <tr key={`visitor-summary-${log.time}-${index}`}>
                      {visitorSummaryColumns.isVisible('time') && <td>{formatTime(log.time)}</td>}
                      {visitorSummaryColumns.isVisible('name') && <td>{getVisitorName(log)}</td>}
                      {visitorSummaryColumns.isVisible('phone') && <td>{getVisitorPhone(log)}</td>}
                      {visitorSummaryColumns.isVisible('verificationMethod') && <td>{getVerificationMethodLabel(log.verificationMethod)}</td>}
                      {visitorSummaryColumns.isVisible('result') && (
                        <td>
                          <StatusTag status={log.result} />
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
              </table>
            </div>
          </article>
        );
      case 'visitor-table':
        return (
          <article className="panel dashboard-module audit-scroll-panel audit-scroll-panel--table">
            <div className="panel-title">
              <ClipboardList size={18} />
              <h3>访问人员记录</h3>
            </div>
            <p style={{ margin: '0 0 12px', color: 'var(--color-text-secondary)', fontSize: 13 }}>共 {filtered.length} 条记录</p>
            <div className="toolbar" style={{ marginBottom: 10 }}>
              <TableColumnMenu
                options={visitorDetailColumnOptions}
                isVisible={visitorDetailColumns.isVisible}
                onToggle={visitorDetailColumns.toggle}
                onReset={visitorDetailColumns.reset}
              />
            </div>
            <div className="rbac-summary-table-wrap audit-scroll-table-wrap audit-scroll-table-wrap--main">
              <table className="data-table">
                <thead>
                  <tr>
                    {visitorDetailColumns.isVisible('time') && <th>时间</th>}
                    {visitorDetailColumns.isVisible('name') && <th>登记姓名</th>}
                    {visitorDetailColumns.isVisible('phone') && <th>登记手机号</th>}
                    {visitorDetailColumns.isVisible('idCard') && <th>身份证信息</th>}
                    {visitorDetailColumns.isVisible('verificationMethod') && <th>验证方式</th>}
                    {visitorDetailColumns.isVisible('action') && <th>类型</th>}
                    {visitorDetailColumns.isVisible('target') && <th>对象</th>}
                    {visitorDetailColumns.isVisible('ip') && <th>来源 IP</th>}
                    {visitorDetailColumns.isVisible('result') && <th>结果</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={visitorDetailColSpan} style={{ color: 'var(--color-text-secondary)' }}>
                        暂无记录
                      </td>
                    </tr>
                  ) : (
                    filtered.map((log, index) => (
                      <tr key={`${category}-${log.time}-${index}`}>
                        {visitorDetailColumns.isVisible('time') && <td>{formatTime(log.time)}</td>}
                        {visitorDetailColumns.isVisible('name') && <td>{getVisitorName(log)}</td>}
                        {visitorDetailColumns.isVisible('phone') && <td>{getVisitorPhone(log)}</td>}
                        {visitorDetailColumns.isVisible('idCard') && <td>{getVisitorIdCard(log)}</td>}
                        {visitorDetailColumns.isVisible('verificationMethod') && <td>{getVerificationMethodLabel(log.verificationMethod)}</td>}
                        {visitorDetailColumns.isVisible('action') && <td>{getActionLabel(log.action)}</td>}
                        {visitorDetailColumns.isVisible('target') && (
                          <td>
                            {(() => {
                              const targetInfo = resolveVisitorTarget(log, elders);
                              return targetInfo.elder ? (
                                <button
                                  className="secondary"
                                  style={{ padding: '4px 8px' }}
                                  onClick={() => setSelectedVisitorTarget({ log, elder: targetInfo.elder as ElderRow })}
                                >
                                  {targetInfo.label}
                                </button>
                              ) : (
                                targetInfo.label
                              );
                            })()}
                          </td>
                        )}
                        {visitorDetailColumns.isVisible('ip') && <td>{log.ip}</td>}
                        {visitorDetailColumns.isVisible('result') && (
                          <td>
                            <StatusTag status={log.result} />
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>
        );
    }
  }

  return (
    <>
      <div className="audit-page-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">审计与合规</p>
            <h2>{categoryTitle(category)}</h2>
          </div>
        </header>

        <section className={category === 'visitor' ? 'panel audit-visitor-shell' : 'panel audit-log-shell'}>
          {abnormalCount > 0 && (
            <div className="alert-bar">
              <AlertTriangle size={16} />
              <span>当前分类下有 {abnormalCount} 条失败记录，请重点检查来源 IP 和操作内容。</span>
            </div>
          )}

          <div className="toolbar audit-toolbar">
            <div className="audit-toolbar__row audit-toolbar__row--range">
              <div className="audit-toolbar__date-range">
                <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
                <span>至</span>
                <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
              </div>
              <input placeholder={operatorPlaceholder} value={filterOperator} onChange={(event) => setFilterOperator(event.target.value)} />
            </div>

            <div className="audit-toolbar__row audit-toolbar__row--filters">
              <input placeholder="筛选操作对象" value={filterTarget} onChange={(event) => setFilterTarget(event.target.value)} />
              <input placeholder="筛选来源 IP" value={filterIp} onChange={(event) => setFilterIp(event.target.value)} />
              <select value={filterAction} onChange={(event) => setFilterAction(event.target.value)}>
                <option>全部</option>
                {actions.map((action) => (
                  <option key={action} value={action}>
                    {getActionLabel(action)}
                  </option>
                ))}
              </select>
              {category === 'visitor' ? (
                <select value={filterVerificationMethod} onChange={(event) => setFilterVerificationMethod(event.target.value)}>
                  <option>全部</option>
                  <option>身份登记</option>
                  <option>短信中转</option>
                  <option>短信验证码</option>
                </select>
              ) : null}
              <select value={filterResult} onChange={(event) => setFilterResult(event.target.value)}>
                <option>全部</option>
                <option>成功</option>
                <option>失败</option>
              </select>
            </div>

            <div className="audit-toolbar__row audit-toolbar__row--actions">
              <div className="audit-toolbar__buttons">
                <button onClick={() => loadPage(null, [])} disabled={loading}>{loading ? '查询中' : '查询'}</button>
                <button className="secondary" onClick={() => { resetFilters(); window.setTimeout(() => loadPage(null, []), 0); }}>重置</button>
                <button className="secondary" onClick={() => handleExport().catch((error) => setExportMessage(error instanceof Error ? error.message : '导出失败'))} disabled={Boolean(exportId)}>导出</button>
                {category !== 'visitor' ? (
                  <TableColumnMenu options={auditColumnOptions} isVisible={columns.isVisible} onToggle={columns.toggle} onReset={columns.reset} />
                ) : null}
              </div>
            </div>
            {exportMessage ? <p className="form-error" style={{ color: 'var(--color-text-secondary)' }}>{exportMessage}</p> : null}
          </div>

          {category === 'visitor' ? (
            <>
              <article className="panel audit-visitor-summary-panel">
                <div className="audit-visitor-summary-grid">
                  <section className="audit-visitor-summary-card">
                    <p className="audit-visitor-summary-label">访问记录数</p>
                    <strong className="audit-visitor-summary-value">{summary?.total ?? filtered.length}</strong>
                    <span className="audit-visitor-summary-meta">当前筛选条件下的访问行为</span>
                  </section>
                  <section className="audit-visitor-summary-card">
                    <p className="audit-visitor-summary-label">成功访问</p>
                    <strong className="audit-visitor-summary-value">{successCount}</strong>
                    <span className="audit-visitor-summary-meta">{formatPercent(successCount, summary?.total ?? filtered.length)} 成功率</span>
                  </section>
                  <section className="audit-visitor-summary-card">
                    <p className="audit-visitor-summary-label">失败访问</p>
                    <strong className="audit-visitor-summary-value">{abnormalCount}</strong>
                    <span className="audit-visitor-summary-meta">{formatPercent(abnormalCount, summary?.total ?? filtered.length)} 失败占比</span>
                  </section>
                  <section className="audit-visitor-summary-card">
                    <p className="audit-visitor-summary-label">来源 IP 数</p>
                    <strong className="audit-visitor-summary-value">{uniqueIpCount}</strong>
                    <span className="audit-visitor-summary-meta">按当前访问记录去重</span>
                  </section>
                </div>
              </article>

              <section className="dashboard-module-grid audit-visitor-grid">
                {visibleVisitorWidgets.map((widgetId) => {
                  const config = VISITOR_WIDGETS.find((item) => item.id === widgetId)!;
                  return (
                    <section key={widgetId} className={getSlotClassName(config.kind, config.defaultSize)}>
                      {renderVisitorWidget(widgetId)}
                    </section>
                  );
                })}
              </section>
            </>
        ) : (
          <>
            <p style={{ margin: '0 0 12px', color: 'var(--color-text-secondary)', fontSize: 13 }}>当前 {filtered.length} 条记录{nextCursor ? '，存在更多记录' : ''}</p>

            <div className="rbac-summary-table-wrap audit-scroll-table-wrap audit-scroll-table-wrap--main">
              <table className="data-table audit-log-table">
                  <thead>
                    <tr>
                      {columns.isVisible('time') && <th className="col-audit-time">时间</th>}
                      {columns.isVisible('operator') && <th className="col-audit-operator">{operatorHeader}</th>}
                      {columns.isVisible('action') && <th className="col-audit-action">类型</th>}
                      {columns.isVisible('target') && <th className="col-audit-target">对象</th>}
                      {columns.isVisible('ip') && <th className="col-audit-ip">来源 IP</th>}
                      {columns.isVisible('result') && <th className="col-audit-result">结果</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={mainColSpan} style={{ color: 'var(--color-text-secondary)' }}>
                          暂无记录
                        </td>
                      </tr>
                    ) : (
                      filtered.map((log, index) => (
                        <tr key={`${category}-${log.time}-${index}`}>
                          {columns.isVisible('time') && <td className="col-audit-time">{formatTime(log.time)}</td>}
                          {columns.isVisible('operator') && <td className="col-audit-operator">{getDisplayOperator(log, category)}</td>}
                          {columns.isVisible('action') && <td className="col-audit-action">{getActionLabel(log.action)}</td>}
                          {columns.isVisible('target') && <td className="col-audit-target">{log.target}</td>}
                          {columns.isVisible('ip') && <td className="col-audit-ip">{log.ip}</td>}
                          {columns.isVisible('result') && (
                            <td className="col-audit-result">
                              <StatusTag status={log.result} />
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="form-actions" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
                <button className="secondary" disabled={loading || cursorHistory.length === 0} onClick={() => {
                  const previous = cursorHistory.slice(0, -1);
                  loadPage(cursorHistory[cursorHistory.length - 1] || null, previous).catch(() => undefined);
                }}>上一页</button>
                <button className="secondary" disabled={loading || !nextCursor} onClick={() => loadPage(nextCursor, [...cursorHistory, currentCursor || '']).catch(() => undefined)}>下一页</button>
              </div>
            </>
          )}
        </section>
      </div>

      {selectedVisitorTarget ? (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>访问对象详情</h3>
            <div className="form-grid">
              <label>
                <span>老人姓名</span>
                <input value={selectedVisitorTarget.elder.name} readOnly />
              </label>
              <label>
                <span>档案编号</span>
                <input value={selectedVisitorTarget.elder.archiveNo} readOnly />
              </label>
              <label>
                <span>年龄</span>
                <input value={String(selectedVisitorTarget.elder.age)} readOnly />
              </label>
              <label>
                <span>联系电话</span>
                <input value={selectedVisitorTarget.elder.phoneMasked} readOnly />
              </label>
              <label>
                <span>负责志愿者</span>
                <input value={selectedVisitorTarget.elder.volunteer || '未分配'} readOnly />
              </label>
              <label>
                <span>访问类型</span>
                <input value={getActionLabel(selectedVisitorTarget.log.action)} readOnly />
              </label>
              <label>
                <span>验证方式</span>
                <input value={getVerificationMethodLabel(selectedVisitorTarget.log.verificationMethod)} readOnly />
              </label>
              <label>
                <span>登记姓名</span>
                <input value={getVisitorName(selectedVisitorTarget.log)} readOnly />
              </label>
              <label>
                <span>登记手机号</span>
                <input value={getVisitorPhone(selectedVisitorTarget.log)} readOnly />
              </label>
              <label>
                <span>身份证信息</span>
                <input value={getVisitorIdCard(selectedVisitorTarget.log)} readOnly />
              </label>
              <label>
                <span>访问时间</span>
                <input value={formatTime(selectedVisitorTarget.log.time)} readOnly />
              </label>
              <label>
                <span>来源 IP</span>
                <input value={selectedVisitorTarget.log.ip} readOnly />
              </label>
            </div>
            <div className="form-actions">
              <button className="secondary" onClick={() => setSelectedVisitorTarget(null)}>关闭</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
