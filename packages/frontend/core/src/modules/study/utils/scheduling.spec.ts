import { describe, expect, it } from 'vitest';

import {
  burySiblingScheduling,
  createInitialScheduling,
  endOfDay,
  scheduleAfterReview,
  shouldMarkLeech,
} from './scheduling';

describe('study scheduling', () => {
  it('advances learning steps before graduating to review', () => {
    const now = 1_710_000_000_000;
    const initial = createInitialScheduling('card-1', now);

    const hard = scheduleAfterReview(initial, 2, now);
    expect(hard.state).toBe('learning');
    expect(hard.learningStep).toBe(0);
    expect(hard.due).toBe(now + 60_000);

    const good = scheduleAfterReview(hard, 3, now + 60_000);
    expect(good.state).toBe('learning');
    expect(good.learningStep).toBe(1);
    expect(good.due).toBe(now + 60_000 + 10 * 60_000);

    const easy = scheduleAfterReview(good, 4, now + 11 * 60_000);
    expect(easy.state).toBe('review');
    expect(easy.learningStep).toBeUndefined();
    expect(easy.scheduledDays).toBe(4);
  });

  it('moves failed review cards to relearning and marks leeches', () => {
    const now = 1_710_000_000_000;
    const review = {
      ...createInitialScheduling('card-1', now),
      state: 'review' as const,
      scheduledDays: 6,
      stability: 4.5,
      difficulty: 5.2,
      lapses: 7,
    };

    const failed = scheduleAfterReview(review, 1, now + 1000);
    expect(failed.state).toBe('relearning');
    expect(failed.lapses).toBe(8);
    expect(failed.learningStep).toBe(0);
    expect(shouldMarkLeech(failed)).toBe(true);
  });

  it('buries due sibling rows for the day', () => {
    const now = 1_710_000_000_000;
    const rows = [
      {
        ...createInitialScheduling('current', now),
        due: now - 10_000,
      },
      {
        ...createInitialScheduling('sibling-due', now),
        due: now - 5000,
      },
      {
        ...createInitialScheduling('sibling-future', now),
        due: now + 5000,
      },
    ];

    const buried = burySiblingScheduling(rows, 'current', now);
    expect(buried[0]?.buriedUntil).toBeUndefined();
    expect(buried[1]?.buriedUntil).toBe(endOfDay(now));
    expect(buried[2]?.buriedUntil).toBeUndefined();
  });
});
