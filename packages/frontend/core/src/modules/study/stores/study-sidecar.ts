import { Store } from '@toeverything/infra';
import { map, type Observable } from 'rxjs';

import type { CacheStorage } from '../../storage';
import type { WorkspaceService } from '../../workspace';
import type { StudyCardScheduling } from '../entities/card';
import type { StudyReviewLog, StudyReviewStats } from '../entities/review-log';
import {
  isSidecarStorageState,
  normalizeSidecarStorageState,
  STUDY_SIDECAR_STORAGE_VERSION,
  type StudySidecarStorageState,
  summarizeReviewLogs,
} from '../schema/storage';

function storageKey(workspaceId: string) {
  return `study-scheduling:${workspaceId}`;
}

export class StudySidecarStore extends Store {
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly cacheStorage: CacheStorage
  ) {
    super();
  }

  private get key() {
    return storageKey(this.workspaceService.workspace.id);
  }

  private async listSidecarState(): Promise<StudySidecarStorageState> {
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
    await this.cacheStorage.set(this.key, {
      version: STUDY_SIDECAR_STORAGE_VERSION,
      scheduling: state.scheduling,
      reviewLogs: state.reviewLogs,
    });
  }
}
