import { Store } from '@toeverything/infra';
import { map, type Observable } from 'rxjs';

import type { WorkspaceServerService } from '../../cloud/services/workspace-server';
import type { CacheStorage } from '../../storage';
import type { WorkspaceService } from '../../workspace';
import type { StudyDeck } from '../entities/deck';
import {
  isDeckStorageState,
  normalizeDeckStorageState,
  normalizeSidecarStorageState,
  STUDY_DECK_STORAGE_VERSION,
  type StudyDeckStorageState,
} from '../schema/storage';
import { studyDeckStorageKey, studySidecarStorageKey } from './storage-keys';
import {
  fetchRemoteStudyStorageState,
  upsertRemoteStudyStorageState,
} from './study-storage-remote';

export class StudyDeckStore extends Store {
  private remoteHydrationPromise: Promise<void> | null = null;

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly cacheStorage: CacheStorage,
    private readonly workspaceServerService?: WorkspaceServerService
  ) {
    super();
  }

  private get key() {
    return studyDeckStorageKey(this.workspaceService.workspace.id);
  }

  private get sidecarKey() {
    return studySidecarStorageKey(this.workspaceService.workspace.id);
  }

  private get server() {
    if (this.workspaceService.workspace.flavour === 'local') {
      return null;
    }
    return this.workspaceServerService?.server ?? null;
  }

  private async ensureHydratedFromRemote() {
    const server = this.server;
    if (!server) {
      return;
    }
    this.remoteHydrationPromise ??= (async () => {
      const remote = await fetchRemoteStudyStorageState(
        server,
        this.workspaceService.workspace.id
      );
      if (!remote) {
        return;
      }

      if (remote.decks !== undefined) {
        await this.cacheStorage.set(
          this.key,
          normalizeDeckStorageState(remote.decks)
        );
      }
      if (remote.sidecar !== undefined) {
        await this.cacheStorage.set(
          this.sidecarKey,
          normalizeSidecarStorageState(remote.sidecar)
        );
      }
    })();

    try {
      await this.remoteHydrationPromise;
    } catch (error) {
      console.error(
        '[study] failed to hydrate deck storage from server',
        error
      );
    }
  }

  private async listDeckState(): Promise<StudyDeckStorageState> {
    await this.ensureHydratedFromRemote();
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

    if (this.server) {
      try {
        const sidecar = normalizeSidecarStorageState(
          await this.cacheStorage.get<unknown>(this.sidecarKey)
        );
        await upsertRemoteStudyStorageState(
          this.server,
          this.workspaceService.workspace.id,
          state as unknown as Record<string, unknown>,
          sidecar as unknown as Record<string, unknown>
        );
      } catch (error) {
        console.error('[study] failed to persist decks to server', error);
      }
    }

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
