import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, FilePenLine, Search, ShieldCheck, User } from 'lucide-react';
import type { CareSubject } from './types';
import { PageHeader } from '../components/PageHeader';

interface SubjectListPageProps {
  title: string;
  loading?: boolean;
  subjects: CareSubject[];
  keyword: string;
  onKeywordChange: (value: string) => void;
  onSelect: (subject: CareSubject) => void;
  primaryHint?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  secondaryActionLabel?: string;
  secondaryActionDescription?: string;
  onSecondaryAction?: (subject: CareSubject) => void;
  headerLeadingAction?: ReactNode;
  headerAction?: ReactNode;
  preProfilePanel?: ReactNode;
}

export function SubjectListPage({
  title,
  loading = false,
  subjects,
  keyword,
  onKeywordChange,
  onSelect,
  primaryHint,
  emptyText = '暂无可管理对象',
  searchPlaceholder = '请输入姓名或档案编号',
  secondaryActionLabel,
  secondaryActionDescription = '快速维护基础资料、联系人和联系方式',
  onSecondaryAction,
  headerLeadingAction,
  headerAction,
  preProfilePanel,
}: SubjectListPageProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (subjects.length === 0) {
      setActiveIndex(0);
      return;
    }
    if (activeIndex > subjects.length - 1) {
      setActiveIndex(subjects.length - 1);
    }
  }, [activeIndex, subjects.length]);

  useEffect(() => {
    const container = carouselRef.current;
    if (!container || subjects.length <= 1) return;

    const handleScroll = () => {
      const cards = Array.from(container.querySelectorAll<HTMLElement>('[data-elder-card="true"]'));
      if (cards.length === 0) return;

      const containerCenter = container.scrollLeft + container.clientWidth / 2;
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;

      cards.forEach((card, index) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const distance = Math.abs(cardCenter - containerCenter);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });

      setActiveIndex((current) => (current === nearestIndex ? current : nearestIndex));
    };

    handleScroll();
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [subjects.length]);

  function scrollToIndex(index: number) {
    const container = carouselRef.current;
    if (!container) return;
    const cards = Array.from(container.querySelectorAll<HTMLElement>('[data-elder-card="true"]'));
    const target = cards[index];
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    setActiveIndex(index);
  }

  const activeSubject = subjects[activeIndex] ?? subjects[0];

  function getBloodLabel(subject: CareSubject) {
    return subject.bloodType || '待补充';
  }

  function getStatusLabel(subject: CareSubject) {
    return subject.status || '待补充';
  }

  function getAllergyLabel(subject: CareSubject) {
    return subject.allergyHistory || '暂无明确过敏史';
  }

  return (
    <div className="sl-page sl-page-list">
      <PageHeader title={title} leadingAction={headerLeadingAction} action={headerAction} />

      {primaryHint ? (
        <div className="sl-permission-banner">
          <ShieldCheck size={16} />
          <span>{primaryHint}</span>
        </div>
      ) : null}

      <section className="sl-card sl-card-soft sl-search-panel">
        <div className="sl-search-box">
          <Search size={18} />
          <input
            className="sl-search-input"
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            placeholder={searchPlaceholder}
          />
          <span className="sl-search-divider" />
          <button type="button" className="sl-search-btn">
            搜索
          </button>
        </div>
      </section>

      {loading ? (
        <section className="sl-card">
          <div className="sl-empty-state">加载中...</div>
        </section>
      ) : subjects.length === 0 ? (
        <section className="sl-card">
          <div className="sl-empty-state">{emptyText}</div>
        </section>
      ) : (
        <section className="sl-archive-layout">
          <section className="sl-archive-overview">
            <div className="sl-archive-overview-copy">
              <span className="sl-overview-kicker">老人档案</span>
              <h2>{subjects.length > 1 ? '左右滑动切换档案' : '当前负责老人档案'}</h2>
              <p>
                当前共 {subjects.length} 位老人
                {subjects.length > 1 ? `，正在查看第 ${activeIndex + 1} 位` : ''}
              </p>
            </div>

            {subjects.length > 1 ? (
              <div className="sl-carousel-nav">
                <button
                  type="button"
                  className="sl-carousel-btn"
                  onClick={() => scrollToIndex(Math.max(0, activeIndex - 1))}
                  disabled={activeIndex === 0}
                  aria-label="上一位老人"
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  type="button"
                  className="sl-carousel-btn"
                  onClick={() => scrollToIndex(Math.min(subjects.length - 1, activeIndex + 1))}
                  disabled={activeIndex === subjects.length - 1}
                  aria-label="下一位老人"
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            ) : null}
          </section>

          <div className="sl-archive-carousel" ref={carouselRef}>
            {subjects.map((subject, index) => (
              <article
                key={subject.id}
                data-elder-card="true"
                className={`sl-archive-card${index === activeIndex ? ' is-active' : ''}`}
                onClick={() => scrollToIndex(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    scrollToIndex(index);
                  }
                }}
              >
                <div className="sl-archive-card-top">
                  <div className="sl-elder-avatar sl-elder-avatar-xl">
                    <User size={30} />
                  </div>
                  <div className="sl-archive-card-copy">
                    <div className="sl-elder-name-row">
                      <h3 className="sl-archive-card-name">{subject.name}</h3>
                    </div>
                    <div className="sl-archive-card-subtitle">
                      档案编号 {subject.archiveNo || '待生成'} {subject.gender || '待补充'} {subject.age ? `${subject.age}岁` : '年龄待补充'}
                    </div>
                    <div className="sl-archive-card-subtitle sl-archive-card-residence">
                      住址 {subject.residence || '待补充'}
                    </div>
                  </div>
                </div>

                <div className="sl-archive-card-grid">
                  <div className="sl-archive-data-pill">
                    <span>状态</span>
                    <strong>{getStatusLabel(subject)}</strong>
                  </div>
                  <div className="sl-archive-data-pill">
                    <span>联系人</span>
                    <strong>
                      {subject.emergencyContactName
                        ? `${subject.emergencyContactName}${subject.emergencyContactRelation ? `（${subject.emergencyContactRelation}）` : ''}`
                        : '待补充'}
                    </strong>
                  </div>
                  <div className="sl-archive-data-pill">
                    <span>联系电话</span>
                    <strong>{subject.emergencyContactPhone || '待补充'}</strong>
                  </div>
                  <div className="sl-archive-data-pill">
                    <span>{subject.bloodType ? '血型' : '过敏史'}</span>
                    <strong>{subject.bloodType ? getBloodLabel(subject) : getAllergyLabel(subject)}</strong>
                  </div>
                </div>

                <div className="sl-archive-card-footer">
                  <button
                    type="button"
                    className="sl-archive-inline-action"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(subject);
                    }}
                  >
                    <span>进入档案</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="sl-carousel-dots" aria-label="老人档案分页">
            {subjects.map((subject, index) => (
              <button
                key={subject.id}
                type="button"
                className={`sl-carousel-dot${index === activeIndex ? ' is-active' : ''}`}
                onClick={() => scrollToIndex(index)}
                aria-label={`切换到${subject.name}`}
              />
            ))}
          </div>

          {activeSubject ? (
            <>
              {preProfilePanel}

              {secondaryActionLabel && onSecondaryAction ? (
                <div className="sl-single-actions sl-archive-actions">
                  <button type="button" className="sl-single-action" onClick={() => onSecondaryAction(activeSubject)}>
                    <div>
                      <strong>{secondaryActionLabel}</strong>
                      <span>{secondaryActionDescription}</span>
                    </div>
                    <FilePenLine size={18} />
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      )}

      <p className="sl-list-footer">共 {subjects.length} 位老人</p>
    </div>
  );
}
