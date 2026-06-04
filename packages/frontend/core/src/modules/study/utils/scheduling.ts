import type {
  CardState,
  ReviewGrade,
  StudyCardScheduling,
} from '../entities/card';

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const LEARNING_STEPS_MINUTES = [1, 10];
const RELEARNING_STEPS_MINUTES = [10];
const LEECH_LAPSES_THRESHOLD = 8;

export function createInitialScheduling(
  cardId: string,
  now = Date.now()
): StudyCardScheduling {
  return {
    cardId,
    state: 'new',
    due: now,
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    learningStep: 0,
    leech: false,
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
    elapsedDays: scheduling.lastReviewAt
      ? Math.max(0, (now - scheduling.lastReviewAt) / DAY_MS)
      : scheduling.elapsedDays,
    reps: scheduling.reps + 1,
  };

  if (grade === 1 && scheduling.state === 'review') {
    const stepMinutes = RELEARNING_STEPS_MINUTES[0];
    return {
      ...next,
      state: 'relearning',
      due: now + stepMinutes * MINUTE_MS,
      lapses: scheduling.lapses + 1,
      learningStep: 0,
      stability: Math.max(0.1, scheduling.stability * 0.45),
      difficulty: clampDifficulty(scheduling.difficulty + 0.22),
      scheduledDays: 0,
    };
  }

  if (scheduling.state === 'new' || scheduling.state === 'learning') {
    return scheduleLearning(
      next,
      grade,
      LEARNING_STEPS_MINUTES,
      now,
      'learning'
    );
  }

  if (scheduling.state === 'relearning') {
    return scheduleLearning(
      next,
      grade,
      RELEARNING_STEPS_MINUTES,
      now,
      'relearning'
    );
  }

  const intervalDays = scheduleReviewInterval(next, grade);

  return {
    ...next,
    state: 'review',
    due: now + intervalDays * DAY_MS,
    stability: nextReviewStability(next, grade),
    difficulty: nextReviewDifficulty(next.difficulty, grade),
    learningStep: undefined,
    scheduledDays: intervalDays,
  };
}

export function isDue(scheduling: StudyCardScheduling, now = Date.now()) {
  if (scheduling.buriedUntil && scheduling.buriedUntil > now) {
    return false;
  }
  return scheduling.due <= now;
}

export function shouldMarkLeech(scheduling: StudyCardScheduling) {
  return (
    scheduling.state === 'relearning' &&
    scheduling.lapses >= LEECH_LAPSES_THRESHOLD &&
    scheduling.lapses % 2 === 0
  );
}

export function endOfDay(now = Date.now()) {
  const date = new Date(now);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

export function burySiblingScheduling(
  rows: StudyCardScheduling[],
  currentCardId: string,
  now = Date.now()
) {
  const until = endOfDay(now);
  return rows.map(row => {
    if (row.cardId === currentCardId || row.due > now) {
      return row;
    }
    return { ...row, buriedUntil: until };
  });
}

function scheduleLearning(
  scheduling: StudyCardScheduling,
  grade: ReviewGrade,
  stepsMinutes: number[],
  now: number,
  state: CardState
): StudyCardScheduling {
  if (grade === 1) {
    const stepMinutes = stepsMinutes[0] ?? 1;
    return {
      ...scheduling,
      state,
      due: now + stepMinutes * MINUTE_MS,
      learningStep: 0,
      scheduledDays: 0,
      stability: Math.max(0.1, scheduling.stability || 0.3),
      difficulty: clampDifficulty((scheduling.difficulty || 5) + 0.2),
    };
  }

  const currentStep = scheduling.learningStep ?? 0;
  const nextStep = currentStep + (grade === 2 ? 0 : 1);
  const nextStepMinutes = stepsMinutes[nextStep];

  if (nextStepMinutes !== undefined) {
    return {
      ...scheduling,
      state,
      due: now + nextStepMinutes * MINUTE_MS,
      learningStep: nextStep,
      stability: Math.max(0.3, scheduling.stability || 0.5),
      difficulty: nextReviewDifficulty(scheduling.difficulty || 5, grade),
      scheduledDays: 0,
    };
  }

  const graduatedDays = grade === 4 ? 4 : grade === 3 ? 2 : 1;
  return {
    ...scheduling,
    state: 'review',
    due: now + graduatedDays * DAY_MS,
    learningStep: undefined,
    stability: Math.max(1.2, scheduling.stability + 0.8 + grade * 0.4),
    difficulty: nextReviewDifficulty(scheduling.difficulty || 5, grade),
    scheduledDays: graduatedDays,
  };
}

function scheduleReviewInterval(
  scheduling: StudyCardScheduling,
  grade: ReviewGrade
) {
  const baseInterval = Math.max(
    1,
    scheduling.scheduledDays || scheduling.elapsedDays || 1
  );
  const stabilityBoost = 1 + Math.max(0, scheduling.stability) * 0.08;
  const gradeFactor = grade === 4 ? 2.5 : grade === 3 ? 1.9 : 1.25;
  return Math.max(1, Math.round(baseInterval * stabilityBoost * gradeFactor));
}

function nextReviewStability(
  scheduling: StudyCardScheduling,
  grade: ReviewGrade
) {
  const base = Math.max(0.1, scheduling.stability || 1);
  const gain = grade === 4 ? 1.35 : grade === 3 ? 1.2 : 1.05;
  return Number((base * gain + scheduling.elapsedDays * 0.05).toFixed(3));
}

function nextReviewDifficulty(currentDifficulty: number, grade: ReviewGrade) {
  const difficulty = currentDifficulty || 5;
  const delta = grade === 4 ? -0.2 : grade === 3 ? -0.08 : 0.1;
  return clampDifficulty(difficulty + delta);
}

function clampDifficulty(value: number) {
  return Number(Math.min(10, Math.max(1, value)).toFixed(3));
}
