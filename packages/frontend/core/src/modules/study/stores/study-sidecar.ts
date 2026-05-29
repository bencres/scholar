import { Store } from '@toeverything/infra';
import { map, type Observable } from 'rxjs';

import type { CacheStorage } from '../../storage';
import type { WorkspaceService } from '../../workspace';
import type { StudyCardScheduling } from '../entities/card';

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

  async listScheduling(): Promise<StudyCardScheduling[]> {
    return (await this.cacheStorage.get<StudyCardScheduling[]>(this.key)) ?? [];
  }

  watchScheduling(): Observable<StudyCardScheduling[]> {
    return this.cacheStorage
      .watch<StudyCardScheduling[]>(this.key)
      .pipe(map(rows => rows ?? []));
  }

  async saveScheduling(rows: StudyCardScheduling[]) {
    await this.cacheStorage.set(this.key, rows);
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

  async removeSchedulingForDeck(deckId: string) {
    const rows = await this.listScheduling();
    await this.saveScheduling(rows.filter(row => row.deckId !== deckId));
  }
}
