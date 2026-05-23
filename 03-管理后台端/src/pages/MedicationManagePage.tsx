import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pill } from 'lucide-react';
import { StatusTag } from '../components/StatusTag';
import { TableColumnMenu, useTableColumnVisibility, type TableColumnOption } from '../components/TableColumnMenu';
import { fetchElderMedications, fetchMedications, saveElderMedications } from '../api/adminApi';
import type { MedicationRow } from '../types';
import { exportToCsv } from '../utils/exportCsv';

interface MedicationEditorState {
  elderId: string;
  archiveNo: string;
  elderName: string;
  rows: MedicationRow[];
}

type MedicationColumnKey = 'archiveNo' | 'elderName' | 'drugName' | 'dosage' | 'usage' | 'timing' | 'status' | 'tail';
type MedicationEditorColumnKey = 'drugName' | 'dosage' | 'usage' | 'timing' | 'actions';

const ALL_STATUS = '全部状态';
const medicationColumnOptions: TableColumnOption<MedicationColumnKey>[] = [
  { key: 'archiveNo', label: '档案编号', defaultVisible: true },
  { key: 'elderName', label: '老人姓名', defaultVisible: true },
  { key: 'drugName', label: '药品名称', defaultVisible: true },
  { key: 'dosage', label: '剂量', defaultVisible: true },
  { key: 'usage', label: '用法', defaultVisible: true },
  { key: 'timing', label: '用药时间', defaultVisible: true },
  { key: 'status', label: '状态', defaultVisible: true },
  { key: 'tail', label: '操作/更新时间', required: true },
];
const medicationEditorColumnOptions: TableColumnOption<MedicationEditorColumnKey>[] = [
  { key: 'drugName', label: '药品名称', defaultVisible: true },
  { key: 'dosage', label: '剂量', defaultVisible: true },
  { key: 'usage', label: '用法', defaultVisible: true },
  { key: 'timing', label: '用药时间', defaultVisible: true },
  { key: 'actions', label: '操作', required: true },
];

function createDraftRow(currentArchiveNo: string, currentElderName: string): MedicationRow {
  return {
    id: `draft-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    elderId: '',
    archiveNo: currentArchiveNo,
    elderName: currentElderName,
    drugName: '',
    dosage: '',
    usage: '',
    timing: '',
    updatedAt: '',
    status: '使用中',
  };
}

export function MedicationManagePage() {
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<MedicationRow[]>([]);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState<MedicationEditorState | null>(null);
  const elderId = searchParams.get('elderId') || '';
  const archiveNo = searchParams.get('archiveNo') || '';
  const elderName = searchParams.get('elderName') || '';
  const columns = useTableColumnVisibility('sl_columns_medications', medicationColumnOptions);
  const editorColumns = useTableColumnVisibility('sl_columns_medication_editor', medicationEditorColumnOptions);

  async function loadList() {
    const data = elderId ? await fetchElderMedications(elderId) : await fetchMedications();
    setRows(data);
  }

  useEffect(() => {
    loadList().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : '加载失败');
    });
  }, [elderId]);

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        const text = `${row.archiveNo} ${row.elderName} ${row.drugName}`;
        return (!keyword || text.includes(keyword)) && (statusFilter === ALL_STATUS || row.status === statusFilter);
      }),
    [keyword, rows, statusFilter],
  );

  async function openEditor(currentElderId: string, currentArchiveNo: string, currentElderName: string) {
    setError('');
    try {
      const medicationRows = await fetchElderMedications(currentElderId);
      setEditor({
        elderId: currentElderId,
        archiveNo: currentArchiveNo,
        elderName: currentElderName,
        rows: medicationRows.length > 0 ? medicationRows : [createDraftRow(currentArchiveNo, currentElderName)],
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '加载失败');
    }
  }

  function closeEditor() {
    if (saving) return;
    setEditor(null);
  }

  function updateEditorRow(index: number, key: keyof MedicationRow, value: string) {
    setEditor((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rows: prev.rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)),
      };
    });
  }

  function addEditorRow() {
    setEditor((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rows: prev.rows.concat(createDraftRow(prev.archiveNo, prev.elderName)),
      };
    });
  }

  function removeEditorRow(index: number) {
    setEditor((prev) => {
      if (!prev) return prev;
      const nextRows = prev.rows.filter((_, rowIndex) => rowIndex !== index);
      return {
        ...prev,
        rows: nextRows.length > 0 ? nextRows : [createDraftRow(prev.archiveNo, prev.elderName)],
      };
    });
  }

  async function handleSaveEditor() {
    if (!editor) return;
    const payload = editor.rows
      .map((row) => ({
        name: row.drugName.trim(),
        dosage: row.dosage.trim(),
        usage: row.usage.trim(),
        timing: row.timing.trim(),
      }))
      .filter((row) => row.name);

    setSaving(true);
    setError('');
    try {
      await saveElderMedications(editor.elderId, payload);
      await loadList();
      if (elderId) {
        const latest = await fetchElderMedications(editor.elderId);
        setRows(latest);
      }
      setEditor(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  function handleExport() {
    exportToCsv(
      `medications-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((row) => ({
        档案编号: row.archiveNo,
        老人姓名: row.elderName,
        药品名称: row.drugName,
        剂量: row.dosage,
        用法: row.usage,
        用药时间: row.timing,
        状态: row.status,
        更新时间: row.updatedAt || '-',
      })),
    );
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">用药信息</p>
          <h2>{elderId ? '老人用药编辑' : '用药信息管理'}</h2>
        </div>
      </header>
      <section className="panel" style={{ marginTop: 14 }}>
        <div className="panel-title">
          <Pill size={18} />
          <h3>{elderId ? '主要用药信息' : '老人主要用药记录'}</h3>
        </div>
        {elderId && (
          <div className="inline-editor" style={{ marginBottom: 16 }}>
            <strong>{elderName || '未命名老人'}</strong>
            <div style={{ marginTop: 6, color: 'var(--color-text-secondary)', fontSize: 13 }}>档案编号：{archiveNo || '自动生成'}</div>
          </div>
        )}
        <div className="toolbar">
          <input placeholder="搜索档案编号、老人姓名或药品" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option>{ALL_STATUS}</option>
            <option>使用中</option>
          </select>
          <button onClick={() => setKeyword(keyword.trim())}>查询</button>
          <button className="secondary" onClick={handleExport} disabled={filtered.length === 0}>
            导出
          </button>
          <TableColumnMenu options={medicationColumnOptions} isVisible={columns.isVisible} onToggle={columns.toggle} onReset={columns.reset} />
          {elderId && (
            <button className="secondary" onClick={() => openEditor(elderId, archiveNo, elderName)}>
              编辑用药
            </button>
          )}
        </div>
        {error && <p className="form-error">{error}</p>}
        <table className="data-table">
          <thead>
            <tr>
              {columns.isVisible('archiveNo') && <th>档案编号</th>}
              {columns.isVisible('elderName') && <th>老人姓名</th>}
              {columns.isVisible('drugName') && <th>药品名称</th>}
              {columns.isVisible('dosage') && <th>剂量</th>}
              {columns.isVisible('usage') && <th>用法</th>}
              {columns.isVisible('timing') && <th>用药时间</th>}
              {columns.isVisible('status') && <th>状态</th>}
              {columns.isVisible('tail') && <th>{elderId ? '更新时间' : '操作'}</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id}>
                {columns.isVisible('archiveNo') && <td>{row.archiveNo}</td>}
                {columns.isVisible('elderName') && <td>{row.elderName}</td>}
                {columns.isVisible('drugName') && <td>{row.drugName}</td>}
                {columns.isVisible('dosage') && <td>{row.dosage}</td>}
                {columns.isVisible('usage') && <td>{row.usage}</td>}
                {columns.isVisible('timing') && <td>{row.timing}</td>}
                {columns.isVisible('status') && (
                  <td>
                    <StatusTag status={row.status} />
                  </td>
                )}
                {columns.isVisible('tail') && (
                  <td>
                    {elderId ? (
                      row.updatedAt
                    ) : (
                      <div className="table-actions">
                        <button className="secondary" onClick={() => openEditor(row.elderId || '', row.archiveNo, row.elderName)} disabled={!row.elderId}>
                          编辑
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {editor && (
        <div className="modal-overlay" onClick={closeEditor}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()} style={{ width: 720, maxWidth: '94vw' }}>
            <div className="panel-title">
              <Pill size={18} />
              <h3>编辑用药信息</h3>
            </div>
            <div className="inline-editor" style={{ marginBottom: 16 }}>
              <strong>{editor.elderName || '未命名老人'}</strong>
              <div style={{ marginTop: 6, color: 'var(--color-text-secondary)', fontSize: 13 }}>档案编号：{editor.archiveNo || '自动生成'}</div>
            </div>
            <div className="toolbar" style={{ marginBottom: 10 }}>
              <TableColumnMenu options={medicationEditorColumnOptions} isVisible={editorColumns.isVisible} onToggle={editorColumns.toggle} onReset={editorColumns.reset} />
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  {editorColumns.isVisible('drugName') && <th>药品名称</th>}
                  {editorColumns.isVisible('dosage') && <th>剂量</th>}
                  {editorColumns.isVisible('usage') && <th>用法</th>}
                  {editorColumns.isVisible('timing') && <th>用药时间</th>}
                  {editorColumns.isVisible('actions') && <th>操作</th>}
                </tr>
              </thead>
              <tbody>
                {editor.rows.map((row, index) => (
                  <tr key={row.id}>
                    {editorColumns.isVisible('drugName') && (
                      <td>
                        <input value={row.drugName} onChange={(event) => updateEditorRow(index, 'drugName', event.target.value)} />
                      </td>
                    )}
                    {editorColumns.isVisible('dosage') && (
                      <td>
                        <input value={row.dosage} onChange={(event) => updateEditorRow(index, 'dosage', event.target.value)} />
                      </td>
                    )}
                    {editorColumns.isVisible('usage') && (
                      <td>
                        <input value={row.usage} onChange={(event) => updateEditorRow(index, 'usage', event.target.value)} />
                      </td>
                    )}
                    {editorColumns.isVisible('timing') && (
                      <td>
                        <input value={row.timing} onChange={(event) => updateEditorRow(index, 'timing', event.target.value)} />
                      </td>
                    )}
                    {editorColumns.isVisible('actions') && (
                      <td>
                        <div className="table-actions">
                          <button className="danger" onClick={() => removeEditorRow(index)}>
                            删除
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="form-actions" style={{ marginTop: 16, justifyContent: 'space-between' }}>
              <button className="secondary" onClick={addEditorRow} disabled={saving}>
                新增用药
              </button>
              <div className="table-actions">
                <button onClick={handleSaveEditor} disabled={saving}>
                  {saving ? '保存中...' : '保存用药'}
                </button>
                <button className="secondary" onClick={closeEditor} disabled={saving}>
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
