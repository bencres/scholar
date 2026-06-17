import type { CacheStorage } from '../../storage';
import {
  studyDailyReminderStorageKey,
  studyDeckStorageKey,
  studySidecarStorageKey,
  studySyncMetaStorageKey,
} from '../stores/storage-keys';

const STUDY_WORKSPACE_STORAGE_KEYS = [
  studyDeckStorageKey,
  studySidecarStorageKey,
  studyDailyReminderStorageKey,
  studySyncMetaStorageKey,
] as const;

export async function transformWorkspaceStudyLocalToCloud(
  localWorkspaceId: string,
  cloudWorkspaceId: string,
  cacheStorage: CacheStorage
) {
  for (const getKey of STUDY_WORKSPACE_STORAGE_KEYS) {
    const sourceKey = getKey(localWorkspaceId);
    const targetKey = getKey(cloudWorkspaceId);
    const value = await cacheStorage.get<unknown>(sourceKey);
    if (value === undefined) {
      continue;
    }

    await cacheStorage.set(targetKey, value);
    await cacheStorage.del(sourceKey);
  }
}
