import { Button } from '@affine/component';
import { StudyService } from '@affine/core/modules/study';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { useLiveData, useService } from '@toeverything/infra';
import { useMemo } from 'react';

import { StudyActivityCharts } from './study-activity-charts';
import { StudyDeckListItem } from './study-deck-list-item';
import { StudyStreakBadge } from './study-streak-badge';
import * as styles from './styles.css';

export const StudyTodayDashboard = () => {
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
          <div className={styles.formTitle}>How you are doing</div>
          <div className={styles.modeSummary}>
            {stats.leechCount > 0 ? (
              <span>{stats.leechCount} leeches</span>
            ) : null}
            {stats.lapseCount > 0 ? (
              <span>{stats.lapseCount} lapses</span>
            ) : null}
          </div>
        </div>
      ) : null}

      {learningGraph.mappedCards > 0 ? (
        <div className={styles.formCard}>
          <div className={styles.modeSummary}>
            <span>
              {learningGraph.mappedCards} of {learningGraph.totalCards} cards
              mapped to concepts
            </span>
            <Button
              onClick={() => workbench.open('/study/graph', { at: 'active' })}
            >
              Open learning graph
            </Button>
          </div>
        </div>
      ) : null}

      <div className={styles.formCard}>
        <div className={styles.formTitle}>Upcoming reviews</div>
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
              ? 'No decks yet. Generate cards from a note or create a deck to start.'
              : 'You are caught up. No cards are due right now.'}
          </div>
        )}
      </div>

      <div className={styles.formCard}>
        <div className={styles.formTitle}>7-day workload</div>
        <div className={styles.conceptGrid}>
          {stats.workloadForecast.map(day => (
            <div key={day.dayOffset} className={styles.conceptCard}>
              <div className={styles.conceptTitle}>Day {day.dayOffset + 1}</div>
              <div className={styles.conceptMeta}>{day.dueCount} due</div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.formCard}>
        <div className={styles.formTitle}>Learn efficiently</div>
        {recommendations.length ? (
          <>
            <div className={styles.formTitle}>Suggestions</div>
            <div className={styles.modeSummary}>
              {recommendations.map(item => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </>
        ) : null}
        <div className={styles.formTitle}>Study modes</div>
        <div className={styles.modeGrid}>
          <Button
            onClick={() =>
              workbench.open('/study/flashcards', { at: 'active' })
            }
          >
            Flashcards
          </Button>
          <Button
            onClick={() => workbench.open('/study/learn', { at: 'active' })}
          >
            Learn
          </Button>
          <Button
            onClick={() => workbench.open('/study/test', { at: 'active' })}
          >
            Test
          </Button>
          <Button
            onClick={() => workbench.open('/study/graph', { at: 'active' })}
          >
            Learning graph
          </Button>
          <Button
            onClick={() => workbench.open('/study/tutor', { at: 'active' })}
          >
            Adaptive tutor
          </Button>
          <Button
            onClick={() => workbench.open('/study/dashboard', { at: 'active' })}
          >
            Insights
          </Button>
        </div>
        <div className={styles.actionsRow}>
          <Button
            onClick={() => workbench.open('/study/decks', { at: 'active' })}
          >
            Browse decks
          </Button>
          <Button
            onClick={() => workbench.open('/study/cards', { at: 'active' })}
          >
            Browse cards
          </Button>
          <Button
            onClick={() => workbench.open('/study/generate', { at: 'active' })}
          >
            Generate
          </Button>
          {dueCount > 0 ? (
            <Button
              variant="primary"
              onClick={() => workbench.open('/study/review', { at: 'active' })}
            >
              Review due ({dueCount})
            </Button>
          ) : null}
        </div>
      </div>

      <div className={styles.formCard}>
        <div className={styles.formTitle}>Library</div>
        <div className={styles.modeSummary}>
          <span>{decks.length} decks</span>
          <span>{activeCardCount} active cards</span>
          <span>{dueCount} due today</span>
        </div>
      </div>
    </>
  );
};
