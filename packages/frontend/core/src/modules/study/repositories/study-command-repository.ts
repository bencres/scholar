import { Store } from '@toeverything/infra';

import type { StudyCardContent, StudyCardScheduling } from '../entities/card';
import type { StudyDeck } from '../entities/deck';
import type { StudyReviewLog } from '../entities/review-log';
import type { StudyDeckStorageState } from '../schema/storage';
import type { StudyDeckStore } from '../stores/study-deck';
import type { StudySidecarStore } from '../stores/study-sidecar';

export interface StudyWriteRepository {
  listDeckState(): Promise<StudyDeckStorageState>;
  saveDeckState(state: StudyDeckStorageState): Promise<void>;
  listDecks(): Promise<StudyDeck[]>;
  listCards(): Promise<StudyCardContent[]>;
  saveDecks(decks: StudyDeck[]): Promise<void>;
  listScheduling(): Promise<StudyCardScheduling[]>;
  upsertDeck(deck: StudyDeck): Promise<void>;
  upsertScheduling(row: StudyCardScheduling): Promise<void>;
  appendReviewLog(log: StudyReviewLog): Promise<void>;
  removeSchedulingForCard(cardId: string): Promise<void>;
}

export class StudyCommandRepository extends Store {
  constructor(
    private readonly deckStore: StudyDeckStore,
    private readonly sidecarStore: StudySidecarStore
  ) {
    super();
  }

  listDeckState() {
    return this.deckStore.listDeckState();
  }

  saveDeckState(state: StudyDeckStorageState) {
    return this.deckStore.saveDeckState(state);
  }

  listScheduling() {
    return this.sidecarStore.listScheduling();
  }

  listDecks() {
    return this.deckStore.listDecks();
  }

  listCards() {
    return this.deckStore.listCards();
  }

  saveDecks(decks: StudyDeck[]) {
    return this.deckStore.saveDecks(decks);
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

  removeSchedulingForCard(cardId: string) {
    return this.sidecarStore.removeSchedulingForCard(cardId);
  }
}
