import { Store } from '@toeverything/infra';
import type { Observable } from 'rxjs';

import type { StudyCardScheduling } from '../entities/card';
import type { StudyDeck } from '../entities/deck';
import type { StudyReviewLog, StudyReviewStats } from '../entities/review-log';
import type { StudyDeckStore } from '../stores/study-deck';
import type { StudySidecarStore } from '../stores/study-sidecar';

export interface StudyReadRepository {
  listDecks(): Promise<StudyDeck[]>;
  watchDecks(): Observable<StudyDeck[]>;
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

  listDecks(): Promise<StudyDeck[]> {
    return this.deckStore.listDecks();
  }

  watchDecks(): Observable<StudyDeck[]> {
    return this.deckStore.watchDecks();
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

  summarizeReviewStats(deckId?: string): Promise<StudyReviewStats> {
    return this.sidecarStore.summarizeReviewStats(deckId);
  }
}
