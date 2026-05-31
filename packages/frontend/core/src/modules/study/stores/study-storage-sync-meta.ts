import type { CacheStorage } from '../../storage';

const STUDY_SYNC_META_VERSION = 1;

type StudyStorageSyncMetaV1 = {
  version: 1;
  /**
   * Last local mutation timestamp (client clock, ms).
   */
  lastLocalWriteAt?: number;
  /**
   * Last successful server upsert timestamp (client clock, ms).
   */
  lastRemoteWriteAt?: number;
  /**
   * Last server snapshot updatedAt seen by this client (server clock, ms).
   */
  lastRemoteSeenUpdatedAt?: number;
};

type StudyStorageSyncMeta = StudyStorageSyncMetaV1;

function syncMetaKey(workspaceId: string) {
  return `study-sync-meta:${workspaceId}`;
}

function normalizeSyncMeta(raw: unknown): StudyStorageSyncMeta {
  if (
    raw &&
    typeof raw === 'object' &&
    'version' in raw &&
    (raw as StudyStorageSyncMeta).version === STUDY_SYNC_META_VERSION
  ) {
    return raw as StudyStorageSyncMeta;
  }
  return { version: STUDY_SYNC_META_VERSION };
}

export async function readStudySyncMeta(
  cacheStorage: CacheStorage,
  workspaceId: string
) {
  return normalizeSyncMeta(
    await cacheStorage.get<unknown>(syncMetaKey(workspaceId))
  );
}

export async function patchStudySyncMeta(
  cacheStorage: CacheStorage,
  workspaceId: string,
  patch: Partial<StudyStorageSyncMeta>
) {
  const current = await readStudySyncMeta(cacheStorage, workspaceId);
  await cacheStorage.set(syncMetaKey(workspaceId), { ...current, ...patch });
}
