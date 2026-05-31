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
        // Import existing browser-side study state on first cloud hydration.
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

      // Last-write-wins: if this device has newer unsynced writes, push local back.
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
    const now = Date.now();
    const state: StudyDeckStorageState = {
      version: STUDY_DECK_STORAGE_VERSION,
      decks,
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
          state as unknown as Record<string, unknown>,
          sidecar as unknown as Record<string, unknown>
        );
        await patchStudySyncMeta(this.cacheStorage, this.workspaceId, {
          lastRemoteWriteAt: now,
        });
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
