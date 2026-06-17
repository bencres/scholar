import { describe, expect, it } from 'vitest';

import type { CacheStorage } from '../../storage';
import {
  studyDailyReminderStorageKey,
  studyDeckStorageKey,
  studySidecarStorageKey,
  studySyncMetaStorageKey,
} from '../stores/storage-keys';
import { transformWorkspaceStudyLocalToCloud } from './transform-workspace-study-local-to-cloud';

function createCacheStorage(initial: Record<string, unknown> = {}) {
  const store = new Map<string, unknown>(Object.entries(initial));

  return {
    get: async <T>(key: string) => store.get(key) as T | undefined,
    set: async <T>(key: string, value: T | undefined) => {
      if (value === undefined) {
        store.delete(key);
        return;
      }
      store.set(key, value);
    },
    del: async (key: string) => {
      store.delete(key);
    },
    clear: async () => {
      store.clear();
    },
    keys: async () => Array.from(store.keys()),
    watch: () => {
      throw new Error('not implemented');
    },
  } satisfies CacheStorage;
}

describe('transformWorkspaceStudyLocalToCloud', () => {
  it('copies study storage keys to the new cloud workspace id', async () => {
    const localWorkspaceId = 'local-ws';
    const cloudWorkspaceId = 'cloud-ws';
    const deckState = { version: 3, decks: [], cards: [] };
    const sidecarState = { version: 1, scheduling: [], reviewLogs: [] };
    const reminderState = { enabled: true };
    const syncMeta = { version: 1, lastLocalWriteAt: 123 };

    const cacheStorage = createCacheStorage({
      [studyDeckStorageKey(localWorkspaceId)]: deckState,
      [studySidecarStorageKey(localWorkspaceId)]: sidecarState,
      [studyDailyReminderStorageKey(localWorkspaceId)]: reminderState,
      [studySyncMetaStorageKey(localWorkspaceId)]: syncMeta,
    });

    await transformWorkspaceStudyLocalToCloud(
      localWorkspaceId,
      cloudWorkspaceId,
      cacheStorage
    );

    expect(
      await cacheStorage.get(studyDeckStorageKey(cloudWorkspaceId))
    ).toEqual(deckState);
    expect(
      await cacheStorage.get(studySidecarStorageKey(cloudWorkspaceId))
    ).toEqual(sidecarState);
    expect(
      await cacheStorage.get(studyDailyReminderStorageKey(cloudWorkspaceId))
    ).toEqual(reminderState);
    expect(
      await cacheStorage.get(studySyncMetaStorageKey(cloudWorkspaceId))
    ).toEqual(syncMeta);

    expect(
      await cacheStorage.get(studyDeckStorageKey(localWorkspaceId))
    ).toBeUndefined();
    expect(
      await cacheStorage.get(studySidecarStorageKey(localWorkspaceId))
    ).toBeUndefined();
    expect(
      await cacheStorage.get(studyDailyReminderStorageKey(localWorkspaceId))
    ).toBeUndefined();
    expect(
      await cacheStorage.get(studySyncMetaStorageKey(localWorkspaceId))
    ).toBeUndefined();
  });

  it('no-ops when local study storage is empty', async () => {
    const cacheStorage = createCacheStorage();

    await transformWorkspaceStudyLocalToCloud(
      'local-ws',
      'cloud-ws',
      cacheStorage
    );

    expect(await cacheStorage.keys()).toEqual([]);
  });
});
