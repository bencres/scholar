import { describe, expect, test } from 'vitest';

import type { StudyCardContent } from '../entities/card';
import {
  buildWorkloadForecastWithConcepts,
  countTopConcepts,
} from './study-concept-stats';

const now = new Date('2026-06-04T12:00:00').getTime();

function card(id: string, concepts?: string[]): StudyCardContent {
  return {
    id,
    type: 'recall',
    question: 'Q',
    concepts,
    provenance: { workspaceId: 'ws', docId: 'doc' },
    createdAt: now,
    updatedAt: now,
    suspended: false,
  };
}

describe('study-concept-stats', () => {
  test('countTopConcepts ranks concepts by card coverage', () => {
    const top = countTopConcepts([
      card('1', ['atp-synthase']),
      card('2', ['atp-synthase', 'glycolysis']),
      card('3', ['glycolysis']),
    ]);
    expect(top[0]?.id).toBe('atp-synthase');
    expect(top[0]?.count).toBe(2);
  });

  test('buildWorkloadForecastWithConcepts groups due cards by day', () => {
    const forecast = buildWorkloadForecastWithConcepts({
      cards: [card('c1', ['atp-synthase']), card('c2', ['glycolysis'])],
      scheduling: [
        {
          cardId: 'c1',
          due: now + 3_600_000,
          state: 'review',
          reps: 1,
          lapses: 0,
          difficulty: 5,
          stability: 1,
          scheduledDays: 1,
          elapsedDays: 0,
        },
        {
          cardId: 'c2',
          due: now + 2 * 86_400_000 + 3_600_000,
          state: 'review',
          reps: 1,
          lapses: 0,
          difficulty: 5,
          stability: 1,
          scheduledDays: 2,
          elapsedDays: 0,
        },
      ],
      now,
      days: 3,
    });
    expect(forecast[0]?.dueCount).toBe(1);
    expect(forecast[0]?.topConcepts[0]?.id).toBe('atp-synthase');
    expect(forecast[2]?.dueCount).toBe(1);
  });
});
