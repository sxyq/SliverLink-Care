import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { TableColumnMenu, useTableColumnVisibility, type TableColumnOption } from '../components/TableColumnMenu';
import { fetchAllScales, fetchElderScales, saveElderScales } from '../api/adminApi';
import type { ScaleRecordRow } from '../types';
import { exportToCsv } from '../utils/exportCsv';

const scaleOptions = ['PHQ-9', 'GAD-7', 'UCLA'];

interface ScaleEditorState {
  elderId: string;
  archiveNo: string;
  elderName: string;
  rows: ScaleRecordRow[];
}

type ScaleColumnKey = 'archiveNo' | 'elderName' | 'scaleName' | 'score' | 'date' | 'volunteer' | 'tail';
type ScaleEditorColumnKey = 'scaleName' | 'score' | 'date' | 'actions';

const ALL_SCALE = '全部量表';
const scaleColumnOptions: TableColumnOption<ScaleColumnKey>[] = [
  { key: 'archiveNo', label: '档案编号', defaultVisible: true },
  { key: 'elderName', label: '老人姓名', defaultVisible: true },
  { key: 'scaleName', label: '量表类型', defaultVisible: true },
  { key: 'score', label: '分数', defaultVisible: true },
  { key: 'date', label: '填写日期', defaultVisible: true },
  { key: 'volunteer', label: '负责志愿者', defaultVisible: true },
  { key: 'tail', label: '状态/操作', required: true },
];
const scaleEditorColumnOptions: TableColumnOption<ScaleEditorColumnKey>[] = [
  { key: 'scaleName', label: '量表类型', defaultVisible: true },
  { key: 'score', label: '分数', defaultVisible: true },
  { key: 'date', label: '填写日期', defaultVisible: true },
  { key: 'actions', label: '操作', required: true },
];

function createDraftRow(elderId: string, archiveNo: string, elderName: string): ScaleRecordRow {
  return {
    id: `draft-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    elderId,
    archiveNo,
    elderName,
    scaleName: 'PHQ-9',
    score: 0,
    date: new Date().toISOString().slice(0, 10),
    volunteer: '',
  };
}

export function ScaleManagePage() {
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<ScaleRecordRow[]>([]);
  const [keyword, setKeyword] = useState('');
  const [scaleFilter, setScaleFilter] = useState(ALL_SCALE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState<ScaleEditorState | null>(null);
  const elderId = searchParams.get('elderId') || '';
  const archiveNo = searchParams.get('archiveNo') || '';
  const elderName = searchParams.get('elderName') || '';
  const columns = useTableColumnVisibility('sl_columns_scales', scaleColumnOptions);
  const editorColumns = useTableColumnVisibility('sl_columns_scale_editor', scaleEditorColumnOptions);

  async function loadList() {
    const data = elderId ? await fetchElderScales(elderId) : await fetchAllScales();
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
        const text = `${row.archiveNo || ''} ${row.elderName || ''} ${row.scaleName}`;
        const matchKeyword = !keyword || text.includes(keyword);
        const matchScale = scaleFilter === ALL_SCALE || row.scaleName === scaleFilter;
        return matchKeyword && matchScale;
      }),
    [keyword, rows, scaleFilter],
  );

  async function openEditor(currentElderId: string, currentArchiveNo: string, currentElderName: string) {
    setError('');
    try {
      const scaleRows = await fetchElderScales(currentElderId);
      setEditor({
        elderId: currentElderId,
        archiveNo: currentArchiveNo,
        elderName: currentElderName,
        rows: scaleRows.length > 0 ? scaleRows : [createDraftRow(currentElderId, currentArchiveNo, currentElderName)],
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '加载失败');
    }
  }

  function closeEditor() {
    if (saving) return;
    setEditor(null);
  }

  function updateEditorRow(index: number, key: keyof ScaleRecordRow, value: string) {
    setEditor((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rows: prev.rows.map((row, rowIndex) =>
          rowIndex === index ? { ...row, [key]: key === 'score' ? Number(value || 0) : value } : row,
        ),
      };
    });
  }

  function addEditorRow() {
    setEditor((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rows: prev.rows.concat(createDraftRow(prev.elderId, prev.archiveNo, prev.elderName)),
      };
    });
  }

  function removeEditorRow(index: number) {
    setEditor((prev) => {
      if (!prev) return prev;
      const nextRows = prev.rows.filter((_, rowIndex) => rowIndex !== index);
      return {
        ...prev,
        rows: nextRows.length > 0 ? nextRows : [createDraftRow(prev.elderId, prev.archiveNo, prev.elderName)],
      };
    });
  }

  async function handleSaveEditor() {
    if (!editor) return;
    const payload = editor.rows
      .map((row) => ({
        name: row.scaleName,
        score: row.score,
        date: row.date,
      }))
      .filter((row) => row.name);

    setSaving(true);
    setError('');
    try {
      await saveElderScales(editor.elderId, payload);
      await loadList();
      setEditor(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  function handleExport() {
    exportToCsv(
      `scales-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((row) => ({
        档案编号: row.archiveNo || '-',
        老人姓名: row.elderName || '-',
        量表类型: row.scaleName,
        分数: String(row.score),
        填写日期: String(row.date).slice(0, 10),
        负责志愿者: row.volunteer || '-',
      })),
    );
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">量表信息</p>
          <h2>{elderId ? '老人量表编辑' : '量表管理'}</h2>
        </div>
      </header>

      <section className="panel" style={{ marginTop: 14 }}>
        <div className="panel-title">
          <ClipboardList size={18} />
          <h3>{elderId ? '量表记录' : '老人量表记录总表'}</h3>
        </div>

        {elderId && (
          <div className="inline-editor" style={{ marginBottom: 16 }}>
            <strong>{elderName || '未命名老人'}</strong>
            <div style={{ marginTop: 6, color: 'var(--color-text-secondary)', fontSize: 13 }}>档案编号：{archiveNo || '自动生成'}</div>
          </div>
        )}

        <div className="toolbar">
          <input placeholder="搜索档案编号、老人姓名或量表类型" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          <select value={scaleFilter} onChange={(event) => setScaleFilter(event.target.value)}>
            <option>{ALL_SCALE}</option>
            {scaleOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <button onClick={() => setKeyword(keyword.trim())}>查询</button>
          <button className="secondary" onClick={handleExport} disabled={filtered.length === 0}>
            导出
          </button>
          <TableColumnMenu options={scaleColumnOptions} isVisible={columns.isVisible} onToggle={columns.toggle} onReset={columns.reset} />
          {elderId && (
            <button className="secondary" onClick={() => openEditor(elderId, archiveNo, elderName)}>
              编辑量表
            </button>
          )}
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="table-shell">
        <table className="data-table">
          <thead>
            <tr>
              {columns.isVisible('archiveNo') && <th>档案编号</th>}
              {columns.isVisible('elderName') && <th>老人姓名</th>}
              {columns.isVisible('scaleName') && <th>量表类型</th>}
              {columns.isVisible('score') && <th>分数</th>}
              {columns.isVisible('date') && <th>填写日期</th>}
              {columns.isVisible('volunteer') && <th>负责志愿者</th>}
              {columns.isVisible('tail') && <th>{elderId ? '记录状态' : '操作'}</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id}>
                {columns.isVisible('archiveNo') && <td>{row.archiveNo}</td>}
                {columns.isVisible('elderName') && <td>{row.elderName}</td>}
                {columns.isVisible('scaleName') && <td>{row.scaleName}</td>}
                {columns.isVisible('score') && <td>{row.score}</td>}
                {columns.isVisible('date') && <td>{String(row.date).slice(0, 10)}</td>}
                {columns.isVisible('volunteer') && <td>{row.volunteer || '-'}</td>}
                {columns.isVisible('tail') && (
                  <td>
                    {elderId ? (
                      '已记录'
                    ) : (
                      <div className="table-actions">
                        <button className="secondary" onClick={() => openEditor(row.elderId || '', row.archiveNo || '', row.elderName || '')} disabled={!row.elderId}>
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
        </div>
      </section>

      {editor && (
        <div className="modal-overlay" onClick={closeEditor}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()} style={{ width: 720, maxWidth: '94vw' }}>
            <div className="panel-title">
              <ClipboardList size={18} />
              <h3>编辑量表信息</h3>
            </div>

            <div className="inline-editor" style={{ marginBottom: 16 }}>
              <strong>{editor.elderName || '未命名老人'}</strong>
              <div style={{ marginTop: 6, color: 'var(--color-text-secondary)', fontSize: 13 }}>档案编号：{editor.archiveNo || '自动生成'}</div>
            </div>

            <div className="toolbar" style={{ marginBottom: 10 }}>
              <TableColumnMenu options={scaleEditorColumnOptions} isVisible={editorColumns.isVisible} onToggle={editorColumns.toggle} onReset={editorColumns.reset} />
            </div>

            <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  {editorColumns.isVisible('scaleName') && <th>量表类型</th>}
                  {editorColumns.isVisible('score') && <th>分数</th>}
                  {editorColumns.isVisible('date') && <th>填写日期</th>}
                  {editorColumns.isVisible('actions') && <th>操作</th>}
                </tr>
              </thead>
              <tbody>
                {editor.rows.map((row, index) => (
                  <tr key={row.id}>
                    {editorColumns.isVisible('scaleName') && (
                      <td>
                        <select value={row.scaleName} onChange={(event) => updateEditorRow(index, 'scaleName', event.target.value)}>
                          {scaleOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}
                    {editorColumns.isVisible('score') && (
                      <td>
                        <input type="number" value={row.score} onChange={(event) => updateEditorRow(index, 'score', event.target.value)} />
                      </td>
                    )}
                    {editorColumns.isVisible('date') && (
                      <td>
                        <input type="date" value={String(row.date).slice(0, 10)} onChange={(event) => updateEditorRow(index, 'date', event.target.value)} />
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
            </div>

            <div className="form-actions" style={{ marginTop: 16, justifyContent: 'space-between' }}>
              <button className="secondary" onClick={addEditorRow} disabled={saving}>
                新增量表
              </button>
              <div className="table-actions">
                <button onClick={handleSaveEditor} disabled={saving}>
                  {saving ? '保存中...' : '保存量表'}
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
