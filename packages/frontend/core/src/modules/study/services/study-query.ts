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
import {
  buildStudyActivitySnapshot,
  DEFAULT_STUDY_ACTIVITY_WINDOW_DAYS,
} from '../utils/study-activity';
import {
  buildWorkloadForecastWithConcepts,
  countTopConcepts,
} from '../utils/study-concept-stats';
import { buildStudyStatsSnapshot } from '../utils/study-stats';
import {
  buildCardMap,
  getDeckCards,
  getDecksForCard,
} from '../utils/study-storage';

export class StudyQueryService extends Service {
  readonly deckState$ = LiveData.from(this.queryRepository.watchDeckState(), {
    version: 3 as const,
    cards: [],
    decks: [],
  });

  readonly decks$ = LiveData.from(
    this.queryRepository.watchDecks(),
    [] as StudyDeck[]
  );

  readonly cards$ = LiveData.from(
    this.queryRepository.watchCards(),
    [] as StudyCardContent[]
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
    const cards = get(this.cards$);
    const activeIds = new Set(
      cards.filter(card => !card.suspended).map(card => card.id)
    );
    return get(this.scheduling$).filter(
      row => activeIds.has(row.cardId) && isDue(row, now)
    ).length;
  });

  readonly dueCountByDeck$ = LiveData.computed(get => {
    const now = Date.now();
    const state = get(this.deckState$);
    const scheduling = get(this.scheduling$);
    const cardMap = buildCardMap(state.cards);
    const counts = new Map<string, number>();
    for (const deck of state.decks) {
      let count = 0;
      for (const cardId of deck.cardIds) {
        const card = cardMap.get(cardId);
        if (!card || card.suspended) continue;
        const row = scheduling.find(item => item.cardId === cardId);
        if (row && isDue(row, now)) count += 1;
      }
      counts.set(deck.id, count);
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

  card$(cardId: string) {
    return this.cards$.map(cards => cards.find(card => card.id === cardId));
  }

  decksForCard$(cardId: string) {
    return this.decks$.map(decks => getDecksForCard(cardId, decks));
  }

  dueCountForDeck$(deckId: string) {
    return this.dueCountByDeck$.map(counts => counts.get(deckId) ?? 0);
  }

  schedulingForDeck$(deckId: string) {
    return LiveData.computed(get => {
      const deck = get(this.decks$).find(item => item.id === deckId);
      if (!deck) return [];
      const cardIds = new Set(deck.cardIds);
      return get(this.scheduling$).filter(row => cardIds.has(row.cardId));
    });
  }

  reviewQueue$(deckId?: string) {
    return LiveData.computed(get => {
      const now = Date.now();
      const state = get(this.deckState$);
      const scheduling = get(this.scheduling$).filter(row => isDue(row, now));
      const cardMap = buildCardMap(state.cards);
      const deckCardIds = deckId
        ? new Set(state.decks.find(deck => deck.id === deckId)?.cardIds ?? [])
        : null;

      return scheduling
        .map(row => cardMap.get(row.cardId))
        .filter((card): card is StudyCardContent => {
          if (!card || card.suspended) return false;
          if (deckCardIds && !deckCardIds.has(card.id)) return false;
          return true;
        })
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

  getDeckCards(deckId: string): StudyCardContent[] {
    const deck = this.getDeckById(deckId);
    if (!deck) return [];
    return getDeckCards(deck, this.cards$.value);
  }

  findCardById(cardId: string): StudyCardContent | undefined {
    return this.cards$.value.find(card => card.id === cardId);
  }

  searchCards(query: string, deckId?: string) {
    const state = this.deckState$.value;
    const schedulingByCardId = new Map(
      this.scheduling$.value.map(row => [row.cardId, row])
    );
    const normalizedQuery = query.trim();
    const decks = deckId
      ? state.decks.filter(deck => deck.id === deckId)
      : state.decks;
    const deckById = new Map(decks.map(deck => [deck.id, deck]));
    const candidateIds = new Set<string>();
    if (deckId) {
      const deck = deckById.get(deckId);
      deck?.cardIds.forEach(id => candidateIds.add(id));
    } else {
      for (const deck of state.decks) {
        deck.cardIds.forEach(id => candidateIds.add(id));
      }
      for (const card of state.cards) {
        candidateIds.add(card.id);
      }
    }

    const cardMap = buildCardMap(state.cards);
    const candidates = [...candidateIds]
      .map(id => cardMap.get(id))
      .filter((card): card is StudyCardContent => !!card);

    if (!normalizedQuery) {
      return candidates;
    }

    return candidates.filter(card => {
      const membershipDecks = getDecksForCard(card.id, state.decks);
      const primaryDeck = membershipDecks[0] ?? decks[0];
      if (!primaryDeck) {
        return matchStudyBrowserQuery(normalizedQuery, {
          deck: {
            id: '__unassigned__',
            name: '',
            cardIds: [],
            createdAt: 0,
            updatedAt: 0,
          },
          card,
          scheduling: schedulingByCardId.get(card.id),
          unassigned: membershipDecks.length === 0,
        });
      }
      return membershipDecks.some(deck =>
        matchStudyBrowserQuery(normalizedQuery, {
          deck,
          card,
          scheduling: schedulingByCardId.get(card.id),
          unassigned: false,
        })
      );
    });
  }

  statsSnapshot(deckId?: string) {
    const state = this.deckState$.value;
    const cardIds = deckId
      ? new Set(
          getDeckCards(
            state.decks.find(deck => deck.id === deckId) ?? {
              id: deckId,
              name: '',
              cardIds: [],
              createdAt: 0,
              updatedAt: 0,
            },
            state.cards
          ).map(card => card.id)
        )
      : null;
    const scheduling = cardIds
      ? this.scheduling$.value.filter(row => cardIds.has(row.cardId))
      : this.scheduling$.value;
    const logs = cardIds
      ? this.reviewLogs$.value.filter(log => cardIds.has(log.cardId))
      : this.reviewLogs$.value;
    return buildStudyStatsSnapshot(scheduling, logs);
  }

  learningGraphSnapshot(deckId?: string) {
    const state = this.deckState$.value;
    const decks = deckId
      ? state.decks.filter(deck => deck.id === deckId)
      : state.decks;
    const cardIds = new Set(
      decks.flatMap(deck =>
        getDeckCards(deck, state.cards).map(card => card.id)
      )
    );
    const scheduling = this.scheduling$.value.filter(row =>
      cardIds.has(row.cardId)
    );
    const logs = this.reviewLogs$.value.filter(log => cardIds.has(log.cardId));
    return buildStudyLearningGraphSnapshot({
      decks,
      cards: state.cards,
      scheduling,
      reviewLogs: logs,
    });
  }

  adaptiveTutorSnapshot(targetCount?: number) {
    return buildAdaptiveTutorSnapshot({
      decks: this.decks$.value,
      cards: this.cards$.value,
      scheduling: this.scheduling$.value,
      reviewLogs: this.reviewLogs$.value,
      targetCount,
    });
  }

  intelligenceDashboardSnapshot() {
    const learningGraph = this.learningGraphSnapshot();
    const tutor = this.adaptiveTutorSnapshot();
    const stats = this.statsSnapshot();
    return buildIntelligenceDashboardSnapshot({
      learningGraph,
      tutor,
      stats,
      scheduling: this.scheduling$.value,
    });
  }

  activitySnapshot(windowDays = DEFAULT_STUDY_ACTIVITY_WINDOW_DAYS) {
    return buildStudyActivitySnapshot({
      cards: this.cards$.value,
      reviewLogs: this.reviewLogs$.value,
      windowDays,
    });
  }

  topConcepts(limit = 5) {
    return countTopConcepts(this.cards$.value, limit);
  }

  workloadForecastWithConcepts() {
    return buildWorkloadForecastWithConcepts({
      cards: this.cards$.value,
      scheduling: this.scheduling$.value,
    });
  }
}
