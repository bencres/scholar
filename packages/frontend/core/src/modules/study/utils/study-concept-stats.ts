import type { StudyCardContent, StudyCardScheduling } from '../entities/card';
import { formatLocalDate } from './daily-reminder';
import { normalizeConceptId } from './study-graph-metadata';

const DAY_MS = 86_400_000;

export interface StudyConceptCount {
  id: string;
  label: string;
  count: number;
}

export interface StudyWorkloadDayForecast {
  dayOffset: number;
  date: string;
  dueCount: number;
  topConcepts: StudyConceptCount[];
}

function extractConceptIds(card: StudyCardContent) {
  const explicit = card.concepts ?? [];
  if (explicit.length) {
    return explicit.map(normalizeConceptId).filter(Boolean);
  }
  const fromTags = (card.tags ?? [])
    .map(tag => (tag.startsWith('concept:') ? tag.slice(8) : ''))
    .map(normalizeConceptId)
    .filter(Boolean);
  return fromTags;
}

function toConceptLabel(conceptId: string) {
  return conceptId
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function countTopConcepts(
  cards: StudyCardContent[],
  limit = 5
): StudyConceptCount[] {
  const counts = new Map<string, number>();
  for (const card of cards) {
    if (card.suspended) continue;
    for (const conceptId of extractConceptIds(card)) {
      counts.set(conceptId, (counts.get(conceptId) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, count]) => ({
      id,
      label: toConceptLabel(id),
      count,
    }));
}

export function buildWorkloadForecastWithConcepts({
  cards,
  scheduling,
  now = Date.now(),
  days = 7,
  conceptsPerDay = 3,
}: {
  cards: StudyCardContent[];
  scheduling: StudyCardScheduling[];
  now?: number;
  days?: number;
  conceptsPerDay?: number;
}): StudyWorkloadDayForecast[] {
  const cardById = new Map(cards.map(card => [card.id, card]));

  return Array.from({ length: days }, (_, dayOffset) => {
    const start = now + dayOffset * DAY_MS;
    const end = start + DAY_MS;
    const dueCardIds = scheduling
      .filter(row => row.due >= start && row.due < end)
      .map(row => row.cardId);

    const conceptCounts = new Map<string, number>();
    for (const cardId of dueCardIds) {
      const card = cardById.get(cardId);
      if (!card) continue;
      for (const conceptId of extractConceptIds(card)) {
        conceptCounts.set(conceptId, (conceptCounts.get(conceptId) ?? 0) + 1);
      }
    }

    const topConcepts = [...conceptCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, conceptsPerDay)
      .map(([id, count]) => ({
        id,
        label: toConceptLabel(id),
        count,
      }));

    return {
      dayOffset,
      date: formatLocalDate(new Date(start)),
      dueCount: dueCardIds.length,
      topConcepts,
    };
  });
}
