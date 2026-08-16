import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, FilePenLine, Search, ShieldCheck, User } from 'lucide-react';
import type { CareSubject } from './types';
import { PageHeader } from '../components/PageHeader';
import { useI18n } from '../i18n';

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
  emptyText,
  searchPlaceholder,
  secondaryActionLabel,
  secondaryActionDescription,
  onSecondaryAction,
  headerLeadingAction,
  headerAction,
  preProfilePanel,
}: SubjectListPageProps) {
  const { t } = useI18n();
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
    return subject.bloodType || t('common.pendingSupplement');
  }

  function getStatusLabel(subject: CareSubject) {
    return subject.status || t('common.pendingSupplement');
  }

  function getAllergyLabel(subject: CareSubject) {
    return subject.allergyHistory || t('workbench.noKnownAllergy');
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
            className="sl-search-input sl-auto-data"
            dir="auto"
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            placeholder={searchPlaceholder || t('workbench.elderNameOrArchivePlaceholder')}
          />
          <span className="sl-search-divider" />
          <button type="button" className="sl-search-btn">
            {t('common.search')}
          </button>
        </div>
      </section>

      {loading ? (
        <section className="sl-card">
          <div className="sl-empty-state">{t('common.loading')}</div>
        </section>
      ) : subjects.length === 0 ? (
        <section className="sl-card">
          <div className="sl-empty-state">{emptyText || t('workbench.noAssignedElders')}</div>
        </section>
      ) : (
        <section className="sl-archive-layout">
          <section className="sl-archive-overview">
            <div className="sl-archive-overview-copy">
              <span className="sl-overview-kicker">{t('workbench.elderArchives')}</span>
              <h2>{subjects.length > 1 ? t('workbench.swipeToSwitch') : t('workbench.currentElderArchive')}</h2>
              <p>
                {t('common.currentCount', { count: subjects.length })}
                {subjects.length > 1 ? t('common.currentPosition', { position: activeIndex + 1 }) : ''}
              </p>
            </div>

            {subjects.length > 1 ? (
              <div className="sl-carousel-nav">
                <button
                  type="button"
                  className="sl-carousel-btn"
                  onClick={() => scrollToIndex(Math.max(0, activeIndex - 1))}
                  disabled={activeIndex === 0}
                  aria-label={t('common.previous')}
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  type="button"
                  className="sl-carousel-btn"
                  onClick={() => scrollToIndex(Math.min(subjects.length - 1, activeIndex + 1))}
                  disabled={activeIndex === subjects.length - 1}
                  aria-label={t('common.next')}
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
                    <h3 className="sl-archive-card-name sl-auto-data" dir="auto">{subject.name}</h3>
                    </div>
                    <div className="sl-archive-card-subtitle">
                      {t('common.archiveNumber')} <span className="sl-ltr-data">{subject.archiveNo || t('common.generatedPending')}</span> {subject.gender === '男' ? t('common.male') : subject.gender === '女' ? t('common.female') : subject.gender || t('common.pendingSupplement')} {subject.age ? t('common.yearsOld', { age: subject.age }) : t('common.agePending')}
                    </div>
                    <div className="sl-archive-card-subtitle sl-archive-card-residence">
                      {t('workbench.residence')} <span className="sl-auto-data" dir="auto">{subject.residence || t('common.pendingSupplement')}</span>
                    </div>
                  </div>
                </div>

                <div className="sl-archive-card-grid">
                  <div className="sl-archive-data-pill">
                    <span>{t('common.status')}</span>
                    <strong>{getStatusLabel(subject)}</strong>
                  </div>
                  <div className="sl-archive-data-pill">
                    <span>{t('common.contact')}</span>
                    <strong className="sl-auto-data" dir="auto">
                      {subject.emergencyContactName
                        ? `${subject.emergencyContactName}${subject.emergencyContactRelation ? `（${subject.emergencyContactRelation}）` : ''}`
                        : t('common.pendingSupplement')}
                    </strong>
                  </div>
                  <div className="sl-archive-data-pill">
                    <span>{t('common.contactPhone')}</span>
                    <strong className="sl-ltr-data">{subject.emergencyContactPhone || t('common.pendingSupplement')}</strong>
                  </div>
                  <div className="sl-archive-data-pill">
                    <span>{subject.bloodType ? t('common.bloodType') : t('common.allergyHistory')}</span>
                    <strong className="sl-auto-data" dir="auto">{subject.bloodType ? getBloodLabel(subject) : getAllergyLabel(subject)}</strong>
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
                    <span>{t('workbench.enterArchive')}</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="sl-carousel-dots" aria-label={t('workbench.elderArchives')}>
            {subjects.map((subject, index) => (
              <button
                key={subject.id}
                type="button"
                className={`sl-carousel-dot${index === activeIndex ? ' is-active' : ''}`}
                onClick={() => scrollToIndex(index)}
                aria-label={`${t('common.switchTo')}${subject.name}`}
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

      <p className="sl-list-footer">{t('common.totalElders', { count: subjects.length })}</p>
    </div>
  );
}
