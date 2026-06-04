import { Button } from '@affine/component';
import { StudyService } from '@affine/core/modules/study';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { useLiveData, useService } from '@toeverything/infra';
import { useMemo } from 'react';

import { StudyActivityCharts } from './study-activity-charts';
import { StudyDeckListItem } from './study-deck-list-item';
import { StudyStreakBadge } from './study-streak-badge';
import * as styles from './styles.css';

export const StudyTodayDashboard = () => {
  const t = useI18n();
  const studyService = useService(StudyService);
  const workbench = useService(WorkbenchService).workbench;
  const decks = useLiveData(studyService.decks$);
  const cards = useLiveData(studyService.cards$);
  const dueCount = useLiveData(studyService.dueCount$);
  const dueByDeck = useLiveData(studyService.dueCountByDeck$);

  const activity = useMemo(
    () => studyService.activitySnapshot(),
    [studyService]
  );
  const stats = useMemo(() => studyService.statsSnapshot(), [studyService]);
  const learningGraph = useMemo(
    () => studyService.learningGraphSnapshot(),
    [studyService]
  );
  const recommendations = useMemo(
    () =>
      studyService.intelligenceDashboardSnapshot().recommendations.slice(0, 2),
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
      <StudyStreakBadge streak={activity.streak} />
      <StudyActivityCharts snapshot={activity} />

      {stats.leechCount > 0 || stats.lapseCount > 0 ? (
        <div className={styles.formCard}>
          <div className={styles.formTitle}>
            {t['com.affine.study.today.section.progress.title']()}
          </div>
          <div className={styles.modeSummary}>
            {stats.leechCount > 0 ? (
              <span>
                {t['com.affine.study.today.health.leeches']({
                  count: String(stats.leechCount),
                })}
              </span>
            ) : null}
            {stats.lapseCount > 0 ? (
              <span>
                {t['com.affine.study.today.health.lapses']({
                  count: String(stats.lapseCount),
                })}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {learningGraph.mappedCards > 0 ? (
        <div className={styles.formCard}>
          <div className={styles.modeSummary}>
            <span>
              {t['com.affine.study.today.concept-coverage']({
                mapped: String(learningGraph.mappedCards),
                total: String(learningGraph.totalCards),
              })}
            </span>
            <Button
              onClick={() => workbench.open('/study/graph', { at: 'active' })}
            >
              {t['com.affine.study.today.concept-coverage.link']()}
            </Button>
          </div>
        </div>
      ) : null}

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

      <div className={styles.formCard}>
        <div className={styles.formTitle}>
          {t['com.affine.study.today.forecast.title']()}
        </div>
        <div className={styles.conceptGrid}>
          {stats.workloadForecast.map(day => (
            <div key={day.dayOffset} className={styles.conceptCard}>
              <div className={styles.conceptTitle}>
                {t['com.affine.study.today.forecast.day']({
                  offset: String(day.dayOffset + 1),
                })}
              </div>
              <div className={styles.conceptMeta}>
                {t['com.affine.study.today.forecast.due']({
                  count: String(day.dueCount),
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.formCard}>
        <div className={styles.formTitle}>
          {t['com.affine.study.today.section.efficient.title']()}
        </div>
        {recommendations.length ? (
          <>
            <div className={styles.formTitle}>
              {t['com.affine.study.today.recommendations.title']()}
            </div>
            <div className={styles.modeSummary}>
              {recommendations.map(item => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </>
        ) : null}
        <div className={styles.formTitle}>
          {t['com.affine.study.today.modes.title']()}
        </div>
        <div className={styles.modeGrid}>
          <Button
            onClick={() =>
              workbench.open('/study/flashcards', { at: 'active' })
            }
          >
            {t['com.affine.study.flashcards.title']()}
          </Button>
          <Button
            onClick={() => workbench.open('/study/learn', { at: 'active' })}
          >
            {t['com.affine.study.learn.title']()}
          </Button>
          <Button
            onClick={() => workbench.open('/study/test', { at: 'active' })}
          >
            {t['com.affine.study.test.title']()}
          </Button>
          <Button
            onClick={() => workbench.open('/study/graph', { at: 'active' })}
          >
            {t['com.affine.study.today.graph.title']()}
          </Button>
          <Button
            onClick={() => workbench.open('/study/tutor', { at: 'active' })}
          >
            {t['com.affine.study.today.tutor.title']()}
          </Button>
          <Button
            onClick={() => workbench.open('/study/dashboard', { at: 'active' })}
          >
            {t['com.affine.study.today.insights.title']()}
          </Button>
        </div>
        <div className={styles.actionsRow}>
          <Button
            onClick={() => workbench.open('/study/decks', { at: 'active' })}
          >
            {t['com.affine.study.today.quick.decks']()}
          </Button>
          <Button
            onClick={() => workbench.open('/study/cards', { at: 'active' })}
          >
            {t['com.affine.study.today.quick.cards']()}
          </Button>
          <Button
            onClick={() => workbench.open('/study/generate', { at: 'active' })}
          >
            {t['com.affine.study.generate.title']()}
          </Button>
          {dueCount > 0 ? (
            <Button
              variant="primary"
              onClick={() => workbench.open('/study/review', { at: 'active' })}
            >
              {t['com.affine.study.review-due']({ count: String(dueCount) })}
            </Button>
          ) : null}
        </div>
      </div>

      <div className={styles.formCard}>
        <div className={styles.formTitle}>
          {t['com.affine.study.today.section.library.title']()}
        </div>
        <div className={styles.modeSummary}>
          <span>
            {t['com.affine.study.today.library.decks']({
              count: String(decks.length),
            })}
          </span>
          <span>
            {t['com.affine.study.today.library.cards']({
              count: String(activeCardCount),
            })}
          </span>
          <span>
            {t['com.affine.study.today.library.due']({
              count: String(dueCount),
            })}
          </span>
        </div>
      </div>
    </>
  );
};
