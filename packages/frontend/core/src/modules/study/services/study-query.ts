import { LiveData, Service } from '@toeverything/infra';

import type { FeatureFlagService } from '../../feature-flag';
import type { StudyCardContent, StudyCardScheduling } from '../entities/card';
import type { StudyDeck } from '../entities/deck';
import type { StudyReviewLog } from '../entities/review-log';
import type { StudyQueryRepository } from '../repositories/study-query-repository';
import { buildAdaptiveTutorSnapshot } from '../utils/adaptive-tutor';
import { matchStudyBrowserQuery } from '../utils/card-browser-search';
import { buildIntelligenceDashboardSnapshot } from '../utils/intelligence-dashboard';
import { buildStudyLearningGraphSnapshot } from '../utils/learning-graph';
import { isDue } from '../utils/scheduling';
import { buildStudyStatsSnapshot } from '../utils/study-stats';

export class StudyQueryService extends Service {
  readonly decks$ = LiveData.from(
    this.queryRepository.watchDecks(),
    [] as StudyDeck[]
  );

  readonly scheduling$ = LiveData.from(
    this.queryRepository.watchScheduling(),
    [] as StudyCardScheduling[]
  );

  readonly reviewLogs$ = LiveData.from(
    this.queryRepository.watchReviewLogs(),
    [] as StudyReviewLog[]
  );

  readonly dueCount$ = LiveData.computed(get => {
    const now = Date.now();
    return get(this.scheduling$).filter(row => isDue(row, now)).length;
  });

  readonly dueCountByDeck$ = LiveData.computed(get => {
    const now = Date.now();
    const counts = new Map<string, number>();
    for (const row of get(this.scheduling$)) {
      if (!isDue(row, now)) continue;
      counts.set(row.deckId, (counts.get(row.deckId) ?? 0) + 1);
    }
    return counts;
  });

  constructor(
    private readonly queryRepository: StudyQueryRepository,
    private readonly featureFlagService: FeatureFlagService
  ) {
    super();
  }

  get enabled() {
    return this.featureFlagService.flags.enable_study.value === true;
  }

  deck$(deckId: string) {
    return this.decks$.map(decks => decks.find(deck => deck.id === deckId));
  }

  dueCountForDeck$(deckId: string) {
    return LiveData.computed(get => {
      const now = Date.now();
      return get(this.scheduling$).filter(
        row => row.deckId === deckId && isDue(row, now)
      ).length;
    });
  }

  schedulingForDeck$(deckId: string) {
    return this.scheduling$.map(rows =>
      rows.filter(row => row.deckId === deckId)
    );
  }

  reviewQueue$(deckId?: string) {
    return LiveData.computed(get => {
      const now = Date.now();
      const decks = get(this.decks$);
      const scheduling = get(this.scheduling$).filter(row => {
        if (deckId && row.deckId !== deckId) return false;
        return isDue(row, now);
      });
      const cardMap = new Map<string, StudyCardContent>();
      for (const deck of decks) {
        if (deckId && deck.id !== deckId) continue;
        for (const card of deck.cards) {
          if (!card.suspended) {
            cardMap.set(card.id, card);
          }
        }
      }
      return scheduling
        .map(row => cardMap.get(row.cardId))
        .filter((card): card is StudyCardContent => !!card)
        .sort((a, b) => {
          const aDue =
            scheduling.find(row => row.cardId === a.id)?.due ??
            Number.MAX_SAFE_INTEGER;
          const bDue =
            scheduling.find(row => row.cardId === b.id)?.due ??
            Number.MAX_SAFE_INTEGER;
          return aDue - bDue;
        });
    });
  }

  getDeckById(deckId: string) {
    return this.decks$.value.find(deck => deck.id === deckId);
  }

  findCardById(cardId: string): StudyCardContent | undefined {
    for (const deck of this.decks$.value) {
      const card = deck.cards.find(item => item.id === cardId);
      if (card) return card;
    }
    return undefined;
  }

  searchCards(query: string, deckId?: string) {
    const schedulingByCardId = new Map(
      this.scheduling$.value.map(row => [row.cardId, row])
    );
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return (
        deckId
          ? this.decks$.value.filter(deck => deck.id === deckId)
          : this.decks$.value
      ).flatMap(deck => deck.cards);
    }
    return this.decks$.value
      .filter(deck => (deckId ? deck.id === deckId : true))
      .flatMap(deck =>
        deck.cards.filter(card =>
          matchStudyBrowserQuery(normalizedQuery, {
            deck,
            card,
            scheduling: schedulingByCardId.get(card.id),
          })
        )
      );
  }

  statsSnapshot(deckId?: string) {
    const scheduling = deckId
      ? this.scheduling$.value.filter(row => row.deckId === deckId)
      : this.scheduling$.value;
    const logs = deckId
      ? this.reviewLogs$.value.filter(log => log.deckId === deckId)
      : this.reviewLogs$.value;
    return buildStudyStatsSnapshot(scheduling, logs);
  }

  learningGraphSnapshot(deckId?: string) {
    const decks = deckId
      ? this.decks$.value.filter(deck => deck.id === deckId)
      : this.decks$.value;
    const deckIds = new Set(decks.map(deck => deck.id));
    const scheduling = this.scheduling$.value.filter(row =>
      deckIds.has(row.deckId)
    );
    const logs = this.reviewLogs$.value.filter(log => deckIds.has(log.deckId));
    return buildStudyLearningGraphSnapshot({
      decks,
      scheduling,
      reviewLogs: logs,
    });
  }

  adaptiveTutorSnapshot(targetCount = 8) {
    return buildAdaptiveTutorSnapshot({
      decks: this.decks$.value,
      scheduling: this.scheduling$.value,
      reviewLogs: this.reviewLogs$.value,
      learningGraph: this.learningGraphSnapshot(),
      targetCount,
    });
  }

  intelligenceDashboardSnapshot() {
    return buildIntelligenceDashboardSnapshot({
      learningGraph: this.learningGraphSnapshot(),
      tutor: this.adaptiveTutorSnapshot(),
      stats: this.statsSnapshot(),
      scheduling: this.scheduling$.value,
    });
  }
}
