import { Store } from '@toeverything/infra';
import { map, type Observable } from 'rxjs';

import type { CacheStorage } from '../../storage';
import type { WorkspaceService } from '../../workspace';
import type { StudyDeck } from '../entities/deck';
import {
  isDeckStorageState,
  normalizeDeckStorageState,
  STUDY_DECK_STORAGE_VERSION,
  type StudyDeckStorageState,
} from '../schema/storage';

function storageKey(workspaceId: string) {
  return `study-decks:${workspaceId}`;
}

export class StudyDeckStore extends Store {
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly cacheStorage: CacheStorage
  ) {
    super();
  }

  private get key() {
    return storageKey(this.workspaceService.workspace.id);
  }

  private async listDeckState(): Promise<StudyDeckStorageState> {
    const raw = await this.cacheStorage.get<unknown>(this.key);
    const state = normalizeDeckStorageState(raw);
    if (!isDeckStorageState(raw)) {
      await this.cacheStorage.set(this.key, state);
    }
    return state;
  }

  async listDecks(): Promise<StudyDeck[]> {
    return (await this.listDeckState()).decks;
  }

  watchDecks(): Observable<StudyDeck[]> {
    return this.cacheStorage
      .watch<unknown>(this.key)
      .pipe(map(raw => normalizeDeckStorageState(raw).decks));
  }

  async saveDecks(decks: StudyDeck[]) {
    const state: StudyDeckStorageState = {
      version: STUDY_DECK_STORAGE_VERSION,
      decks,
    };
    await this.cacheStorage.set(this.key, state);
  }

  async upsertDeck(deck: StudyDeck) {
    const decks = await this.listDecks();
    const index = decks.findIndex(item => item.id === deck.id);
    if (index >= 0) {
      decks[index] = deck;
    } else {
      decks.push(deck);
    }
    await this.saveDecks(decks);
  }
}
