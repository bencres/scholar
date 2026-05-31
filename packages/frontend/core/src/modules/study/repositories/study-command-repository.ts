import { Store } from '@toeverything/infra';

import type { StudyCardScheduling } from '../entities/card';
import type { StudyDeck } from '../entities/deck';
import type { StudyReviewLog } from '../entities/review-log';
import type { StudyDeckStore } from '../stores/study-deck';
import type { StudySidecarStore } from '../stores/study-sidecar';

export interface StudyWriteRepository {
  listScheduling(): Promise<StudyCardScheduling[]>;
  upsertDeck(deck: StudyDeck): Promise<void>;
  upsertScheduling(row: StudyCardScheduling): Promise<void>;
  appendReviewLog(log: StudyReviewLog): Promise<void>;
  removeSchedulingForDeck(deckId: string): Promise<void>;
}

export class StudyCommandRepository extends Store {
  constructor(
    private readonly deckStore: StudyDeckStore,
    private readonly sidecarStore: StudySidecarStore
  ) {
    super();
  }

  listScheduling() {
    return this.sidecarStore.listScheduling();
  }

  upsertDeck(deck: StudyDeck) {
    return this.deckStore.upsertDeck(deck);
  }

  upsertScheduling(row: StudyCardScheduling) {
    return this.sidecarStore.upsertScheduling(row);
  }

  appendReviewLog(log: StudyReviewLog) {
    return this.sidecarStore.appendReviewLog(log);
  }

  removeSchedulingForDeck(deckId: string) {
    return this.sidecarStore.removeSchedulingForDeck(deckId);
  }
}
