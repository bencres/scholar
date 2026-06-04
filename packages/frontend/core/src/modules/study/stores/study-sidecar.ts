import { Store } from '@toeverything/infra';
import { map, type Observable } from 'rxjs';

import type { WorkspaceServerService } from '../../cloud/services/workspace-server';
import type { CacheStorage } from '../../storage';
import type { WorkspaceService } from '../../workspace';
import type { StudyCardScheduling } from '../entities/card';
import type { StudyReviewLog, StudyReviewStats } from '../entities/review-log';
import {
  isSidecarStorageState,
  normalizeDeckStorageState,
  normalizeSidecarStorageState,
  STUDY_SIDECAR_STORAGE_VERSION,
  type StudySidecarStorageState,
  summarizeReviewLogs,
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

export class StudySidecarStore extends Store {
  private remoteHydrationPromise: Promise<void> | null = null;

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly cacheStorage: CacheStorage,
    private readonly workspaceServerService?: WorkspaceServerService
  ) {
    super();
  }

  private get key() {
    return studySidecarStorageKey(this.workspaceService.workspace.id);
  }

  private get deckKey() {
    return studyDeckStorageKey(this.workspaceService.workspace.id);
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

  private async readLocalSidecarState() {
    return normalizeSidecarStorageState(
      await this.cacheStorage.get<unknown>(this.key)
    );
  }

  private async readLocalDeckState() {
    return normalizeDeckStorageState(
      await this.cacheStorage.get<unknown>(this.deckKey)
    );
  }

  private hasLocalStudyData(input: {
    decks: ReturnType<typeof normalizeDeckStorageState>;
    sidecar: StudySidecarStorageState;
  }) {
    return (
      input.decks.decks.length > 0 ||
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

      if (remote.sidecar !== undefined) {
        await this.cacheStorage.set(
          this.key,
          normalizeSidecarStorageState(remote.sidecar)
        );
      }
      if (remote.decks !== undefined) {
        await this.cacheStorage.set(
          this.deckKey,
          normalizeDeckStorageState(remote.decks)
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
        '[study] failed to hydrate sidecar storage from server',
        error
      );
    }
  }

  private async listSidecarState(): Promise<StudySidecarStorageState> {
    await this.ensureHydratedFromRemote();
    const raw = await this.cacheStorage.get<unknown>(this.key);
    const state = normalizeSidecarStorageState(raw);
    if (!isSidecarStorageState(raw)) {
      await this.cacheStorage.set(this.key, state);
    }
    return state;
  }

  async listScheduling(): Promise<StudyCardScheduling[]> {
    return (await this.listSidecarState()).scheduling;
  }

  watchScheduling(): Observable<StudyCardScheduling[]> {
    return this.cacheStorage
      .watch<unknown>(this.key)
      .pipe(map(raw => normalizeSidecarStorageState(raw).scheduling));
  }

  async saveScheduling(rows: StudyCardScheduling[]) {
    const state = await this.listSidecarState();
    await this.saveSidecarState({ ...state, scheduling: rows });
  }

  async upsertScheduling(row: StudyCardScheduling) {
    const rows = await this.listScheduling();
    const index = rows.findIndex(item => item.cardId === row.cardId);
    if (index >= 0) {
      rows[index] = row;
    } else {
      rows.push(row);
    }
    await this.saveScheduling(rows);
  }

  async listReviewLogs(): Promise<StudyReviewLog[]> {
    return (await this.listSidecarState()).reviewLogs;
  }

  watchReviewLogs(): Observable<StudyReviewLog[]> {
    return this.cacheStorage
      .watch<unknown>(this.key)
      .pipe(map(raw => normalizeSidecarStorageState(raw).reviewLogs));
  }

  async appendReviewLog(log: StudyReviewLog) {
    const state = await this.listSidecarState();
    await this.saveSidecarState({
      ...state,
      reviewLogs: [...state.reviewLogs, log],
    });
  }

  async summarizeReviewStats(deckId?: string): Promise<StudyReviewStats> {
    const logs = await this.listReviewLogs();
    return summarizeReviewLogs(
      deckId ? logs.filter(log => log.deckId === deckId) : logs
    );
  }

  async removeSchedulingForDeck(deckId: string) {
    const state = await this.listSidecarState();
    await this.saveSidecarState({
      ...state,
      scheduling: state.scheduling.filter(row => row.deckId !== deckId),
      reviewLogs: state.reviewLogs.filter(log => log.deckId !== deckId),
    });
  }

  async removeSchedulingForCard(cardId: string) {
    const state = await this.listSidecarState();
    await this.saveSidecarState({
      ...state,
      scheduling: state.scheduling.filter(row => row.cardId !== cardId),
      reviewLogs: state.reviewLogs.filter(log => log.cardId !== cardId),
    });
  }

  private async saveSidecarState(state: StudySidecarStorageState) {
    const now = Date.now();
    const versionedState: StudySidecarStorageState = {
      version: STUDY_SIDECAR_STORAGE_VERSION,
      scheduling: state.scheduling,
      reviewLogs: state.reviewLogs,
    };
    await patchStudySyncMeta(this.cacheStorage, this.workspaceId, {
      lastLocalWriteAt: now,
    });

    if (this.server) {
      try {
        const decks = await this.readLocalDeckState();
        await upsertRemoteStudyStorageState(
          this.server,
          this.workspaceId,
          decks as unknown as Record<string, unknown>,
          versionedState as unknown as Record<string, unknown>
        );
        await patchStudySyncMeta(this.cacheStorage, this.workspaceId, {
          lastRemoteWriteAt: now,
        });
      } catch (error) {
        console.error('[study] failed to persist sidecar to server', error);
      }
    }

    await this.cacheStorage.set(this.key, versionedState);
  }
}
