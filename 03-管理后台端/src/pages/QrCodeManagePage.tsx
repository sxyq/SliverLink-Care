import { useEffect, useMemo, useState } from 'react';
import { Download, QrCode, Settings2 } from 'lucide-react';
import QRCode from 'qrcode';
import { StatusTag } from '../components/StatusTag';
import { TableColumnMenu, useTableColumnVisibility, type TableColumnOption } from '../components/TableColumnMenu';
import { disableQrCode, downloadNameplatePdf, fetchQrCodes, fetchSmsRelayDevices, regenerateQrCode, updateQrCodeRelayDevice } from '../api/adminApi';
import type { QrCodeRow, SmsRelayDeviceRow } from '../types';
import { exportToCsv } from '../utils/exportCsv';

type QrColumnKey = 'basic' | 'status' | 'createdAt' | 'actions';

const ALL_STATUS = '全部状态';
const qrColumnOptions: TableColumnOption<QrColumnKey>[] = [
  { key: 'basic', label: '老人基本信息', defaultVisible: true },
  { key: 'status', label: '状态', defaultVisible: true },
  { key: 'createdAt', label: '创建时间', defaultVisible: true },
  { key: 'actions', label: '操作', required: true },
];

function renderBasicInfo(row: QrCodeRow) {
  const lines = [
    row.elderName ? `姓名：${row.elderName}` : '',
    row.elderAge != null ? `年龄：${row.elderAge}` : '',
    row.elderPhone ? `电话：${row.elderPhone}` : '',
  ].filter(Boolean);
  return lines.length > 0 ? lines.join(' / ') : '-';
}

function formatTime(value: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

function buildStableUrl(row: QrCodeRow) {
  return row.url ? String(row.url) : '';
}

function legacyCopyText(text: string) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  textarea.style.top = '0';
  textarea.style.left = '0';
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }

  document.body.removeChild(textarea);
  return copied;
}

export function QrCodeManagePage() {
  const [rows, setRows] = useState<QrCodeRow[]>([]);
  const [relayDevices, setRelayDevices] = useState<SmsRelayDeviceRow[]>([]);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS);
  const [selectedRow, setSelectedRow] = useState<QrCodeRow | null>(null);
  const [pendingAction, setPendingAction] = useState<'disable' | 'regenerate' | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewImage, setPreviewImage] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [bindingRelayDeviceId, setBindingRelayDeviceId] = useState('');
  const [bindingSaving, setBindingSaving] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const columns = useTableColumnVisibility('sl_columns_qrcodes', qrColumnOptions);

  async function load() {
    const [nextRows, nextRelayDevices] = await Promise.all([
      fetchQrCodes(),
      fetchSmsRelayDevices(),
    ]);
    setRows(nextRows);
    setRelayDevices(nextRelayDevices);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function ensurePreview() {
      if (!selectedRow) {
        setPreviewUrl('');
        setPreviewImage('');
        setPreviewError('');
        return;
      }

      const stableUrl = buildStableUrl(selectedRow);
      setPreviewLoading(true);
      setPreviewError('');
      setPreviewImage('');

      try {
        if (!stableUrl) {
          throw new Error('当前二维码尚未保存可用扫码链接；如需更换，请手动点击“重新生成二维码”。');
        }

        const image = await QRCode.toDataURL(stableUrl, { width: 220, margin: 1 });
        if (!cancelled) {
          setPreviewUrl(stableUrl);
          setPreviewImage(image);
        }
      } catch (error) {
        if (!cancelled) {
          setPreviewUrl('');
          setPreviewError(error instanceof Error ? error.message : '二维码加载失败');
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    }

    ensurePreview();
    return () => {
      cancelled = true;
    };
  }, [selectedRow]);

  useEffect(() => {
    setBindingRelayDeviceId(selectedRow?.relayDeviceId || '');
  }, [selectedRow]);

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        const text = `${row.id} ${row.archiveNo ?? ''} ${row.elderName ?? ''} ${row.elderPhone ?? ''} ${row.relayDeviceId ?? ''} ${row.relayReceiverPhone ?? ''}`;
        return (!keyword || text.includes(keyword)) && (statusFilter === ALL_STATUS || row.status === statusFilter);
      }),
    [keyword, rows, statusFilter],
  );

  async function handleDisable() {
    if (!selectedRow) return;
    setPendingAction('disable');
    setActionMessage('');
    try {
      await disableQrCode(selectedRow.id);
      const latestRows = await fetchQrCodes();
      const foundRow = latestRows.find((item) => item.id === selectedRow.id);
      const nextRow = foundRow ? { ...foundRow, url: selectedRow.url } : { ...selectedRow, status: '已停用' };
      setRows(latestRows);
      setSelectedRow(nextRow);
      setActionMessage('二维码已停用，当前打印码不再放行扫码访问。');
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : '停用失败');
    } finally {
      setPendingAction(null);
    }
  }

  async function handleRegenerate() {
    if (!selectedRow) return;
    setPendingAction('regenerate');
    setActionMessage('');
    try {
      const result = await regenerateQrCode(selectedRow.id);
      const latestRows = await fetchQrCodes();
      const nextUrl = String(result.url || '');
      const foundRow = latestRows.find((item) => item.id === selectedRow.id);
      const nextRow = foundRow ? { ...foundRow, url: nextUrl } : { ...selectedRow, url: nextUrl };

      setRows(latestRows);
      setSelectedRow(nextRow);

      if (nextUrl) {
        setPreviewUrl(nextUrl);
        setPreviewImage(await QRCode.toDataURL(nextUrl, { width: 220, margin: 1 }));
        setPreviewError('');
      } else {
        setPreviewUrl('');
        setPreviewImage('');
        setPreviewError('重新生成成功，但未返回新的扫码链接。');
      }

      setActionMessage('二维码已重新生成；仅在你明确执行该操作后，打印用二维码才会更新。');
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : '重新生成失败');
    } finally {
      setPendingAction(null);
    }
  }

  async function handleCopyUrl() {
    if (!previewUrl) return;
    try {
      if (window.isSecureContext && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(previewUrl);
      } else if (!legacyCopyText(previewUrl)) {
        throw new Error('当前环境不支持自动复制');
      }
      setActionMessage('扫码访问链接已复制。');
    } catch {
      setActionMessage('当前浏览器限制了自动复制，请长按或手动复制上方链接。');
    }
  }

  function handleOpenPreviewUrl() {
    if (!previewUrl) return;

    const nextWindow = window.open(previewUrl, '_blank', 'noopener,noreferrer');
    if (nextWindow) {
      setActionMessage('扫码页已在新窗口打开。');
      return;
    }

    window.location.assign(previewUrl);
  }

  async function handleDownloadNameplatePdf() {
    if (!selectedRow?.elderId) {
      setActionMessage('当前二维码未关联老人档案，暂不能导出名牌 PDF。');
      return;
    }

    setPdfExporting(true);
    setActionMessage('');
    try {
      await downloadNameplatePdf(selectedRow.elderId);
      setActionMessage('名牌 PDF 已开始下载。');
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : '名牌 PDF 导出失败');
    } finally {
      setPdfExporting(false);
    }
  }

  async function handleSaveRelayDevice() {
    if (!selectedRow) return;
    setBindingSaving(true);
    setActionMessage('');
    try {
      const updated = await updateQrCodeRelayDevice(selectedRow.id, bindingRelayDeviceId);
      setRows((prev) => prev.map((row) => (
        row.id === selectedRow.id
          ? {
              ...row,
              relayDeviceId: updated.relayDeviceId,
              relayReceiverPhone: updated.relayReceiverPhone,
            }
          : row
      )));
      setSelectedRow((prev) => (prev
        ? {
            ...prev,
            relayDeviceId: updated.relayDeviceId,
            relayReceiverPhone: updated.relayReceiverPhone,
          }
        : prev));
      setActionMessage(updated.relayDeviceId ? '扫码短信接收设备已更新。' : '已清除扫码短信接收设备绑定，将回退到默认可用设备。');
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : '短信接收设备保存失败');
    } finally {
      setBindingSaving(false);
    }
  }

  function closeModal() {
    setSelectedRow(null);
    setActionMessage('');
    setPreviewError('');
  }

  function handleExport() {
    exportToCsv(
      `qrcodes-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((row) => ({
        老人姓名: row.elderName || '-',
        年龄: row.elderAge == null ? '-' : String(row.elderAge),
        电话: row.elderPhone || '-',
        绑定档案: row.archiveNo || '-',
        短信接收设备: row.relayDeviceId || '默认设备',
        接收手机号: row.relayReceiverPhone || '跟随默认设备',
        二维码ID: row.id,
        状态: row.status,
        创建时间: formatTime(row.createdAt),
        扫码链接: row.url || '',
      })),
    );
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">二维码管理</p>
          <h2>二维码管理</h2>
        </div>
      </header>

      <section className="panel" style={{ marginTop: 14 }}>
        <div className="toolbar qr-manage-toolbar">
          <div className="qr-manage-toolbar__search">
            <input placeholder="搜索二维码 ID、档案编号、老人姓名" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option>{ALL_STATUS}</option>
              <option>启用</option>
              <option>已停用</option>
              <option>已重新生成</option>
            </select>
          </div>
          <div className="qr-manage-toolbar__actions">
            <button className="secondary" onClick={handleExport} disabled={filtered.length === 0}>
              导出
            </button>
            <TableColumnMenu options={qrColumnOptions} isVisible={columns.isVisible} onToggle={columns.toggle} onReset={columns.reset} />
          </div>
        </div>

        <div className="panel-title">
          <QrCode size={18} />
          <h3>二维码列表</h3>
        </div>

        <div className="table-shell qr-manage-table-shell">
        <table className="data-table qr-manage-table">
          <thead>
            <tr>
              {columns.isVisible('basic') && <th className="col-qr-basic">老人基本信息</th>}
              {columns.isVisible('status') && <th className="col-qr-status">状态</th>}
              {columns.isVisible('createdAt') && <th className="col-qr-created">创建时间</th>}
              {columns.isVisible('actions') && <th className="col-qr-actions">操作</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id}>
                {columns.isVisible('basic') && (
                  <td className="col-qr-basic">
                    <div style={{ display: 'grid', gap: 6 }}>
                      <strong>{row.elderName || '未命名老人'}</strong>
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{renderBasicInfo(row)}</span>
                      <details style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
                        <summary style={{ cursor: 'pointer' }}>展开二维码细节</summary>
                        <div style={{ display: 'grid', gap: 4, marginTop: 6 }}>
                          <span>二维码 ID：{row.id}</span>
                          <span>绑定档案：{row.archiveNo || '-'}</span>
                          <span>短信接收设备：{row.relayDeviceId || '未指定，使用默认设备'}</span>
                          <span>接收手机号：{row.relayReceiverPhone || '跟随默认设备'}</span>
                        </div>
                      </details>
                    </div>
                  </td>
                )}
                {columns.isVisible('status') && (
                  <td className="col-qr-status">
                    <StatusTag status={row.status} />
                  </td>
                )}
                {columns.isVisible('createdAt') && <td className="col-qr-created">{formatTime(row.createdAt)}</td>}
                {columns.isVisible('actions') && (
                  <td className="col-qr-actions">
                    <div className="table-actions">
                      <button className="secondary" onClick={() => setSelectedRow(row)}>
                        查看与管理
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>

      {selectedRow && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()} style={{ width: 760, maxWidth: '94vw' }}>
            <div className="panel-title">
              <Settings2 size={18} />
              <h3>二维码查看与管理</h3>
            </div>

            <div className="two-columns" style={{ marginTop: 0 }}>
              <div
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  padding: 16,
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  background: '#f8fbfc',
                }}
              >
                {previewLoading ? (
                  <span style={{ color: 'var(--color-text-secondary)' }}>二维码加载中...</span>
                ) : previewImage ? (
                  <img src={previewImage} alt="老人二维码" style={{ width: 220, height: 220, objectFit: 'contain' }} />
                ) : (
                  <span style={{ color: 'var(--color-danger)', textAlign: 'center' }}>{previewError || '暂无二维码'}</span>
                )}
                {previewUrl ? (
                  <>
                    <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-text-secondary)', wordBreak: 'break-all' }}>{previewUrl}</div>
                    <div className="table-actions" style={{ marginTop: 12 }}>
                      <button className="secondary" onClick={handleCopyUrl}>
                        复制链接
                      </button>
                      <button className="secondary" onClick={handleOpenPreviewUrl}>
                        打开扫码页
                      </button>
                      <button onClick={handleDownloadNameplatePdf} disabled={pdfExporting || !selectedRow.elderId}>
                        <Download size={16} aria-hidden="true" />
                        {pdfExporting ? '导出中...' : '导出名牌 PDF'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                    这里展示的是当前已生效、可打印的二维码；只有点击“重新生成二维码”后才会更换。
                  </div>
                )}
              </div>

              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <label>
                  二维码 ID
                  <input value={selectedRow.id} readOnly />
                </label>
                <label>
                  绑定档案
                  <input value={selectedRow.archiveNo || '-'} readOnly />
                </label>
                <label style={{ gridColumn: '1 / -1' }}>
                  老人基本信息
                  <input value={renderBasicInfo(selectedRow)} readOnly />
                </label>
                <label>
                  当前状态
                  <div style={{ paddingTop: 6 }}>
                    <StatusTag status={selectedRow.status} />
                  </div>
                </label>
                <label>
                  创建时间
                  <input value={formatTime(selectedRow.createdAt)} readOnly />
                </label>
                <label style={{ gridColumn: '1 / -1' }}>
                  扫码访问链接
                  <input value={previewUrl || '当前未保存可展示链接'} readOnly />
                </label>
                <label>
                  短信接收设备
                  <select value={bindingRelayDeviceId} onChange={(event) => setBindingRelayDeviceId(event.target.value)}>
                    <option value="">未指定，使用默认设备</option>
                    {relayDevices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.deviceId} · {device.receiverPhone || '未配置手机号'}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  当前接收手机号
                  <input
                    value={
                      bindingRelayDeviceId
                        ? relayDevices.find((device) => device.deviceId === bindingRelayDeviceId)?.receiverPhone || '未配置手机号'
                        : (selectedRow.relayReceiverPhone || '跟随默认设备')
                    }
                    readOnly
                  />
                </label>
                {previewError && (
                  <p className="form-error" style={{ gridColumn: '1 / -1', margin: 0 }}>
                    {previewError}
                  </p>
                )}
                {actionMessage && (
                  <p
                    style={{
                      gridColumn: '1 / -1',
                      margin: 0,
                      color: actionMessage.includes('失败') ? 'var(--color-danger)' : 'var(--color-success)',
                      fontSize: 13,
                    }}
                  >
                    {actionMessage}
                  </p>
                )}
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: 18 }}>
              <button className="secondary" onClick={handleSaveRelayDevice} disabled={pendingAction !== null || bindingSaving}>
                {bindingSaving ? '保存中...' : '保存短信接收设备'}
              </button>
              <button className="danger" onClick={handleDisable} disabled={pendingAction !== null || selectedRow.status === '已停用'}>
                {pendingAction === 'disable' ? '停用中...' : '停用二维码'}
              </button>
              <button onClick={handleRegenerate} disabled={pendingAction !== null}>
                {pendingAction === 'regenerate' ? '重新生成中...' : '重新生成二维码'}
              </button>
              <button className="secondary" onClick={closeModal} disabled={pendingAction !== null}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
