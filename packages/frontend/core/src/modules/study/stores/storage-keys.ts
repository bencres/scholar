export function studyDeckStorageKey(workspaceId: string) {
  return `study-decks:${workspaceId}`;
}

export function studySidecarStorageKey(workspaceId: string) {
  return `study-scheduling:${workspaceId}`;
}
