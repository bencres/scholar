import { describe, expect, it } from 'vitest';

import { createInitialScheduling } from './scheduling';
import { buildStudyStatsSnapshot } from './study-stats';

describe('study stats snapshot', () => {
  it('builds retention, ease, and forecast distributions', () => {
    const now = 1_710_000_000_000;
    const scheduling = [
      { ...createInitialScheduling('card-1', now), due: now + 1_000 },
      {
        ...createInitialScheduling('card-2', now),
        due: now + 2 * 86_400_000,
        scheduledDays: 3,
        leech: true,
        lapses: 2,
      },
    ];
    const logs = [
      {
        id: 'log-1',
        deckId: 'deck-1',
        cardId: 'card-1',
        reviewedAt: now - 1000,
        grade: 4 as const,
        schedulingStateBefore: 'new',
        schedulingStateAfter: 'review',
        dueBefore: now - 1000,
        dueAfter: now + 1_000,
      },
    ];
    const snapshot = buildStudyStatsSnapshot(scheduling, logs, now);
    expect(snapshot.retentionCurve).toHaveLength(4);
    expect(
      snapshot.easeDistribution.find(item => item.grade === 4)?.count
    ).toBe(1);
    expect(snapshot.workloadForecast).toHaveLength(7);
    expect(snapshot.leechCount).toBe(1);
    expect(snapshot.lapseCount).toBe(2);
  });
});
