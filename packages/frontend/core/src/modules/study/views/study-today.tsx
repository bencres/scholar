import { StudyService } from '@affine/core/modules/study';
import { useI18n } from '@affine/i18n';
import { useLiveData, useService } from '@toeverything/infra';
import { useMemo } from 'react';

import { StudyActivityCharts } from './study-activity-charts';
import { StudyDeckListItem } from './study-deck-list-item';
import { StudyModeCards } from './study-mode-cards';
import { StudyTodaySummary } from './study-today-summary';
import { StudyWorkloadTimeline } from './study-workload-timeline';
import * as styles from './styles.css';

export const StudyTodayDashboard = () => {
  const t = useI18n();
  const studyService = useService(StudyService);
  const decks = useLiveData(studyService.decks$);
  const cards = useLiveData(studyService.cards$);
  const dueCount = useLiveData(studyService.dueCount$);
  const dueByDeck = useLiveData(studyService.dueCountByDeck$);

  const activity = useMemo(
    () => studyService.activitySnapshot(),
    [studyService]
  );
  const stats = useMemo(() => studyService.statsSnapshot(), [studyService]);
  const topConcepts = useMemo(
    () => studyService.topConcepts(5),
    [studyService]
  );
  const workloadDays = useMemo(
    () => studyService.workloadForecastWithConcepts(),
    [studyService]
  );
  const learningGraph = useMemo(
    () => studyService.learningGraphSnapshot(),
    [studyService]
  );

  const activeCardCount = useMemo(
    () => cards.filter(card => !card.suspended).length,
    [cards]
  );

  const dueDecks = useMemo(
    () =>
      [...decks]
        .map(deck => ({
          deck,
          dueCount: dueByDeck.get(deck.id) ?? 0,
        }))
        .filter(item => item.dueCount > 0)
        .sort((a, b) => b.dueCount - a.dueCount),
    [decks, dueByDeck]
  );

  return (
    <>
      <StudyTodaySummary
        streak={activity.streak}
        deckCount={decks.length}
        activeCardCount={activeCardCount}
        dueCount={dueCount}
        leechCount={stats.leechCount}
        lapseCount={stats.lapseCount}
        topConcepts={topConcepts}
      />
      <StudyActivityCharts snapshot={activity} />
      <div className={styles.formCard}>
        <div className={styles.formTitle}>
          {t['com.affine.study.today.section.upcoming.title']()}
        </div>
        {dueDecks.length ? (
          <div className={styles.deckList}>
            {dueDecks.map(({ deck, dueCount: deckDue }) => (
              <StudyDeckListItem
                key={deck.id}
                deck={deck}
                cards={cards}
                dueCount={deckDue}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            {decks.length === 0
              ? t['com.affine.study.today.due.empty-decks']()
              : t['com.affine.study.today.due.caught-up']()}
          </div>
        )}
      </div>
      <StudyWorkloadTimeline days={workloadDays} />
      {learningGraph.mappedCards > 0 ? (
        <div className={styles.formCard}>
          <div className={styles.modeSummary}>
            <span>
              {t['com.affine.study.today.concept-coverage']({
                mapped: String(learningGraph.mappedCards),
                total: String(learningGraph.totalCards),
              })}
            </span>
          </div>
        </div>
      ) : null}
      <StudyModeCards />
    </>
  );
};
