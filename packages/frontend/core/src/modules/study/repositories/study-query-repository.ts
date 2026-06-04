import { Store } from '@toeverything/infra';
import type { Observable } from 'rxjs';

import type { StudyCardContent, StudyCardScheduling } from '../entities/card';
import type { StudyDeck } from '../entities/deck';
import type { StudyReviewLog, StudyReviewStats } from '../entities/review-log';
import type { StudyDeckStorageState } from '../schema/storage';
import type { StudyDeckStore } from '../stores/study-deck';
import type { StudySidecarStore } from '../stores/study-sidecar';
import { getDeckCards } from '../utils/study-storage';

export interface StudyReadRepository {
  listDeckState(): Promise<StudyDeckStorageState>;
  watchDeckState(): Observable<StudyDeckStorageState>;
  listDecks(): Promise<StudyDeck[]>;
  watchDecks(): Observable<StudyDeck[]>;
  listCards(): Promise<StudyCardContent[]>;
  watchCards(): Observable<StudyCardContent[]>;
  listScheduling(): Promise<StudyCardScheduling[]>;
  watchScheduling(): Observable<StudyCardScheduling[]>;
  listReviewLogs(): Promise<StudyReviewLog[]>;
  watchReviewLogs(): Observable<StudyReviewLog[]>;
  summarizeReviewStats(deckId?: string): Promise<StudyReviewStats>;
}

export class StudyQueryRepository extends Store {
  constructor(
    private readonly deckStore: StudyDeckStore,
    private readonly sidecarStore: StudySidecarStore
  ) {
    super();
  }

  listDeckState(): Promise<StudyDeckStorageState> {
    return this.deckStore.listDeckState();
  }

  watchDeckState(): Observable<StudyDeckStorageState> {
    return this.deckStore.watchDeckState();
  }

  listDecks(): Promise<StudyDeck[]> {
    return this.deckStore.listDecks();
  }

  watchDecks(): Observable<StudyDeck[]> {
    return this.deckStore.watchDecks();
  }

  listCards(): Promise<StudyCardContent[]> {
    return this.deckStore.listCards();
  }

  watchCards(): Observable<StudyCardContent[]> {
    return this.deckStore.watchCards();
  }

  listScheduling(): Promise<StudyCardScheduling[]> {
    return this.sidecarStore.listScheduling();
  }

  watchScheduling(): Observable<StudyCardScheduling[]> {
    return this.sidecarStore.watchScheduling();
  }

  listReviewLogs(): Promise<StudyReviewLog[]> {
    return this.sidecarStore.listReviewLogs();
  }

  watchReviewLogs(): Observable<StudyReviewLog[]> {
    return this.sidecarStore.watchReviewLogs();
  }

  async summarizeReviewStats(deckId?: string): Promise<StudyReviewStats> {
    if (!deckId) {
      return this.sidecarStore.summarizeReviewStats();
    }
    const [state, logs] = await Promise.all([
      this.listDeckState(),
      this.listReviewLogs(),
    ]);
    const deck = state.decks.find(item => item.id === deckId);
    if (!deck) {
      return this.sidecarStore.summarizeReviewStats();
    }
    const cardIds = new Set(
      getDeckCards(deck, state.cards).map(card => card.id)
    );
    const { summarizeReviewLogs } = await import('../schema/storage');
    return summarizeReviewLogs(logs.filter(log => cardIds.has(log.cardId)));
  }
}
