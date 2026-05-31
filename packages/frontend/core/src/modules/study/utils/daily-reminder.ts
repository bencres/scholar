import type { StudyDeck } from '../entities/deck';

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildStudyDailyReminderDeckSummary(
  decks: StudyDeck[],
  dueByDeck: Map<string, number>,
  maxDecks = 3
): string {
  const sorted = [...dueByDeck.entries()]
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  const parts: string[] = [];
  for (const [deckId, count] of sorted.slice(0, maxDecks)) {
    const deck = decks.find(item => item.id === deckId);
    const name = deck?.name ?? deckId;
    parts.push(`${name}: ${count}`);
  }

  const remaining = sorted.length - maxDecks;
  if (remaining > 0) {
    parts.push(`+${remaining} more`);
  }

  return parts.join(', ');
}
