import { describe, expect, test } from 'vitest';

import type { StudyCardContent } from '../entities/card';
import type { StudyReviewLog } from '../entities/review-log';
import { buildStudyActivitySnapshot } from './study-activity';

const now = new Date('2026-06-04T15:00:00').getTime();

function card(createdAt: number, id = 'card-1'): StudyCardContent {
  return {
    id,
    type: 'recall',
    question: 'Q',
    provenance: { workspaceId: 'ws', docId: 'doc' },
    createdAt,
    updatedAt: createdAt,
    suspended: false,
  };
}

function reviewLog(reviewedAt: number): StudyReviewLog {
  return {
    id: 'log-1',
    cardId: 'card-1',
    reviewedAt,
    grade: 3,
    schedulingStateBefore: 'review',
    schedulingStateAfter: 'review',
    dueBefore: reviewedAt,
    dueAfter: reviewedAt + 86_400_000,
  };
}

describe('buildStudyActivitySnapshot', () => {
  test('returns zero-filled series for an empty workspace', () => {
    const snapshot = buildStudyActivitySnapshot({
      cards: [],
      reviewLogs: [],
      windowDays: 7,
      now,
    });
    expect(snapshot.createdByDay).toHaveLength(7);
    expect(snapshot.reviewedByDay).toHaveLength(7);
    expect(snapshot.createdByDay.every(day => day.count === 0)).toBe(true);
    expect(snapshot.streak.current).toBe(0);
    expect(snapshot.streak.longest).toBe(0);
    expect(snapshot.streak.activeToday).toBe(false);
  });

  test('counts reviews and creations on the same local day once for streak', () => {
    const todayMorning = new Date('2026-06-04T09:00:00').getTime();
    const snapshot = buildStudyActivitySnapshot({
      cards: [card(todayMorning)],
      reviewLogs: [reviewLog(todayMorning + 3_600_000)],
      windowDays: 7,
      now,
    });
    expect(snapshot.streak.current).toBe(1);
    expect(snapshot.streak.activeToday).toBe(true);
    expect(snapshot.createdByDay.at(-1)?.count).toBe(1);
    expect(snapshot.reviewedByDay.at(-1)?.count).toBe(1);
  });

  test('extends streak across consecutive active days ending yesterday', () => {
    const yesterday = new Date('2026-06-03T10:00:00').getTime();
    const twoDaysAgo = new Date('2026-06-02T10:00:00').getTime();
    const snapshot = buildStudyActivitySnapshot({
      cards: [],
      reviewLogs: [
        { ...reviewLog(yesterday), id: 'log-2' },
        { ...reviewLog(twoDaysAgo), id: 'log-3' },
      ],
      windowDays: 7,
      now,
    });
    expect(snapshot.streak.current).toBe(2);
    expect(snapshot.streak.activeToday).toBe(false);
    expect(snapshot.streak.longest).toBe(2);
  });

  test('breaks streak after a gap day', () => {
    const today = new Date('2026-06-04T10:00:00').getTime();
    const threeDaysAgo = new Date('2026-06-01T10:00:00').getTime();
    const snapshot = buildStudyActivitySnapshot({
      cards: [card(today, 'card-today')],
      reviewLogs: [{ ...reviewLog(threeDaysAgo), id: 'log-old' }],
      windowDays: 7,
      now,
    });
    expect(snapshot.streak.current).toBe(1);
    expect(snapshot.streak.longest).toBe(1);
  });

  test('treats card creation without reviews as an active study day', () => {
    const createdAt = new Date('2026-06-04T08:00:00').getTime();
    const snapshot = buildStudyActivitySnapshot({
      cards: [card(createdAt)],
      reviewLogs: [],
      windowDays: 7,
      now,
    });
    expect(snapshot.streak.current).toBe(1);
    expect(snapshot.streak.activeToday).toBe(true);
    expect(snapshot.createdByDay.at(-1)?.count).toBe(1);
    expect(snapshot.reviewedByDay.at(-1)?.count).toBe(0);
  });

  test('fills chart window with zero counts for inactive days', () => {
    const activeDay = new Date('2026-06-02T10:00:00').getTime();
    const snapshot = buildStudyActivitySnapshot({
      cards: [],
      reviewLogs: [{ ...reviewLog(activeDay), id: 'log-active' }],
      windowDays: 5,
      now,
    });
    expect(snapshot.reviewedByDay).toEqual([
      { date: '2026-05-31', count: 0 },
      { date: '2026-06-01', count: 0 },
      { date: '2026-06-02', count: 1 },
      { date: '2026-06-03', count: 0 },
      { date: '2026-06-04', count: 0 },
    ]);
  });
});
