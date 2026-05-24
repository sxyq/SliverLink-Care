import { useEffect, useMemo, useState } from 'react';
import { RadioTower, RefreshCw, Smartphone } from 'lucide-react';
import { fetchSmsRelayDevices, fetchSmsRelayRecords, fetchSmsRelaySessions, updateSmsRelayDevice } from '../api/adminApi';
import { StatusTag } from '../components/StatusTag';
import type { SmsRelayDeviceRow, SmsRelayRecordRow, SmsRelaySessionRow } from '../types';

export function SmsRelayManagePage() {
  const [devices, setDevices] = useState<SmsRelayDeviceRow[]>([]);
  const [records, setRecords] = useState<SmsRelayRecordRow[]>([]);
  const [sessions, setSessions] = useState<SmsRelaySessionRow[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingDeviceId, setSavingDeviceId] = useState('');
  const [saveError, setSaveError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [nextDevices, nextRecords, nextSessions] = await Promise.all([
        fetchSmsRelayDevices(),
        fetchSmsRelayRecords(),
        fetchSmsRelaySessions(),
      ]);
      setDevices(nextDevices);
      setRecords(nextRecords);
      setSessions(nextSessions);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  async function handleSaveDevice(deviceId: string) {
    const current = devices.find((item) => item.deviceId === deviceId);
    if (!current) return;

    setSavingDeviceId(deviceId);
    setSaveError('');
    try {
      const updated = await updateSmsRelayDevice(deviceId, {
        receiverPhone: current.receiverPhone,
        serverUrl: current.serverUrl,
        messagePrefix: current.messagePrefix,
      });
      setDevices((prev) => prev.map((item) => (item.deviceId === deviceId ? updated : item)));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '设备配置保存失败');
    } finally {
      setSavingDeviceId('');
    }
  }

  const filteredRecords = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    if (!text) return records;
    return records.filter((row) =>
      `${row.deviceId} ${row.receiverPhone} ${row.senderPhone} ${row.messageBody}`.toLowerCase().includes(text),
    );
  }, [keyword, records]);

  const filteredSessions = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    if (!text) return sessions;
    return sessions.filter((row) =>
      `${row.sessionId} ${row.elderId} ${row.receiverPhone} ${row.messageBody}`.toLowerCase().includes(text),
    );
  }, [keyword, sessions]);

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">短信中转</p>
          <h2>短信中转管理</h2>
        </div>
      </header>

      <section className="panel sms-relay-panel" style={{ marginTop: 14 }}>
        <div className="panel-title">
          <Smartphone size={18} />
          <h3>设备状态</h3>
        </div>

        <div className="sms-relay-summary-grid">
          <article className="sms-relay-summary-card sms-relay-summary-card--feature">
            <div className="sms-relay-summary-head">
              <span className="sms-relay-summary-label">设备总数</span>
              <strong className="sms-relay-summary-value">{devices.length}</strong>
            </div>
            <p className="sms-relay-summary-note">已登记短信中转设备</p>
          </article>
          <article className="sms-relay-summary-card">
            <div className="sms-relay-summary-head">
              <span className="sms-relay-summary-label">在线设备</span>
              <strong className="sms-relay-summary-value">{devices.filter((item) => item.status === '在线').length}</strong>
            </div>
            <p className="sms-relay-summary-note">最近心跳可见</p>
          </article>
          <article className="sms-relay-summary-card">
            <div className="sms-relay-summary-head">
              <span className="sms-relay-summary-label">后台服务</span>
              <strong className="sms-relay-summary-value">{devices.filter((item) => item.serviceStatus === '后台服务运行中').length}</strong>
            </div>
            <p className="sms-relay-summary-note">已连接统一后端</p>
          </article>
          <article className="sms-relay-summary-card">
            <div className="sms-relay-summary-head">
              <span className="sms-relay-summary-label">回传记录</span>
              <strong className="sms-relay-summary-value">{records.length}</strong>
            </div>
            <p className="sms-relay-summary-note">已持久化短信条目</p>
          </article>
          <article className="sms-relay-summary-card">
            <div className="sms-relay-summary-head">
              <span className="sms-relay-summary-label">验证会话</span>
              <strong className="sms-relay-summary-value">{sessions.length}</strong>
            </div>
            <p className="sms-relay-summary-note">{sessions.filter((item) => item.status === '已验证').length} 条已验证</p>
          </article>
        </div>

        {saveError ? <p className="form-error">{saveError}</p> : null}

        <div className="sms-relay-table-shell">
          <table className="data-table sms-relay-device-table">
            <thead>
              <tr>
                <th>设备 ID</th>
                <th>接收手机号</th>
                <th>服务器地址</th>
                <th>前缀规则</th>
                <th>状态</th>
                <th>后台服务</th>
                <th>最后心跳</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((row) => (
                <tr key={row.deviceId}>
                  <td style={{ fontFamily: 'monospace' }}>{row.deviceId}</td>
                  <td>
                    <input
                      value={row.receiverPhone}
                      onChange={(event) => setDevices((prev) => prev.map((item) => (
                        item.deviceId === row.deviceId ? { ...item, receiverPhone: event.target.value } : item
                      )))}
                    />
                  </td>
                  <td>
                    <input
                      value={row.serverUrl}
                      onChange={(event) => setDevices((prev) => prev.map((item) => (
                        item.deviceId === row.deviceId ? { ...item, serverUrl: event.target.value } : item
                      )))}
                    />
                  </td>
                  <td>
                    <input
                      value={row.messagePrefix}
                      onChange={(event) => setDevices((prev) => prev.map((item) => (
                        item.deviceId === row.deviceId ? { ...item, messagePrefix: event.target.value } : item
                      )))}
                    />
                  </td>
                  <td><StatusTag status={row.status} /></td>
                  <td><StatusTag status={row.serviceStatus} /></td>
                  <td>{row.lastHeartbeat}</td>
                  <td>
                    <button
                      className="secondary"
                      onClick={() => handleSaveDevice(row.deviceId)}
                      disabled={savingDeviceId === row.deviceId}
                    >
                      {savingDeviceId === row.deviceId ? '保存中' : '保存配置'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="sms-relay-detail-grid">
        <section className="panel sms-relay-panel sms-relay-panel--compact">
          <div className="panel-title">
            <RadioTower size={18} />
            <h3>短信回传记录</h3>
          </div>

          <div className="toolbar sms-relay-record-toolbar">
            <input
              placeholder="搜索设备、手机号或短信内容"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
            <button className="secondary" onClick={() => load()} disabled={loading}>
              <RefreshCw size={14} />
              {loading ? '刷新中' : '刷新'}
            </button>
          </div>

          <div className="sms-relay-table-shell">
            <table className="data-table sms-relay-record-table">
              <thead>
                <tr>
                  <th>设备 ID</th>
                  <th>接收手机号</th>
                  <th>发送手机号</th>
                  <th>短信内容</th>
                  <th>接收时间</th>
                  <th>上传时间</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((row) => (
                  <tr key={row.id}>
                    <td style={{ fontFamily: 'monospace' }}>{row.deviceId}</td>
                    <td>{row.receiverPhone}</td>
                    <td>{row.senderPhone}</td>
                    <td style={{ maxWidth: 360 }}>{row.messageBody}</td>
                    <td>{row.receivedAt}</td>
                    <td>{row.uploadedAt}</td>
                    <td><StatusTag status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel sms-relay-panel sms-relay-panel--compact">
          <div className="panel-title">
            <RadioTower size={18} />
            <h3>验证会话</h3>
          </div>

          <div className="sms-relay-table-shell">
            <table className="data-table sms-relay-session-table">
              <thead>
                <tr>
                  <th>会话 ID</th>
                  <th>老人 ID</th>
                  <th>目标</th>
                  <th>目标设备</th>
                  <th>接收号码</th>
                  <th>短信内容</th>
                  <th>创建时间</th>
                  <th>过期时间</th>
                  <th>验证时间</th>
                  <th>发送方</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((row) => (
                  <tr key={row.sessionId}>
                    <td style={{ fontFamily: 'monospace' }}>{row.sessionId}</td>
                    <td style={{ fontFamily: 'monospace' }}>{row.elderId || '-'}</td>
                    <td>{row.target || '-'}</td>
                    <td style={{ fontFamily: 'monospace' }}>{row.relayDeviceId || '-'}</td>
                    <td>{row.receiverPhone}</td>
                    <td style={{ maxWidth: 300 }}>{row.messageBody}</td>
                    <td>{row.createdAt}</td>
                    <td>{row.expiresAt}</td>
                    <td>{row.verifiedAt}</td>
                    <td>{row.senderPhoneMasked}</td>
                    <td><StatusTag status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </>
  );
}
