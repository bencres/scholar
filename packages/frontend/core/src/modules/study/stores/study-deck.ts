import { Store } from '@toeverything/infra';
import { map, type Observable } from 'rxjs';

import type { WorkspaceServerService } from '../../cloud/services/workspace-server';
import type { CacheStorage } from '../../storage';
import type { WorkspaceService } from '../../workspace';
import type { StudyCardContent } from '../entities/card';
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
import {
  patchStudySyncMeta,
  readStudySyncMeta,
} from './study-storage-sync-meta';

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

  private get workspaceId() {
    return this.workspaceService.workspace.id;
  }

  private async readLocalDeckState() {
    return normalizeDeckStorageState(
      await this.cacheStorage.get<unknown>(this.key)
    );
  }

  private async readLocalSidecarState() {
    return normalizeSidecarStorageState(
      await this.cacheStorage.get<unknown>(this.sidecarKey)
    );
  }

  private hasLocalStudyData(input: {
    decks: StudyDeckStorageState;
    sidecar: ReturnType<typeof normalizeSidecarStorageState>;
  }) {
    return (
      input.decks.decks.length > 0 ||
      input.decks.cards.length > 0 ||
      input.decks.cards.length > 0 ||
      input.sidecar.scheduling.length > 0 ||
      input.sidecar.reviewLogs.length > 0
    );
  }

  private async ensureHydratedFromRemote() {
    const server = this.server;
    if (!server) {
      return;
    }
    this.remoteHydrationPromise ??= (async () => {
      const [localDeckState, localSidecarState, syncMeta, remote] =
        await Promise.all([
          this.readLocalDeckState(),
          this.readLocalSidecarState(),
          readStudySyncMeta(this.cacheStorage, this.workspaceId),
          fetchRemoteStudyStorageState(server, this.workspaceId),
        ]);

      const localHasData = this.hasLocalStudyData({
        decks: localDeckState,
        sidecar: localSidecarState,
      });

      if (!remote) {
        if (localHasData) {
          await upsertRemoteStudyStorageState(
            server,
            this.workspaceId,
            localDeckState as unknown as Record<string, unknown>,
            localSidecarState as unknown as Record<string, unknown>
          );
          await patchStudySyncMeta(this.cacheStorage, this.workspaceId, {
            lastRemoteWriteAt: Date.now(),
          });
        }
        return;
      }

      const remoteUpdatedAt = remote.updatedAt
        ? Date.parse(remote.updatedAt)
        : 0;
      const localDirtyAt = syncMeta.lastLocalWriteAt ?? 0;
      const keepLocalAndRePush = localHasData && localDirtyAt > remoteUpdatedAt;

      if (keepLocalAndRePush) {
        await upsertRemoteStudyStorageState(
          server,
          this.workspaceId,
          localDeckState as unknown as Record<string, unknown>,
          localSidecarState as unknown as Record<string, unknown>
        );
        await patchStudySyncMeta(this.cacheStorage, this.workspaceId, {
          lastRemoteWriteAt: Date.now(),
        });
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
      await patchStudySyncMeta(this.cacheStorage, this.workspaceId, {
        lastRemoteSeenUpdatedAt: remoteUpdatedAt || undefined,
      });
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

  async loadDeckState(): Promise<StudyDeckStorageState> {
    await this.ensureHydratedFromRemote();
    const raw = await this.cacheStorage.get<unknown>(this.key);
    const state = normalizeDeckStorageState(raw);
    if (!isDeckStorageState(raw)) {
      await this.cacheStorage.set(this.key, state);
    }
    return state;
  }

  listDeckState(): Promise<StudyDeckStorageState> {
    return this.loadDeckState();
  }

  async listDecks(): Promise<StudyDeck[]> {
    return (await this.loadDeckState()).decks;
  }

  async listCards(): Promise<StudyCardContent[]> {
    return (await this.loadDeckState()).cards;
  }

  watchDeckState(): Observable<StudyDeckStorageState> {
    return this.cacheStorage
      .watch<unknown>(this.key)
      .pipe(map(raw => normalizeDeckStorageState(raw)));
  }

  watchDecks(): Observable<StudyDeck[]> {
    return this.watchDeckState().pipe(map(state => state.decks));
  }

  watchCards(): Observable<StudyCardContent[]> {
    return this.watchDeckState().pipe(map(state => state.cards));
  }

  async saveDeckState(state: StudyDeckStorageState) {
    const now = Date.now();
    const normalized: StudyDeckStorageState = {
      version: STUDY_DECK_STORAGE_VERSION,
      cards: state.cards,
      decks: state.decks,
    };
    await patchStudySyncMeta(this.cacheStorage, this.workspaceId, {
      lastLocalWriteAt: now,
    });

    if (this.server) {
      try {
        const sidecar = await this.readLocalSidecarState();
        await upsertRemoteStudyStorageState(
          this.server,
          this.workspaceId,
          normalized as unknown as Record<string, unknown>,
          sidecar as unknown as Record<string, unknown>
        );
        await patchStudySyncMeta(this.cacheStorage, this.workspaceId, {
          lastRemoteWriteAt: now,
        });
      } catch (error) {
        console.error('[study] failed to persist decks to server', error);
      }
    }

    await this.cacheStorage.set(this.key, normalized);
  }

  async saveDecks(decks: StudyDeck[]) {
    const state = await this.loadDeckState();
    await this.saveDeckState({ ...state, decks });
  }

  async saveCards(cards: StudyCardContent[]) {
    const state = await this.loadDeckState();
    await this.saveDeckState({ ...state, cards });
  }

  async upsertDeck(deck: StudyDeck) {
    const state = await this.loadDeckState();
    const index = state.decks.findIndex(item => item.id === deck.id);
    const decks = [...state.decks];
    if (index >= 0) {
      decks[index] = deck;
    } else {
      decks.push(deck);
    }
    await this.saveDeckState({ ...state, decks });
  }
}
