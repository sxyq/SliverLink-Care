import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  BarChart3,
  ClipboardList,
  EyeOff,
  RotateCcw,
  ShieldCheck,
  UsersRound,
  X,
} from 'lucide-react';
import { TableColumnMenu, useTableColumnVisibility, type TableColumnOption } from '../components/TableColumnMenu';
import {
  fetchAllScales,
  fetchAuditLogs,
  fetchElders,
  fetchFamilyBindings,
  fetchInvitations,
  fetchMedications,
  fetchQrCodes,
  fetchVolunteers,
} from '../api/adminApi';
import type {
  AuditLog,
  DashboardMetric,
  ElderRow,
  FamilyBindingRow,
  InvitationRow,
  MedicationRow,
  QrCodeRow,
  ScaleRecordRow,
  VolunteerRow,
} from '../types';

type DashboardWidgetId =
  | 'metric-elders'
  | 'metric-volunteers'
  | 'metric-qrcodes'
  | 'metric-audits'
  | 'metric-scales'
  | 'elder-overview'
  | 'health-overview'
  | 'scale-overview'
  | 'qr-family-overview'
  | 'people-overview'
  | 'visitor-overview'
  | 'audit-overview'
  | 'latest-audits';

type WidgetKind = 'metric' | 'panel';
type MetricSizePreset = 'compact' | 'standard' | 'wide';
type PanelSizePreset = 'standard' | 'wide' | 'tall' | 'large';
type WidgetSizePreset = MetricSizePreset | PanelSizePreset;

type DashboardWidgetConfig = {
  id: DashboardWidgetId;
  title: string;
  kind: WidgetKind;
  defaultSize: WidgetSizePreset;
};

type DashboardAuditColumnKey = 'time' | 'operator' | 'action' | 'result';

type DashboardSnapshot = {
  elders: ElderRow[];
  volunteers: VolunteerRow[];
  qrCodes: QrCodeRow[];
  invitations: InvitationRow[];
  familyBindings: FamilyBindingRow[];
  medications: MedicationRow[];
  scales: ScaleRecordRow[];
  auditLogs: AuditLog[];
};

type DashboardLayoutState = {
  order: DashboardWidgetId[];
  hidden: DashboardWidgetId[];
};

type DashboardSizeMap = Record<DashboardWidgetId, WidgetSizePreset>;

const DASHBOARD_WIDGETS: DashboardWidgetConfig[] = [
  { id: 'metric-elders', title: '老人档案', kind: 'metric', defaultSize: 'compact' },
  { id: 'metric-volunteers', title: '志愿者账号', kind: 'metric', defaultSize: 'compact' },
  { id: 'metric-qrcodes', title: '二维码', kind: 'metric', defaultSize: 'compact' },
  { id: 'metric-audits', title: '操作日志', kind: 'metric', defaultSize: 'compact' },
  { id: 'metric-scales', title: '量表记录', kind: 'metric', defaultSize: 'compact' },
  { id: 'elder-overview', title: '老人管理概览', kind: 'panel', defaultSize: 'standard' },
  { id: 'health-overview', title: '健康记录概览', kind: 'panel', defaultSize: 'standard' },
  { id: 'scale-overview', title: '量表结果统计', kind: 'panel', defaultSize: 'standard' },
  { id: 'qr-family-overview', title: '二维码与家属协管', kind: 'panel', defaultSize: 'standard' },
  { id: 'people-overview', title: '人员与权限概览', kind: 'panel', defaultSize: 'standard' },
  { id: 'visitor-overview', title: '访问人员统计', kind: 'panel', defaultSize: 'standard' },
  { id: 'audit-overview', title: '操作日志概览', kind: 'panel', defaultSize: 'standard' },
  { id: 'latest-audits', title: '最近操作记录', kind: 'panel', defaultSize: 'wide' },
];

const DASHBOARD_LAYOUT_KEY = 'sl_admin_dashboard_layout_v2';
const DASHBOARD_SIZE_KEY = 'sl_admin_dashboard_size_v2';
const DASHBOARD_SNAPSHOT_KEY = 'sl_admin_dashboard_snapshot_v1';

const dashboardAuditColumnOptions: TableColumnOption<DashboardAuditColumnKey>[] = [
  { key: 'time', label: '时间', defaultVisible: true },
  { key: 'operator', label: '操作人', defaultVisible: true },
  { key: 'action', label: '类型', defaultVisible: true },
  { key: 'result', label: '结果', defaultVisible: true },
];

const metricSizePresets: MetricSizePreset[] = ['compact', 'standard', 'wide'];
const panelSizePresets: PanelSizePreset[] = ['standard', 'wide', 'tall', 'large'];

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

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function getAuditGroup(log: AuditLog) {
  const role = (log.role || '').toUpperCase();
  if (role === 'SYSTEM_ADMIN') return '管理员';
  if (role === 'VOLUNTEER') return '医护/志愿者';
  if (role === 'VISITOR' || role === 'SCAN_USER' || role === 'ANONYMOUS' || role === 'FAMILY') return '访问人员';

  const operator = (log.operator || '').toLowerCase();
  if (operator.includes('admin') || operator.includes('audit') || operator.includes('管理')) return '管理员';
  if (operator.includes('volunteer') || operator.includes('志愿者') || operator.includes('医护')) return '医护/志愿者';
  return '访问人员';
}

function normalizeScaleName(scaleName: string) {
  const raw = scaleName.trim().toUpperCase();
  if (raw.includes('PHQ')) return 'PHQ-9';
  if (raw.includes('GAD')) return 'GAD-7';
  if (raw.includes('UCLA')) return 'UCLA';
  return scaleName || '未分类';
}

function getScaleRiskLabel(scaleName: string, score: number) {
  const normalized = normalizeScaleName(scaleName);
  if (normalized === 'PHQ-9') {
    if (score >= 20) return 'PHQ-9 / 重度风险';
    if (score >= 15) return 'PHQ-9 / 中重度风险';
    if (score >= 10) return 'PHQ-9 / 中度风险';
    if (score >= 5) return 'PHQ-9 / 轻度风险';
    return 'PHQ-9 / 低风险';
  }
  if (normalized === 'GAD-7') {
    if (score >= 15) return 'GAD-7 / 重度风险';
    if (score >= 10) return 'GAD-7 / 中度风险';
    if (score >= 5) return 'GAD-7 / 轻度风险';
    return 'GAD-7 / 低风险';
  }
  if (normalized === 'UCLA') {
    if (score >= 49) return 'UCLA / 高关注';
    if (score >= 35) return 'UCLA / 中关注';
    return 'UCLA / 低关注';
  }
  return `${normalized} / 待评估`;
}

function getVisitorPhone(log: AuditLog) {
  const phonePattern = /1[3-9]\d{9}|1[3-9]\d\*{4}\d{4}/;
  const operatorMatch = log.operator.match(phonePattern);
  if (operatorMatch) return operatorMatch[0];
  const targetMatch = log.target.match(phonePattern);
  if (targetMatch) return targetMatch[0];
  return '';
}

function formatDateTime(value: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    LOGIN: '登录',
    LOGOUT: '退出登录',
    SCAN_QR: '扫码访问',
    SMS_SEND: '短信验证',
    GENERATE_QR: '生成二维码',
    DISABLE_QR: '停用二维码',
    REGENERATE_QR: '重新生成二维码',
    CREATE_VOLUNTEER: '新增志愿者',
    UPDATE_VOLUNTEER_SCOPE: '调整负责老人',
    SAVE_SCALE_RECORDS: '保存量表记录',
  };
  return map[action] || action;
}

function buildDefaultLayout(): DashboardLayoutState {
  return {
    order: DASHBOARD_WIDGETS.map((item) => item.id),
    hidden: [],
  };
}

function readDashboardLayout(): DashboardLayoutState {
  try {
    const raw = window.localStorage.getItem(DASHBOARD_LAYOUT_KEY);
    if (!raw) return buildDefaultLayout();

    const parsed = JSON.parse(raw) as Partial<DashboardLayoutState>;
    const validIds = new Set(DASHBOARD_WIDGETS.map((item) => item.id));
    const order = Array.isArray(parsed.order) ? parsed.order.filter((item): item is DashboardWidgetId => validIds.has(item)) : [];
    const hidden = Array.isArray(parsed.hidden)
      ? parsed.hidden.filter((item): item is DashboardWidgetId => validIds.has(item))
      : [];
    const missing = DASHBOARD_WIDGETS.map((item) => item.id).filter((item) => !order.includes(item));

    return {
      order: [...order, ...missing],
      hidden,
    };
  } catch {
    return buildDefaultLayout();
  }
}

function readDashboardSizes(): DashboardSizeMap {
  const defaults = Object.fromEntries(DASHBOARD_WIDGETS.map((item) => [item.id, item.defaultSize])) as DashboardSizeMap;
  try {
    const raw = window.localStorage.getItem(DASHBOARD_SIZE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<DashboardSizeMap>;
    return {
      ...defaults,
      ...parsed,
    };
  } catch {
    return defaults;
  }
}

function readDashboardSnapshot(): DashboardSnapshot | null {
  try {
    const raw = window.sessionStorage.getItem(DASHBOARD_SNAPSHOT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DashboardSnapshot;
  } catch {
    return null;
  }
}

function getWidgetConfig(widgetId: DashboardWidgetId) {
  return DASHBOARD_WIDGETS.find((item) => item.id === widgetId)!;
}

function getNextSize(current: WidgetSizePreset, kind: WidgetKind, direction: 'smaller' | 'larger'): WidgetSizePreset {
  const presets = kind === 'metric' ? metricSizePresets : panelSizePresets;
  const index = presets.indexOf(current as never);
  if (index === -1) return presets[0];
  if (direction === 'smaller') return presets[Math.max(index - 1, 0)];
  return presets[Math.min(index + 1, presets.length - 1)];
}

function getSlotClassName(kind: WidgetKind, size: WidgetSizePreset) {
  if (kind === 'metric') return `dashboard-module-slot dashboard-module-slot--metric dashboard-module-slot--metric-${size}`;
  return `dashboard-module-slot dashboard-module-slot--panel dashboard-module-slot--panel-${size}`;
}

function renderBarList(
  entries: Array<{ label: string; value: number; total: number; tone?: 'default' | 'teal' | 'gold' | 'rose' }>,
) {
  return (
    <div className="bar-list">
      {entries.map((item) => (
        <div key={item.label} className="bar-row">
          <div className="bar-meta">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
          <div className="bar-track">
            <div
              className={`bar-fill${item.tone === 'teal' ? ' bar-fill--teal' : ''}${item.tone === 'gold' ? ' bar-fill--gold' : ''}${item.tone === 'rose' ? ' bar-fill--rose' : ''}`}
              style={{ width: formatPercent(item.value, item.total) }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const snapshot = useMemo(() => readDashboardSnapshot(), []);
  const [elders, setElders] = useState<ElderRow[]>(() => snapshot?.elders || []);
  const [volunteers, setVolunteers] = useState<VolunteerRow[]>(() => snapshot?.volunteers || []);
  const [qrCodes, setQrCodes] = useState<QrCodeRow[]>(() => snapshot?.qrCodes || []);
  const [invitations, setInvitations] = useState<InvitationRow[]>(() => snapshot?.invitations || []);
  const [familyBindings, setFamilyBindings] = useState<FamilyBindingRow[]>(() => snapshot?.familyBindings || []);
  const [medications, setMedications] = useState<MedicationRow[]>(() => snapshot?.medications || []);
  const [scales, setScales] = useState<ScaleRecordRow[]>(() => snapshot?.scales || []);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => snapshot?.auditLogs || []);
  const [error, setError] = useState('');
  const [widgetOrder, setWidgetOrder] = useState<DashboardWidgetId[]>(() => readDashboardLayout().order);
  const [hiddenWidgets, setHiddenWidgets] = useState<DashboardWidgetId[]>(() => readDashboardLayout().hidden);
  const [widgetSizes, setWidgetSizes] = useState<DashboardSizeMap>(() => readDashboardSizes());
  const [draggingWidget, setDraggingWidget] = useState<DashboardWidgetId | null>(null);
  const [dragOverWidget, setDragOverWidget] = useState<DashboardWidgetId | null>(null);
  const dashboardAuditColumns = useTableColumnVisibility('sl_columns_dashboard_latest_audits', dashboardAuditColumnOptions);

  useEffect(() => {
    window.localStorage.setItem(
      DASHBOARD_LAYOUT_KEY,
      JSON.stringify({
        order: widgetOrder,
        hidden: hiddenWidgets,
      }),
    );
  }, [hiddenWidgets, widgetOrder]);

  useEffect(() => {
    window.localStorage.setItem(DASHBOARD_SIZE_KEY, JSON.stringify(widgetSizes));
  }, [widgetSizes]);

  useEffect(() => {
    window.sessionStorage.setItem(
      DASHBOARD_SNAPSHOT_KEY,
      JSON.stringify({
        elders,
        volunteers,
        qrCodes,
        invitations,
        familyBindings,
        medications,
        scales,
        auditLogs,
      } satisfies DashboardSnapshot),
    );
  }, [auditLogs, elders, familyBindings, invitations, medications, qrCodes, scales, volunteers]);

  useEffect(() => {
    let active = true;
    let deferredTimer: number | null = null;

    async function load() {
      const elderRowsPromise = fetchElders();
      const volunteerRowsPromise = fetchVolunteers();
      const qrRowsPromise = fetchQrCodes();
      const auditRowsPromise = fetchAuditLogs();
      const invitationRowsPromise = fetchInvitations();
      const familyRowsPromise = fetchFamilyBindings();
      const medicationRowsPromise = fetchMedications();

      const [elderRows, volunteerRows, qrRows, auditRows] = await Promise.all([
        elderRowsPromise,
        volunteerRowsPromise,
        qrRowsPromise,
        auditRowsPromise,
      ]);

      if (!active) return;
      setElders(elderRows);
      setVolunteers(volunteerRows);
      setQrCodes(qrRows);
      setAuditLogs(auditRows);
      setError('');

      deferredTimer = window.setTimeout(async () => {
        try {
          const [invitationRows, familyRows, medicationRows, scaleRows] = await Promise.all([
            invitationRowsPromise,
            familyRowsPromise,
            medicationRowsPromise,
            fetchAllScales(elderRows),
          ]);

          if (!active) return;
          setInvitations(invitationRows);
          setFamilyBindings(familyRows);
          setMedications(medicationRows);
          setScales(scaleRows);
        } catch (loadError) {
          if (!active) return;
          setError(loadError instanceof Error ? loadError.message : '加载失败');
        }
      }, 0);
    }

    load().catch((loadError) => {
      if (!active) return;
      setError(loadError instanceof Error ? loadError.message : '加载失败');
    });

    return () => {
      active = false;
      if (deferredTimer) window.clearTimeout(deferredTimer);
    };
  }, []);

  const dashboardMetrics = useMemo<DashboardMetric[]>(
    () => [
      { label: '老人档案', value: String(elders.length), trend: '实时数据' },
      { label: '志愿者账号', value: String(volunteers.length), trend: '实时数据' },
      { label: '二维码', value: String(qrCodes.length), trend: '加密 token' },
      { label: '操作日志', value: String(auditLogs.length), trend: '可审计' },
      { label: '量表记录', value: String(scales.length), trend: 'PHQ-9 / GAD-7 / UCLA' },
    ],
    [auditLogs.length, elders.length, qrCodes.length, scales.length, volunteers.length],
  );

  const ageGroups = useMemo(() => {
    const counters = { '60-69岁': 0, '70-79岁': 0, '80-89岁': 0, '90岁以上': 0 };
    elders.forEach((elder) => {
      if (elder.age >= 90) counters['90岁以上'] += 1;
      else if (elder.age >= 80) counters['80-89岁'] += 1;
      else if (elder.age >= 70) counters['70-79岁'] += 1;
      else counters['60-69岁'] += 1;
    });
    return counters;
  }, [elders]);

  const elderStatusCounts = useMemo(() => groupCount(elders, (item) => item.status), [elders]);
  const volunteerStatusCounts = useMemo(() => groupCount(volunteers, (item) => item.status), [volunteers]);
  const qrStatusCounts = useMemo(() => groupCount(qrCodes, (item) => item.status), [qrCodes]);
  const invitationStatusCounts = useMemo(() => groupCount(invitations, (item) => item.status), [invitations]);
  const auditGroupCounts = useMemo(() => groupCount(auditLogs, (item) => getAuditGroup(item)), [auditLogs]);
  const scaleCounts = useMemo(() => groupCount(scales, (item) => normalizeScaleName(item.scaleName)), [scales]);
  const scaleRiskCounts = useMemo(() => groupCount(scales, (item) => getScaleRiskLabel(item.scaleName, item.score)), [scales]);
  const scaleAverageByName = useMemo(() => {
    const buckets = new Map<string, number[]>();
    scales.forEach((item) => {
      const label = normalizeScaleName(item.scaleName);
      const values = buckets.get(label) || [];
      values.push(item.score);
      buckets.set(label, values);
    });
    return Array.from(buckets.entries()).map(([label, values]) => ({ label, value: average(values) }));
  }, [scales]);

  const visitorLogs = useMemo(() => auditLogs.filter((item) => getAuditGroup(item) === '访问人员'), [auditLogs]);
  const visitorActionCounts = useMemo(() => groupCount(visitorLogs, (item) => actionLabel(item.action)), [visitorLogs]);
  const visitorResultCounts = useMemo(() => groupCount(visitorLogs, (item) => item.result), [visitorLogs]);
  const visitorTargetCounts = useMemo(() => groupCount(visitorLogs, (item) => item.target), [visitorLogs]);
  const visitorPhones = useMemo(() => Array.from(new Set(visitorLogs.map((item) => getVisitorPhone(item)).filter(Boolean))), [visitorLogs]);
  const visitorIpCount = useMemo(() => new Set(visitorLogs.map((item) => item.ip).filter(Boolean)).size, [visitorLogs]);

  const avgVolunteerScope = useMemo(() => average(volunteers.map((item) => item.elderCount)), [volunteers]);
  const avgScaleScore = useMemo(() => average(scales.map((item) => item.score)), [scales]);
  const uniqueMedicationElders = useMemo(() => new Set(medications.map((item) => item.elderId || item.archiveNo)).size, [medications]);
  const latestAudits = useMemo(() => auditLogs.slice(0, 8), [auditLogs]);
  const activeFamilyBindingCount = useMemo(() => familyBindings.filter((item) => item.status === '已绑定').length, [familyBindings]);

  const visibleWidgets = useMemo(
    () => widgetOrder.filter((widgetId) => !hiddenWidgets.includes(widgetId)),
    [hiddenWidgets, widgetOrder],
  );

  function hideWidget(widgetId: DashboardWidgetId) {
    setHiddenWidgets((current) => (current.includes(widgetId) ? current : [...current, widgetId]));
  }

  function resetLayout() {
    setWidgetOrder(DASHBOARD_WIDGETS.map((item) => item.id));
    setHiddenWidgets([]);
    setWidgetSizes(Object.fromEntries(DASHBOARD_WIDGETS.map((item) => [item.id, item.defaultSize])) as DashboardSizeMap);
  }

  function moveWidgetToPosition(sourceId: DashboardWidgetId, targetId: DashboardWidgetId) {
    if (sourceId === targetId) return;
    setWidgetOrder((current) => {
      const sourceIndex = current.indexOf(sourceId);
      const targetIndex = current.indexOf(targetId);
      if (sourceIndex === -1 || targetIndex === -1) return current;
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  function resizeWidget(widgetId: DashboardWidgetId, direction: 'smaller' | 'larger') {
    const config = getWidgetConfig(widgetId);
    setWidgetSizes((current) => {
      const currentSize = current[widgetId] || config.defaultSize;
      return {
        ...current,
        [widgetId]: getNextSize(currentSize, config.kind, direction),
      };
    });
  }

  function renderMetricCard(metricLabel: string) {
    const metric = dashboardMetrics.find((item) => item.label === metricLabel);
    if (!metric) return null;

    return (
      <article className="metric-card dashboard-module dashboard-module--metric">
        <p className="metric-label">{metric.label}</p>
        <strong className="metric-value">{metric.value}</strong>
        <span className="metric-trend">{metric.trend}</span>
      </article>
    );
  }

  function renderPanel(title: string, icon: ReactNode, content: ReactNode) {
    return (
      <article className="panel analytics-card dashboard-module dashboard-module--panel">
        <div className="panel-title">
          {icon}
          <h3>{title}</h3>
        </div>
        {content}
      </article>
    );
  }

  function renderWidget(widgetId: DashboardWidgetId) {
    switch (widgetId) {
      case 'metric-elders':
        return renderMetricCard('老人档案');
      case 'metric-volunteers':
        return renderMetricCard('志愿者账号');
      case 'metric-qrcodes':
        return renderMetricCard('二维码');
      case 'metric-audits':
        return renderMetricCard('操作日志');
      case 'metric-scales':
        return renderMetricCard('量表记录');
      case 'elder-overview':
        return renderPanel(
          '老人管理概览',
          <UsersRound size={18} />,
          <>
            {renderBarList(
              Object.entries(ageGroups).map(([label, value]) => ({
                label,
                value,
                total: elders.length,
              })),
            )}
            <div className="score-chip-grid" style={{ marginTop: 14 }}>
              {Object.entries(elderStatusCounts).map(([label, value]) => (
                <div key={label} className="score-chip">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </>,
        );
      case 'health-overview':
        return renderPanel(
          '健康记录概览',
          <ShieldCheck size={18} />,
          <>
            <div className="score-chip-grid">
              <div className="score-chip">
                <span>用药记录数</span>
                <strong>{medications.length}</strong>
              </div>
              <div className="score-chip">
                <span>有用药老人</span>
                <strong>{uniqueMedicationElders}</strong>
              </div>
              <div className="score-chip">
                <span>量表平均分</span>
                <strong>{avgScaleScore}</strong>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              {renderBarList(
                Object.entries(scaleCounts).map(([label, value]) => ({
                  label,
                  value,
                  total: scales.length,
                })),
              )}
            </div>
          </>,
        );
      case 'scale-overview':
        return renderPanel(
          '量表结果统计',
          <ClipboardList size={18} />,
          <>
            <div className="score-chip-grid">
              {scaleAverageByName.map((item) => (
                <div key={item.label} className="score-chip">
                  <span>{item.label} 平均分</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14 }}>
              {renderBarList(
                Object.entries(scaleRiskCounts).map(([label, value]) => ({
                  label,
                  value,
                  total: scales.length,
                  tone: 'rose',
                })),
              )}
            </div>
          </>,
        );
      case 'qr-family-overview':
        return renderPanel(
          '二维码与家属协管',
          <BarChart3 size={18} />,
          renderBarList([
            { label: '二维码 · 启用', value: qrStatusCounts['启用'] || 0, total: qrCodes.length, tone: 'gold' },
            { label: '二维码 · 已停用', value: qrStatusCounts['已停用'] || 0, total: qrCodes.length, tone: 'gold' },
            {
              label: '邀请码 · 未使用',
              value: invitationStatusCounts['未使用'] || 0,
              total: invitations.length || 1,
              tone: 'rose',
            },
          ]),
        );
      case 'people-overview':
        return renderPanel(
          '人员与权限概览',
          <ShieldCheck size={18} />,
          <>
            <div className="score-chip-grid">
              <div className="score-chip">
                <span>志愿者数量</span>
                <strong>{volunteers.length}</strong>
              </div>
              <div className="score-chip">
                <span>人均负责老人</span>
                <strong>{avgVolunteerScope}</strong>
              </div>
              <div className="score-chip">
                <span>有效绑定数</span>
                <strong>{activeFamilyBindingCount}</strong>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              {renderBarList(
                Object.entries(volunteerStatusCounts).map(([label, value]) => ({
                  label,
                  value,
                  total: volunteers.length,
                  tone: 'teal',
                })),
              )}
            </div>
          </>,
        );
      case 'visitor-overview':
        return renderPanel(
          '访问人员统计',
          <EyeOff size={18} />,
          <>
            <div className="score-chip-grid">
              <div className="score-chip">
                <span>访问记录数</span>
                <strong>{visitorLogs.length}</strong>
              </div>
              <div className="score-chip">
                <span>来源 IP 数</span>
                <strong>{visitorIpCount}</strong>
              </div>
              <div className="score-chip">
                <span>留痕手机号数</span>
                <strong>{visitorPhones.length}</strong>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              {renderBarList([
                ...Object.entries(visitorActionCounts).map(([label, value]) => ({
                  label: `行为 / ${label}`,
                  value,
                  total: visitorLogs.length,
                })),
                ...Object.entries(visitorResultCounts).map(([label, value]) => ({
                  label: `结果 / ${label}`,
                  value,
                  total: visitorLogs.length,
                  tone: 'gold' as const,
                })),
                ...Object.entries(visitorTargetCounts)
                  .slice(0, 3)
                  .map(([label, value]) => ({
                    label: `访问对象 / ${label}`,
                    value,
                    total: visitorLogs.length,
                    tone: 'teal' as const,
                  })),
              ])}
            </div>
          </>,
        );
      case 'audit-overview':
        return renderPanel(
          '操作日志概览',
          <BarChart3 size={18} />,
          renderBarList(
            Object.entries(auditGroupCounts).map(([label, value]) => ({
              label,
              value,
              total: auditLogs.length,
              tone: 'rose',
            })),
          ),
        );
      case 'latest-audits': {
        const colSpan = dashboardAuditColumnOptions.filter((option) => dashboardAuditColumns.isVisible(option.key)).length;
        return renderPanel(
          '最近操作记录',
          <ClipboardList size={18} />,
          <>
            <div className="toolbar" style={{ marginBottom: 10 }}>
              <TableColumnMenu
                options={dashboardAuditColumnOptions}
                isVisible={dashboardAuditColumns.isVisible}
                onToggle={dashboardAuditColumns.toggle}
                onReset={dashboardAuditColumns.reset}
              />
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  {dashboardAuditColumns.isVisible('time') && <th>时间</th>}
                  {dashboardAuditColumns.isVisible('operator') && <th>操作人</th>}
                  {dashboardAuditColumns.isVisible('action') && <th>类型</th>}
                  {dashboardAuditColumns.isVisible('result') && <th>结果</th>}
                </tr>
              </thead>
              <tbody>
                {latestAudits.length === 0 ? (
                  <tr>
                    <td colSpan={colSpan} style={{ color: 'var(--color-text-secondary)' }}>
                      暂无记录
                    </td>
                  </tr>
                ) : (
                  latestAudits.map((log, index) => (
                    <tr key={`${log.time}-${log.operator}-${index}`}>
                      {dashboardAuditColumns.isVisible('time') && <td>{formatDateTime(log.time)}</td>}
                      {dashboardAuditColumns.isVisible('operator') && <td>{log.operator || '-'}</td>}
                      {dashboardAuditColumns.isVisible('action') && <td>{actionLabel(log.action)}</td>}
                      {dashboardAuditColumns.isVisible('result') && <td>{log.result}</td>}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>,
        );
      }
      default:
        return null;
    }
  }

  return (
    <>
      <header className="topbar">
        <div>
          <h2>管理首页</h2>
        </div>
      </header>

      {error && <p className="form-error">{error}</p>}

      <section className="dashboard-module-grid">
        {visibleWidgets.map((widgetId) => {
          const config = getWidgetConfig(widgetId);
          const widgetSize = widgetSizes[widgetId] || config.defaultSize;
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
                moveWidgetToPosition(draggingWidget, widgetId);
              }}
              onDrop={() => {
                setDraggingWidget(null);
                setDragOverWidget(null);
              }}
            >
              <div className="dashboard-module-actions">
                <button className="secondary" type="button" onClick={() => hideWidget(widgetId)} title="隐藏模块">
                  <X size={14} />
                </button>
              </div>
              {renderWidget(widgetId)}
              <button
                className="dashboard-resize-handle dashboard-resize-handle--left"
                type="button"
                title="缩小一档"
                aria-label="缩小一档"
                onClick={() => resizeWidget(widgetId, 'smaller')}
                disabled={getNextSize(widgetSize, config.kind, 'smaller') === widgetSize}
              />
              <button
                className="dashboard-resize-handle dashboard-resize-handle--right"
                type="button"
                title="放大一档"
                aria-label="放大一档"
                onClick={() => resizeWidget(widgetId, 'larger')}
                disabled={getNextSize(widgetSize, config.kind, 'larger') === widgetSize}
              />
            </section>
          );
        })}
      </section>

      <button className="dashboard-floating-reset" type="button" onClick={resetLayout}>
        <RotateCcw size={16} />
        重置布局
      </button>
    </>
  );
}
