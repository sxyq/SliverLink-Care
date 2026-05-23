import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, ClipboardList, RotateCcw, X } from 'lucide-react';
import { StatusTag } from '../components/StatusTag';
import { TableColumnMenu, useTableColumnVisibility, type TableColumnOption } from '../components/TableColumnMenu';
import { fetchAuditLogs, fetchElders } from '../api/adminApi';
import { exportAuditLogs } from '../features/audit/auditExport';
import type { AuditLog, ElderRow } from '../types';

type AuditCategory = 'admin' | 'medical' | 'visitor';
type AuditColumnKey = 'time' | 'operator' | 'action' | 'target' | 'ip' | 'result';
type VisitorSummaryColumnKey = 'time' | 'operator' | 'action' | 'result';
type VisitorWidgetId =
  | 'metric-total'
  | 'metric-success'
  | 'metric-fail'
  | 'metric-ip'
  | 'action-distribution'
  | 'target-distribution'
  | 'daily-distribution'
  | 'recent-visitor'
  | 'visitor-table';
type WidgetKind = 'metric' | 'panel';
type MetricSizePreset = 'compact' | 'standard' | 'wide';
type PanelSizePreset = 'standard' | 'wide' | 'tall' | 'large';
type WidgetSizePreset = MetricSizePreset | PanelSizePreset;

type VisitorWidgetConfig = {
  id: VisitorWidgetId;
  title: string;
  kind: WidgetKind;
  defaultSize: WidgetSizePreset;
};

type VisitorLayoutState = {
  order: VisitorWidgetId[];
  hidden: VisitorWidgetId[];
};

type VisitorSizeMap = Record<VisitorWidgetId, WidgetSizePreset>;

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
  { key: 'operator', label: '手机号', defaultVisible: true },
  { key: 'action', label: '类型', defaultVisible: true },
  { key: 'result', label: '结果', defaultVisible: true },
];

const VISITOR_WIDGETS: VisitorWidgetConfig[] = [
  { id: 'metric-total', title: '访问记录数', kind: 'metric', defaultSize: 'compact' },
  { id: 'metric-success', title: '成功访问', kind: 'metric', defaultSize: 'compact' },
  { id: 'metric-fail', title: '失败访问', kind: 'metric', defaultSize: 'compact' },
  { id: 'metric-ip', title: '来源 IP 数', kind: 'metric', defaultSize: 'compact' },
  { id: 'action-distribution', title: '访问类型分布', kind: 'panel', defaultSize: 'standard' },
  { id: 'target-distribution', title: '访问对象分布', kind: 'panel', defaultSize: 'standard' },
  { id: 'daily-distribution', title: '按日期统计', kind: 'panel', defaultSize: 'standard' },
  { id: 'recent-visitor', title: '最近访问记录', kind: 'panel', defaultSize: 'standard' },
  { id: 'visitor-table', title: '访问人员记录', kind: 'panel', defaultSize: 'wide' },
];

const VISITOR_LAYOUT_KEY = 'sl_audit_visitor_layout_v1';
const VISITOR_SIZE_KEY = 'sl_audit_visitor_size_v1';
const metricSizePresets: MetricSizePreset[] = ['compact', 'standard', 'wide'];
const panelSizePresets: PanelSizePreset[] = ['standard', 'wide', 'tall', 'large'];

const actionLabelMap: Record<string, string> = {
  LOGIN: '登录',
  LOGOUT: '退出登录',
  SCAN_QR: '扫码访问',
  SMS_SEND: '短信验证',
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
  ADD_FAMILY_MEDICATION: '家属新增用药',
  UPDATE_FAMILY_MEDICATION: '家属修改用药',
  DELETE_FAMILY_MEDICATION: '家属删除用药',
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
  if (role === 'VISITOR' || role === 'SCAN_USER' || role === 'ANONYMOUS' || role === 'FAMILY') return 'visitor';

  const operator = (log.operator || '').toLowerCase();
  if (operator.includes('admin') || operator.includes('audit') || operator.includes('管理')) return 'admin';
  if (operator.includes('volunteer') || operator.includes('志愿者') || operator.includes('医护')) return 'medical';
  return 'visitor';
}

function categoryTitle(category: AuditCategory) {
  if (category === 'admin') return '管理员操作';
  if (category === 'medical') return '医护/志愿者操作';
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

function buildVisitorLayout(): VisitorLayoutState {
  return {
    order: VISITOR_WIDGETS.map((item) => item.id),
    hidden: [],
  };
}

function readVisitorLayout(): VisitorLayoutState {
  try {
    const raw = window.localStorage.getItem(VISITOR_LAYOUT_KEY);
    if (!raw) return buildVisitorLayout();
    const parsed = JSON.parse(raw) as Partial<VisitorLayoutState>;
    const validIds = new Set(VISITOR_WIDGETS.map((item) => item.id));
    const order = Array.isArray(parsed.order) ? parsed.order.filter((item): item is VisitorWidgetId => validIds.has(item)) : [];
    const hidden = Array.isArray(parsed.hidden)
      ? parsed.hidden.filter((item): item is VisitorWidgetId => validIds.has(item))
      : [];
    const missing = VISITOR_WIDGETS.map((item) => item.id).filter((item) => !order.includes(item));
    return { order: [...order, ...missing], hidden };
  } catch {
    return buildVisitorLayout();
  }
}

function readVisitorSizes(): VisitorSizeMap {
  const defaults = Object.fromEntries(VISITOR_WIDGETS.map((item) => [item.id, item.defaultSize])) as VisitorSizeMap;
  try {
    const raw = window.localStorage.getItem(VISITOR_SIZE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<VisitorSizeMap>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

function getVisitorWidgetConfig(widgetId: VisitorWidgetId) {
  return VISITOR_WIDGETS.find((item) => item.id === widgetId)!;
}

function getSlotClassName(kind: WidgetKind, size: WidgetSizePreset) {
  return `dashboard-module-slot dashboard-module-slot--${kind}-${size}`;
}

function getNextSize(current: WidgetSizePreset, kind: WidgetKind, direction: 'smaller' | 'larger') {
  const presets = kind === 'metric' ? metricSizePresets : panelSizePresets;
  const index = presets.indexOf(current as never);
  if (index === -1) return current;
  if (direction === 'smaller') return presets[Math.max(0, index - 1)];
  return presets[Math.min(presets.length - 1, index + 1)];
}

export function AuditLogPage({ category }: { category: AuditCategory }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [elders, setElders] = useState<ElderRow[]>([]);
  const [filterResult, setFilterResult] = useState<string>('全部');
  const [filterAction, setFilterAction] = useState<string>('全部');
  const [filterOperator, setFilterOperator] = useState('');
  const [filterTarget, setFilterTarget] = useState('');
  const [filterIp, setFilterIp] = useState('');
  const [keyword, setKeyword] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedVisitorTarget, setSelectedVisitorTarget] = useState<{ log: AuditLog; elder: ElderRow } | null>(null);
  const [visitorLayout, setVisitorLayout] = useState<VisitorLayoutState>(() => (category === 'visitor' ? readVisitorLayout() : buildVisitorLayout()));
  const [visitorSizes, setVisitorSizes] = useState<VisitorSizeMap>(() => readVisitorSizes());
  const [draggingWidget, setDraggingWidget] = useState<VisitorWidgetId | null>(null);
  const [dragOverWidget, setDragOverWidget] = useState<VisitorWidgetId | null>(null);
  const columns = useTableColumnVisibility(`sl_columns_audit_${category}`, auditColumnOptions);
  const visitorSummaryColumns = useTableColumnVisibility('sl_columns_audit_visitor_summary', visitorSummaryColumnOptions);

  useEffect(() => {
    Promise.all([fetchAuditLogs(), fetchElders()])
      .then(([auditRows, elderRows]) => {
        setLogs(auditRows);
        setElders(elderRows);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (category !== 'visitor') return;
    window.localStorage.setItem(VISITOR_LAYOUT_KEY, JSON.stringify(visitorLayout));
  }, [category, visitorLayout]);

  useEffect(() => {
    if (category !== 'visitor') return;
    window.localStorage.setItem(VISITOR_SIZE_KEY, JSON.stringify(visitorSizes));
  }, [category, visitorSizes]);

  const actions = Array.from(new Set(logs.map((item) => item.action).filter(Boolean)));

  const filtered = useMemo(() => {
    const operatorKeyword = filterOperator.trim().toLowerCase();
    const targetKeyword = filterTarget.trim().toLowerCase();
    const ipKeyword = filterIp.trim().toLowerCase();
    const searchKeyword = keyword.trim().toLowerCase();

    return logs.filter((log) => {
      const matchCategory = getLogGroup(log) === category;
      const matchResult = filterResult === '全部' || log.result === filterResult;
      const matchAction = filterAction === '全部' || log.action === filterAction;

      const logDate = log.time.slice(0, 10);
      const matchFrom = !dateFrom || logDate >= dateFrom;
      const matchTo = !dateTo || logDate <= dateTo;

      const displayOperator = getDisplayOperator(log, category).toLowerCase();
      const matchOperator = !operatorKeyword || displayOperator.includes(operatorKeyword);
      const matchTarget = !targetKeyword || (log.target || '').toLowerCase().includes(targetKeyword);
      const matchIp = !ipKeyword || (log.ip || '').toLowerCase().includes(ipKeyword);

      const combinedSearch = [log.operator, displayOperator, log.action, log.target, log.ip, log.result, log.role || '']
        .join(' ')
        .toLowerCase();
      const matchKeyword = !searchKeyword || combinedSearch.includes(searchKeyword);

      return (
        matchCategory &&
        matchResult &&
        matchAction &&
        matchFrom &&
        matchTo &&
        matchOperator &&
        matchTarget &&
        matchIp &&
        matchKeyword
      );
    });
  }, [category, dateFrom, dateTo, filterAction, filterIp, filterOperator, filterResult, filterTarget, keyword, logs]);

  const abnormalCount = filtered.filter((item) => item.result === '失败').length;
  const successCount = filtered.filter((item) => item.result === '成功').length;
  const uniqueIpCount = new Set(filtered.map((item) => item.ip).filter(Boolean)).size;
  const visitorActionCounts = useMemo(() => groupCount(filtered, (item) => getActionLabel(item.action || '')), [filtered]);
  const visitorTargetCounts = useMemo(
    () => groupCount(filtered, (item) => resolveVisitorTarget(item, elders).label || '未标记对象'),
    [elders, filtered],
  );
  const visitorDailyCounts = useMemo(() => groupCount(filtered, (item) => item.time?.slice(0, 10) || '未标记日期'), [filtered]);
  const latestVisitorLogs = useMemo(() => [...filtered].sort((a, b) => b.time.localeCompare(a.time)).slice(0, 6), [filtered]);

  function handleExport() {
    exportAuditLogs(filtered, `audit-${category}-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  function resetFilters() {
    setFilterResult('全部');
    setFilterAction('全部');
    setFilterOperator('');
    setFilterTarget('');
    setFilterIp('');
    setKeyword('');
    setDateFrom('');
    setDateTo('');
  }

  function resetVisitorLayout() {
    setVisitorLayout(buildVisitorLayout());
    setVisitorSizes(readVisitorSizes());
    setDraggingWidget(null);
    setDragOverWidget(null);
  }

  function hideVisitorWidget(widgetId: VisitorWidgetId) {
    setVisitorLayout((current) =>
      current.hidden.includes(widgetId) ? current : { ...current, hidden: [...current.hidden, widgetId] },
    );
  }

  function resizeVisitorWidget(widgetId: VisitorWidgetId, direction: 'smaller' | 'larger') {
    const config = getVisitorWidgetConfig(widgetId);
    setVisitorSizes((current) => ({
      ...current,
      [widgetId]: getNextSize(current[widgetId], config.kind, direction),
    }));
  }

  function moveVisitorWidget(dragId: VisitorWidgetId, targetId: VisitorWidgetId) {
    if (dragId === targetId) return;
    setVisitorLayout((current) => {
      const visibleOrder = current.order.filter((item) => !current.hidden.includes(item));
      const sourceIndex = visibleOrder.indexOf(dragId);
      const targetIndex = visibleOrder.indexOf(targetId);
      if (sourceIndex === -1 || targetIndex === -1) return current;
      const nextVisible = [...visibleOrder];
      nextVisible.splice(sourceIndex, 1);
      nextVisible.splice(targetIndex, 0, dragId);
      const hiddenSet = new Set(current.hidden);
      const nextOrder = [...nextVisible, ...current.order.filter((item) => hiddenSet.has(item))];
      return { ...current, order: nextOrder };
    });
  }

  const operatorHeader = category === 'visitor' ? '手机号' : '操作人';
  const operatorPlaceholder = category === 'visitor' ? '筛选手机号' : '筛选操作人';
  const mainColSpan = auditColumnOptions.filter((option) => columns.isVisible(option.key)).length;
  const visitorSummaryColSpan = visitorSummaryColumnOptions.filter((option) => visitorSummaryColumns.isVisible(option.key)).length;
  const visibleVisitorWidgets = visitorLayout.order.filter((widgetId) => !visitorLayout.hidden.includes(widgetId));

  function renderVisitorWidget(widgetId: VisitorWidgetId): ReactNode {
    switch (widgetId) {
      case 'metric-total':
        return (
          <article className="metric-card dashboard-module">
            <p className="metric-label">访问记录数</p>
            <strong className="metric-value">{filtered.length}</strong>
            <span className="metric-trend">当前筛选条件下的访问行为</span>
          </article>
        );
      case 'metric-success':
        return (
          <article className="metric-card dashboard-module">
            <p className="metric-label">成功访问</p>
            <strong className="metric-value">{successCount}</strong>
            <span className="metric-trend">{formatPercent(successCount, filtered.length)} 成功率</span>
          </article>
        );
      case 'metric-fail':
        return (
          <article className="metric-card dashboard-module">
            <p className="metric-label">失败访问</p>
            <strong className="metric-value">{abnormalCount}</strong>
            <span className="metric-trend">{formatPercent(abnormalCount, filtered.length)} 失败占比</span>
          </article>
        );
      case 'metric-ip':
        return (
          <article className="metric-card dashboard-module">
            <p className="metric-label">来源 IP 数</p>
            <strong className="metric-value">{uniqueIpCount}</strong>
            <span className="metric-trend">按当前访问记录去重</span>
          </article>
        );
      case 'action-distribution':
        return (
          <article className="panel analytics-card dashboard-module audit-scroll-panel">
            <div className="panel-title">
              <ClipboardList size={18} />
              <h3>访问类型分布</h3>
            </div>
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
          </article>
        );
      case 'target-distribution':
        return (
          <article className="panel analytics-card dashboard-module">
            <div className="panel-title">
              <ClipboardList size={18} />
              <h3>访问对象分布</h3>
            </div>
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
          </article>
        );
      case 'daily-distribution':
        return (
          <article className="panel analytics-card dashboard-module">
            <div className="panel-title">
              <ClipboardList size={18} />
              <h3>按日期统计</h3>
            </div>
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
          </article>
        );
      case 'recent-visitor':
        return (
          <article className="panel analytics-card dashboard-module">
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
                  {visitorSummaryColumns.isVisible('operator') && <th>{operatorHeader}</th>}
                  {visitorSummaryColumns.isVisible('action') && <th>类型</th>}
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
                      {visitorSummaryColumns.isVisible('operator') && <td>{getDisplayOperator(log, category)}</td>}
                      {visitorSummaryColumns.isVisible('action') && <td>{getActionLabel(log.action)}</td>}
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
            <div className="rbac-summary-table-wrap audit-scroll-table-wrap audit-scroll-table-wrap--main">
              <table className="data-table">
                <thead>
                  <tr>
                    {columns.isVisible('time') && <th>时间</th>}
                    {columns.isVisible('operator') && <th>{operatorHeader}</th>}
                    {columns.isVisible('action') && <th>类型</th>}
                    {columns.isVisible('target') && <th>对象</th>}
                    {columns.isVisible('ip') && <th>来源 IP</th>}
                    {columns.isVisible('result') && <th>结果</th>}
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
                        {columns.isVisible('time') && <td>{formatTime(log.time)}</td>}
                        {columns.isVisible('operator') && <td>{getDisplayOperator(log, category)}</td>}
                        {columns.isVisible('action') && <td>{getActionLabel(log.action)}</td>}
                        {columns.isVisible('target') && (
                          <td>
                            {category === 'visitor'
                              ? (() => {
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
                                })()
                              : log.target}
                          </td>
                        )}
                        {columns.isVisible('ip') && <td>{log.ip}</td>}
                        {columns.isVisible('result') && (
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
      default:
        return null;
    }
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">审计与合规</p>
          <h2>{categoryTitle(category)}</h2>
        </div>
      </header>

      <section className={category === 'visitor' ? 'panel audit-visitor-shell' : 'panel'} style={{ marginTop: 14 }}>
        {abnormalCount > 0 && (
          <div className="alert-bar">
            <AlertTriangle size={16} />
            <span>当前分类下有 {abnormalCount} 条失败记录，请重点检查来源 IP 和操作内容。</span>
          </div>
        )}

        <div className="toolbar">
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <span>至</span>
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          <input placeholder={operatorPlaceholder} value={filterOperator} onChange={(event) => setFilterOperator(event.target.value)} />
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
          <select value={filterResult} onChange={(event) => setFilterResult(event.target.value)}>
            <option>全部</option>
            <option>成功</option>
            <option>失败</option>
          </select>
          <input placeholder="关键词搜索" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          <button onClick={() => undefined}>查询</button>
          <button className="secondary" onClick={resetFilters}>重置</button>
          <button className="secondary" onClick={handleExport}>导出</button>
          <TableColumnMenu options={auditColumnOptions} isVisible={columns.isVisible} onToggle={columns.toggle} onReset={columns.reset} />
        </div>

        {category === 'visitor' ? (
          <>
            <section className="dashboard-module-grid audit-visitor-grid">
              {visibleVisitorWidgets.map((widgetId) => {
                const config = getVisitorWidgetConfig(widgetId);
                const widgetSize = visitorSizes[widgetId];
                const isDragging = draggingWidget === widgetId;
                const isDropTarget = dragOverWidget === widgetId && draggingWidget !== widgetId;
                return (
                  <section
                    key={widgetId}
                    className={`${getSlotClassName(config.kind, widgetSize)}${isDragging ? ' dashboard-module-slot--dragging' : ''}${isDropTarget ? ' dashboard-module-slot--drop-target' : ''}`}
                    draggable
                    onDragStart={() => {
                      setDraggingWidget(widgetId);
                      setDragOverWidget(widgetId);
                    }}
                    onDragEnd={() => {
                      setDraggingWidget(null);
                      setDragOverWidget(null);
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDragEnter={() => {
                      if (!draggingWidget || draggingWidget === widgetId) return;
                      setDragOverWidget(widgetId);
                      moveVisitorWidget(draggingWidget, widgetId);
                    }}
                    onDrop={() => {
                      setDraggingWidget(null);
                      setDragOverWidget(null);
                    }}
                  >
                    <div className="dashboard-module-actions">
                      <button className="secondary" type="button" onClick={() => hideVisitorWidget(widgetId)} title="隐藏模块">
                        <X size={14} />
                      </button>
                    </div>
                    {renderVisitorWidget(widgetId)}
                    <button
                      className="dashboard-resize-handle dashboard-resize-handle--left"
                      type="button"
                      title="缩小一档"
                      aria-label="缩小一档"
                      onClick={() => resizeVisitorWidget(widgetId, 'smaller')}
                      disabled={getNextSize(widgetSize, config.kind, 'smaller') === widgetSize}
                    />
                    <button
                      className="dashboard-resize-handle dashboard-resize-handle--right"
                      type="button"
                      title="放大一档"
                      aria-label="放大一档"
                      onClick={() => resizeVisitorWidget(widgetId, 'larger')}
                      disabled={getNextSize(widgetSize, config.kind, 'larger') === widgetSize}
                    />
                  </section>
                );
              })}
            </section>

            <button className="dashboard-floating-reset" type="button" onClick={resetVisitorLayout}>
              <RotateCcw size={16} />
              重置布局
            </button>
          </>
        ) : (
          <>
            <div className="panel-title">
              <ClipboardList size={18} />
              <h3>{categoryTitle(category)}</h3>
            </div>

            <p style={{ margin: '0 0 12px', color: 'var(--color-text-secondary)', fontSize: 13 }}>共 {filtered.length} 条记录</p>

            <div className="rbac-summary-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    {columns.isVisible('time') && <th>时间</th>}
                    {columns.isVisible('operator') && <th>{operatorHeader}</th>}
                    {columns.isVisible('action') && <th>类型</th>}
                    {columns.isVisible('target') && <th>对象</th>}
                    {columns.isVisible('ip') && <th>来源 IP</th>}
                    {columns.isVisible('result') && <th>结果</th>}
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
                        {columns.isVisible('time') && <td>{formatTime(log.time)}</td>}
                        {columns.isVisible('operator') && <td>{getDisplayOperator(log, category)}</td>}
                        {columns.isVisible('action') && <td>{getActionLabel(log.action)}</td>}
                        {columns.isVisible('target') && <td>{log.target}</td>}
                        {columns.isVisible('ip') && <td>{log.ip}</td>}
                        {columns.isVisible('result') && (
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
          </>
        )}
      </section>

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
