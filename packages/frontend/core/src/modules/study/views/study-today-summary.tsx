import type { StudyActivityStreak } from '@affine/core/modules/study/utils/study-activity';
import type { StudyConceptCount } from '@affine/core/modules/study/utils/study-concept-stats';
import { useI18n } from '@affine/i18n';

import { StudyStreakBadge } from './study-streak-badge';
import * as styles from './styles.css';

export const StudyTodaySummary = ({
  streak,
  deckCount,
  activeCardCount,
  dueCount,
  leechCount,
  lapseCount,
  topConcepts,
}: {
  streak: StudyActivityStreak;
  deckCount: number;
  activeCardCount: number;
  dueCount: number;
  leechCount: number;
  lapseCount: number;
  topConcepts: StudyConceptCount[];
}) => {
  const t = useI18n();

  return (
    <div className={styles.todaySummaryRow}>
      <StudyStreakBadge streak={streak} dueCount={dueCount} />
      <div className={styles.librarySummaryCard}>
        <div className={styles.formTitle}>
          {t['com.affine.study.today.section.library.title']()}
        </div>
        <div className={styles.libraryStatGrid}>
          <div className={styles.libraryStat}>
            <span className={styles.libraryStatValue}>{deckCount}</span>
            <span>{t['com.affine.study.today.library.decks-short']()}</span>
          </div>
          <div className={styles.libraryStat}>
            <span className={styles.libraryStatValue}>{activeCardCount}</span>
            <span>{t['com.affine.study.today.library.cards-short']()}</span>
          </div>
          <div className={styles.libraryStat}>
            <span className={styles.libraryStatValue}>{dueCount}</span>
            <span>{t['com.affine.study.today.library.due-short']()}</span>
          </div>
        </div>
        {leechCount > 0 || lapseCount > 0 ? (
          <div className={styles.modeSummary}>
            {leechCount > 0 ? (
              <span>
                {t['com.affine.study.today.health.leeches']({
                  count: String(leechCount),
                })}
              </span>
            ) : null}
            {lapseCount > 0 ? (
              <span>
                {t['com.affine.study.today.health.lapses']({
                  count: String(lapseCount),
                })}
              </span>
            ) : null}
          </div>
        ) : null}
        {topConcepts.length ? (
          <>
            <div className={styles.formTitle}>
              {t['com.affine.study.today.library.top-concepts']()}
            </div>
            <div className={styles.conceptChipRow}>
              {topConcepts.map(concept => (
                <span key={concept.id} className={styles.conceptChip}>
                  {concept.label} ({concept.count})
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className={styles.heroSub}>
            {t['com.affine.study.today.library.no-concepts']()}
          </div>
        )}
      </div>
    </div>
  );
};
