import { describe, expect, it } from 'vitest';

import type { StudyCardContent, StudyCardScheduling } from '../entities/card';
import type { StudyDeck } from '../entities/deck';
import { matchStudyBrowserQuery } from './card-browser-search';

const now = 1_710_000_000_000;

const deck: StudyDeck = {
  id: 'deck-1',
  name: 'Biology',
  cardIds: ['card-1'],
  createdAt: now,
  updatedAt: now,
};

const card: StudyCardContent = {
  id: 'card-1',
  type: 'recall',
  question: 'What is ATP?',
  answer: 'Energy currency',
  concepts: ['cellular respiration'],
  tags: ['metabolism'],
  provenance: { workspaceId: 'ws-1', docId: 'doc-1' },
  createdAt: now,
  updatedAt: now,
  suspended: false,
};

const scheduling: StudyCardScheduling = {
  cardId: 'card-1',
  state: 'review',
  due: now - 1000,
  stability: 2,
  difficulty: 4,
  elapsedDays: 1,
  scheduledDays: 3,
  reps: 4,
  lapses: 0,
};

describe('study card browser search', () => {
  it('matches mixed structured filters', () => {
    const matched = matchStudyBrowserQuery(
      'deck:bio tag:metabolism state:review due:overdue "energy currency"',
      { deck, card, scheduling, now }
    );
    expect(matched).toBe(true);
  });

  it('fails when structured filter is unmet', () => {
    const matched = matchStudyBrowserQuery('state:new', {
      deck,
      card,
      scheduling,
      now,
    });
    expect(matched).toBe(false);
  });

  it('matches deck:none for unassigned cards', () => {
    const matched = matchStudyBrowserQuery('deck:none', {
      deck,
      card,
      scheduling,
      unassigned: true,
      now,
    });
    expect(matched).toBe(true);
  });

  it('rejects deck:none when card is in a deck', () => {
    const matched = matchStudyBrowserQuery('deck:none', {
      deck,
      card,
      scheduling,
      unassigned: false,
      now,
    });
    expect(matched).toBe(false);
  });

  it('matches concept: filter with partial concept names', () => {
    const matched = matchStudyBrowserQuery('concept:respiration', {
      deck,
      card,
      scheduling,
      now,
    });
    expect(matched).toBe(true);
  });

  it('fails when concept: filter is unmet', () => {
    const matched = matchStudyBrowserQuery('concept:photosynthesis', {
      deck,
      card,
      scheduling,
      now,
    });
    expect(matched).toBe(false);
  });

  it('matches concept labels via plain text search', () => {
    const matched = matchStudyBrowserQuery('cellular', {
      deck,
      card,
      scheduling,
      now,
    });
    expect(matched).toBe(true);
  });

  it('matches type:recall filter', () => {
    const matched = matchStudyBrowserQuery('type:recall', {
      deck,
      card,
      scheduling,
      now,
    });
    expect(matched).toBe(true);
  });

  it('rejects type:synthesis for recall cards', () => {
    const matched = matchStudyBrowserQuery('type:synthesis', {
      deck,
      card,
      scheduling,
      now,
    });
    expect(matched).toBe(false);
  });
});
