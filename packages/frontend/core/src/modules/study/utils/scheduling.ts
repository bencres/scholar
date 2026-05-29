import type {
  CardState,
  ReviewGrade,
  StudyCardScheduling,
} from '../entities/card';

const DAY_MS = 24 * 60 * 60 * 1000;

export function createInitialScheduling(
  cardId: string,
  deckId: string,
  now = Date.now()
): StudyCardScheduling {
  return {
    cardId,
    deckId,
    state: 'new',
    due: now,
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
  };
}

export function scheduleAfterReview(
  scheduling: StudyCardScheduling,
  grade: ReviewGrade,
  now = Date.now()
): StudyCardScheduling {
  const next: StudyCardScheduling = {
    ...scheduling,
    lastGrade: grade,
    lastReviewAt: now,
    reps: scheduling.reps + 1,
  };

  if (grade === 1) {
    return {
      ...next,
      state: 'relearning',
      due: now + 10 * 60 * 1000,
      lapses: scheduling.lapses + 1,
      scheduledDays: 0,
    };
  }

  let intervalDays: number;
  let state: CardState;

  if (scheduling.state === 'new' || scheduling.state === 'learning') {
    state = 'review';
    intervalDays = grade === 4 ? 4 : grade === 3 ? 1 : 0.5;
  } else {
    state = 'review';
    const factor = grade === 4 ? 2.5 : grade === 3 ? 2 : 1.2;
    intervalDays = Math.max(1, scheduling.scheduledDays * factor);
  }

  return {
    ...next,
    state,
    due: now + intervalDays * DAY_MS,
    scheduledDays: intervalDays,
  };
}

export function isDue(scheduling: StudyCardScheduling, now = Date.now()) {
  if (scheduling.buriedUntil && scheduling.buriedUntil > now) {
    return false;
  }
  return scheduling.due <= now;
}
