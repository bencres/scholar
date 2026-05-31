import { describe, expect, it } from 'vitest';

import type { StudyDeck } from '../entities/deck';
import {
  buildStudyDailyReminderDeckSummary,
  formatLocalDate,
} from './daily-reminder';

describe('study daily reminder helpers', () => {
  it('formats local dates as YYYY-MM-DD', () => {
    expect(formatLocalDate(new Date(2026, 4, 31, 12))).toBe('2026-05-31');
  });

  it('builds a deck summary sorted by due count', () => {
    const decks = [
      { id: 'deck-a', name: 'Physics' },
      { id: 'deck-b', name: 'History' },
      { id: 'deck-c', name: 'Biology' },
    ] as StudyDeck[];
    const dueByDeck = new Map([
      ['deck-a', 2],
      ['deck-b', 5],
      ['deck-c', 1],
    ]);

    expect(buildStudyDailyReminderDeckSummary(decks, dueByDeck)).toBe(
      'History: 5, Physics: 2, Biology: 1'
    );
  });

  it('truncates long deck lists', () => {
    const decks = [
      { id: 'deck-a', name: 'A' },
      { id: 'deck-b', name: 'B' },
      { id: 'deck-c', name: 'C' },
      { id: 'deck-d', name: 'D' },
    ] as StudyDeck[];
    const dueByDeck = new Map([
      ['deck-a', 4],
      ['deck-b', 3],
      ['deck-c', 2],
      ['deck-d', 1],
    ]);

    expect(buildStudyDailyReminderDeckSummary(decks, dueByDeck, 2)).toBe(
      'A: 4, B: 3, +2 more'
    );
  });
});
