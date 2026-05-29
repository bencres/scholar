import { Store } from '@toeverything/infra';
import { map, type Observable } from 'rxjs';

import type { CacheStorage } from '../../storage';
import type { WorkspaceService } from '../../workspace';
import type { StudyDeck } from '../entities/deck';

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

  async listDecks(): Promise<StudyDeck[]> {
    return (await this.cacheStorage.get<StudyDeck[]>(this.key)) ?? [];
  }

  watchDecks(): Observable<StudyDeck[]> {
    return this.cacheStorage
      .watch<StudyDeck[]>(this.key)
      .pipe(map(decks => decks ?? []));
  }

  async saveDecks(decks: StudyDeck[]) {
    await this.cacheStorage.set(this.key, decks);
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
