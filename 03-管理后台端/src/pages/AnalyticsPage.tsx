import { useEffect, useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { fetchAllScales, fetchElders, fetchMedications } from '../api/adminApi';
import type { ElderRow, MedicationRow, ScaleRecordRow } from '../types';

function groupCount<T>(items: T[], keyGetter: (item: T) => string) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = keyGetter(item) || '未填写';
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

function riskLevel(scaleName: string, score: number) {
  if (scaleName === 'PHQ-9') {
    if (score >= 15) return '较高风险';
    if (score >= 10) return '中等风险';
    if (score >= 5) return '轻度风险';
    return '低风险';
  }
  if (scaleName === 'GAD-7') {
    if (score >= 15) return '较高风险';
    if (score >= 10) return '中等风险';
    if (score >= 5) return '轻度风险';
    return '低风险';
  }
  if (score >= 45) return '较高关注';
  if (score >= 30) return '中等关注';
  return '低关注';
}

export function AnalyticsPage() {
  const [elders, setElders] = useState<ElderRow[]>([]);
  const [medications, setMedications] = useState<MedicationRow[]>([]);
  const [scales, setScales] = useState<ScaleRecordRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([fetchElders(), fetchMedications(), fetchAllScales()])
      .then(([elderRows, medicationRows, scaleRows]) => {
        setElders(elderRows);
        setMedications(medicationRows);
        setScales(scaleRows);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : '加载失败');
      });
  }, []);

  const ageGroups = useMemo(() => {
    const counters = {
      '60-69岁': 0,
      '70-79岁': 0,
      '80-89岁': 0,
      '90岁以上': 0,
    };
    elders.forEach((elder) => {
      if (elder.age >= 90) counters['90岁以上'] += 1;
      else if (elder.age >= 80) counters['80-89岁'] += 1;
      else if (elder.age >= 70) counters['70-79岁'] += 1;
      else counters['60-69岁'] += 1;
    });
    return counters;
  }, [elders]);

  const bloodTypeCounts = useMemo(() => groupCount(elders, (elder) => elder.aboType || '未填写'), [elders]);
  const scaleTypeCounts = useMemo(() => groupCount(scales, (row) => row.scaleName || '未分类'), [scales]);
  const scaleAverageScores = useMemo(() => {
    const grouped = scales.reduce<Record<string, number[]>>((acc, row) => {
      const key = row.scaleName || '未分类';
      acc[key] = acc[key] || [];
      acc[key].push(row.score);
      return acc;
    }, {});
    return Object.entries(grouped).map(([name, values]) => ({
      name,
      value: average(values),
    }));
  }, [scales]);

  const riskCounts = useMemo(
    () => groupCount(scales, (row) => `${row.scaleName} · ${riskLevel(row.scaleName, row.score)}`),
    [scales],
  );

  const latestScales = useMemo(
    () =>
      [...scales]
        .sort((a, b) => String(b.date).localeCompare(String(a.date)))
        .slice(0, 8),
    [scales],
  );

  const totalAge = elders.reduce((sum, elder) => sum + elder.age, 0);
  const avgAge = elders.length ? Math.round((totalAge / elders.length) * 10) / 10 : 0;
  const uniqueMedicationElders = new Set(medications.map((row) => row.elderId || row.archiveNo)).size;

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">统计分析</p>
          <h2>老人健康与量表统计分析</h2>
        </div>
      </header>

      <section className="metrics">
        <article className="metric-card">
          <p className="metric-label">老人档案总数</p>
          <strong className="metric-value">{elders.length}</strong>
          <span className="metric-trend">当前纳入管理的老人</span>
        </article>
        <article className="metric-card">
          <p className="metric-label">平均年龄</p>
          <strong className="metric-value">{avgAge}</strong>
          <span className="metric-trend">按当前档案实时计算</span>
        </article>
        <article className="metric-card">
          <p className="metric-label">用药记录数</p>
          <strong className="metric-value">{medications.length}</strong>
          <span className="metric-trend">{uniqueMedicationElders} 位老人有用药记录</span>
        </article>
        <article className="metric-card">
          <p className="metric-label">量表记录数</p>
          <strong className="metric-value">{scales.length}</strong>
          <span className="metric-trend">PHQ-9 / GAD-7 / UCLA</span>
        </article>
      </section>

      <section className="analytics-grid">
        <article className="panel analytics-card">
          <div className="panel-title">
            <BarChart3 size={18} />
            <h3>年龄段分布</h3>
          </div>
          <div className="bar-list">
            {Object.entries(ageGroups).map(([label, value]) => (
              <div key={label} className="bar-row">
                <div className="bar-meta">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: formatPercent(value, elders.length) }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel analytics-card">
          <div className="panel-title">
            <BarChart3 size={18} />
            <h3>ABO 血型分布</h3>
          </div>
          <div className="bar-list">
            {Object.entries(bloodTypeCounts).map(([label, value]) => (
              <div key={label} className="bar-row">
                <div className="bar-meta">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
                <div className="bar-track">
                  <div className="bar-fill bar-fill--teal" style={{ width: formatPercent(value, elders.length) }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel analytics-card">
          <div className="panel-title">
            <BarChart3 size={18} />
            <h3>量表记录数量</h3>
          </div>
          <div className="bar-list">
            {Object.entries(scaleTypeCounts).map(([label, value]) => (
              <div key={label} className="bar-row">
                <div className="bar-meta">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
                <div className="bar-track">
                  <div className="bar-fill bar-fill--gold" style={{ width: formatPercent(value, scales.length) }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel analytics-card">
          <div className="panel-title">
            <BarChart3 size={18} />
            <h3>量表平均分</h3>
          </div>
          <div className="score-chip-grid">
            {scaleAverageScores.map((item) => (
              <div key={item.name} className="score-chip">
                <span>{item.name}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="two-columns">
        <article className="panel analytics-card">
          <div className="panel-title">
            <BarChart3 size={18} />
            <h3>量表风险分层</h3>
          </div>
          <div className="bar-list">
            {Object.entries(riskCounts).map(([label, value]) => (
              <div key={label} className="bar-row">
                <div className="bar-meta">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
                <div className="bar-track">
                  <div className="bar-fill bar-fill--rose" style={{ width: formatPercent(value, scales.length) }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel analytics-card">
          <div className="panel-title">
            <BarChart3 size={18} />
            <h3>最近量表记录</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>老人姓名</th>
                <th>量表类型</th>
                <th>分数</th>
                <th>日期</th>
              </tr>
            </thead>
            <tbody>
              {latestScales.map((row) => (
                <tr key={row.id}>
                  <td>{row.elderName}</td>
                  <td>{row.scaleName}</td>
                  <td>{row.score}</td>
                  <td>{String(row.date).slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </section>

      {error && (
        <section className="panel" style={{ marginTop: 14 }}>
          <p className="form-error">{error}</p>
        </section>
      )}
    </>
  );
}
