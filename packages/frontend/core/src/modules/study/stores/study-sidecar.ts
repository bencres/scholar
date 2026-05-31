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
    const versionedState: StudySidecarStorageState = {
      version: STUDY_SIDECAR_STORAGE_VERSION,
      scheduling: state.scheduling,
      reviewLogs: state.reviewLogs,
    };

    if (this.server) {
      try {
        const decks = normalizeDeckStorageState(
          await this.cacheStorage.get<unknown>(this.deckKey)
        );
        await upsertRemoteStudyStorageState(
          this.server,
          this.workspaceService.workspace.id,
          decks as unknown as Record<string, unknown>,
          versionedState as unknown as Record<string, unknown>
        );
      } catch (error) {
        console.error('[study] failed to persist sidecar to server', error);
      }
    }

    await this.cacheStorage.set(this.key, versionedState);
  }
}
