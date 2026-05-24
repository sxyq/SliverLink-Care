import { useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface MobileDataMetaItem {
  label: string;
  value: ReactNode;
  fullWidth?: boolean;
}

export function MobileDataList<T>({
  rows,
  getKey,
  getTitle,
  getSummary,
  getStatus,
  getMeta,
  renderExpanded,
  renderActions,
  emptyText = '暂无数据',
  expandLabel = '展开查看更多',
  collapseLabel = '收起详情',
}: {
  rows: T[];
  getKey: (row: T, index: number) => string;
  getTitle: (row: T, index: number) => ReactNode;
  getSummary?: (row: T, index: number) => ReactNode;
  getStatus?: (row: T, index: number) => ReactNode;
  getMeta?: (row: T, index: number) => MobileDataMetaItem[];
  renderExpanded?: (row: T, index: number) => ReactNode;
  renderActions?: (row: T, index: number) => ReactNode;
  emptyText?: string;
  expandLabel?: string;
  collapseLabel?: string;
}) {
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  const normalizedRows = useMemo(
    () =>
      rows.map((row, index) => ({
        row,
        index,
        key: getKey(row, index),
      })),
    [getKey, rows],
  );

  function toggleCard(key: string) {
    setExpandedMap((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="mobile-data-list">
      {normalizedRows.length === 0 ? (
        <div className="mobile-data-empty">{emptyText}</div>
      ) : (
        normalizedRows.map(({ row, index, key }) => {
          const metaItems = getMeta?.(row, index).filter((item) => item.value !== null && item.value !== undefined && item.value !== '') ?? [];
          const expandedContent = renderExpanded?.(row, index);
          const actionContent = renderActions?.(row, index);
          const canExpand = Boolean(expandedContent || actionContent);
          const expanded = expandedMap[key] === true;

          return (
            <article key={key} className={`mobile-data-card${expanded ? ' mobile-data-card--expanded' : ''}`}>
              <div className="mobile-data-card__header">
                <div className="mobile-data-card__headline">
                  <h4>{getTitle(row, index)}</h4>
                  {getSummary ? <p>{getSummary(row, index)}</p> : null}
                </div>
                {getStatus ? <div className="mobile-data-card__status">{getStatus(row, index)}</div> : null}
              </div>

              {metaItems.length > 0 ? (
                <dl className="mobile-data-card__meta">
                  {metaItems.map((item) => (
                    <div key={`${key}-${item.label}`} className={item.fullWidth ? 'mobile-data-card__meta-item mobile-data-card__meta-item--full' : 'mobile-data-card__meta-item'}>
                      <dt>{item.label}</dt>
                      <dd>{item.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              {canExpand ? (
                <>
                  <button className="mobile-data-card__toggle" type="button" onClick={() => toggleCard(key)}>
                    <span>{expanded ? collapseLabel : expandLabel}</span>
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {expanded ? (
                    <div className="mobile-data-card__expanded">
                      {expandedContent ? <div className="mobile-data-card__section">{expandedContent}</div> : null}
                      {actionContent ? <div className="mobile-data-card__section mobile-data-card__section--actions">{actionContent}</div> : null}
                    </div>
                  ) : null}
                </>
              ) : null}
            </article>
          );
        })
      )}
    </div>
  );
}
