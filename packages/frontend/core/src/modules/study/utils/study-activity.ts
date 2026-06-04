import type { StudyCardContent } from '../entities/card';
import type { StudyReviewLog } from '../entities/review-log';
import { formatLocalDate } from './daily-reminder';

export const DEFAULT_STUDY_ACTIVITY_WINDOW_DAYS = 28;

export interface StudyActivityDayCount {
  date: string;
  count: number;
}

export interface StudyActivityStreak {
  current: number;
  longest: number;
  activeToday: boolean;
}

export interface StudyActivitySnapshot {
  windowDays: number;
  createdByDay: StudyActivityDayCount[];
  reviewedByDay: StudyActivityDayCount[];
  streak: StudyActivityStreak;
}

type BuildInput = {
  cards: StudyCardContent[];
  reviewLogs: StudyReviewLog[];
  windowDays?: number;
  now?: number;
};

const DAY_MS = 86_400_000;

function startOfLocalDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function buildDateRange(endTimestamp: number, windowDays: number) {
  const end = startOfLocalDay(endTimestamp);
  const dates: string[] = [];
  for (let offset = windowDays - 1; offset >= 0; offset -= 1) {
    dates.push(formatLocalDate(new Date(end - offset * DAY_MS)));
  }
  return dates;
}

function buildActiveDaySet(
  cards: StudyCardContent[],
  reviewLogs: StudyReviewLog[]
) {
  const activeDays = new Set<string>();
  for (const card of cards) {
    activeDays.add(formatLocalDate(new Date(card.createdAt)));
  }
  for (const log of reviewLogs) {
    activeDays.add(formatLocalDate(new Date(log.reviewedAt)));
  }
  return activeDays;
}

function countByDay(
  dates: string[],
  counts: Map<string, number>
): StudyActivityDayCount[] {
  return dates.map(date => ({
    date,
    count: counts.get(date) ?? 0,
  }));
}

function buildCreatedCounts(cards: StudyCardContent[]) {
  const counts = new Map<string, number>();
  for (const card of cards) {
    const date = formatLocalDate(new Date(card.createdAt));
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  return counts;
}

function buildReviewedCounts(reviewLogs: StudyReviewLog[]) {
  const counts = new Map<string, number>();
  for (const log of reviewLogs) {
    const date = formatLocalDate(new Date(log.reviewedAt));
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  return counts;
}

function computeCurrentStreak(
  activeDays: Set<string>,
  today: string,
  now: number
) {
  const yesterday = formatLocalDate(new Date(startOfLocalDay(now) - DAY_MS));
  let cursor = activeDays.has(today) ? today : yesterday;
  if (!activeDays.has(cursor)) {
    return 0;
  }
  let streak = 0;
  while (activeDays.has(cursor)) {
    streak += 1;
    const previous = startOfLocalDay(new Date(`${cursor}T12:00:00`).getTime());
    cursor = formatLocalDate(new Date(previous - DAY_MS));
  }
  return streak;
}

function computeLongestStreak(activeDays: Set<string>) {
  if (!activeDays.size) {
    return 0;
  }
  const sorted = [...activeDays].sort();
  let longest = 1;
  let current = 1;
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = startOfLocalDay(
      new Date(`${sorted[index - 1]}T12:00:00`).getTime()
    );
    const expected = formatLocalDate(new Date(previous + DAY_MS));
    if (sorted[index] === expected) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

export function buildStudyActivitySnapshot({
  cards,
  reviewLogs,
  windowDays = DEFAULT_STUDY_ACTIVITY_WINDOW_DAYS,
  now = Date.now(),
}: BuildInput): StudyActivitySnapshot {
  const days = Math.max(1, Math.floor(windowDays));
  const dateRange = buildDateRange(now, days);
  const windowStart = startOfLocalDay(now) - (days - 1) * DAY_MS;

  const createdInWindow = cards.filter(card => card.createdAt >= windowStart);
  const reviewedInWindow = reviewLogs.filter(
    log => log.reviewedAt >= windowStart
  );

  const createdByDay = countByDay(
    dateRange,
    buildCreatedCounts(createdInWindow)
  );
  const reviewedByDay = countByDay(
    dateRange,
    buildReviewedCounts(reviewedInWindow)
  );

  const activeDays = buildActiveDaySet(cards, reviewLogs);
  const today = formatLocalDate(new Date(now));

  return {
    windowDays: days,
    createdByDay,
    reviewedByDay,
    streak: {
      current: computeCurrentStreak(activeDays, today, now),
      longest: computeLongestStreak(activeDays),
      activeToday: activeDays.has(today),
    },
  };
}
