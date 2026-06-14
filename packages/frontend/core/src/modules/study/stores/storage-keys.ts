export function studyDeckStorageKey(workspaceId: string) {
  return `study-decks:${workspaceId}`;
}

export function studySidecarStorageKey(workspaceId: string) {
  return `study-scheduling:${workspaceId}`;
}

export function studyDailyReminderStorageKey(workspaceId: string) {
  return `study-daily-reminder:${workspaceId}`;
}

export function studySyncMetaStorageKey(workspaceId: string) {
  return `study-sync-meta:${workspaceId}`;
}
