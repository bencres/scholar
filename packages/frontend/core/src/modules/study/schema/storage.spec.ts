import { describe, expect, it } from 'vitest';

import {
  normalizeDeckStorageState,
  normalizeSidecarStorageState,
  STUDY_DECK_STORAGE_VERSION,
  STUDY_SIDECAR_STORAGE_VERSION,
  summarizeReviewLogs,
} from './storage';

describe('study storage migration', () => {
  it('migrates legacy deck array to versioned deck state', () => {
    const now = Date.now();
    const legacyDecks = [
      {
        id: 'deck-1',
        name: 'Legacy Deck',
        cards: [],
        createdAt: now,
        updatedAt: now,
      },
    ];

    const state = normalizeDeckStorageState(legacyDecks);

    expect(state.version).toBe(STUDY_DECK_STORAGE_VERSION);
    expect(state.decks).toHaveLength(1);
    expect(state.decks[0]?.id).toBe('deck-1');
  });

  it('preserves advanced deck metadata fields', () => {
    const now = Date.now();
    const state = normalizeDeckStorageState({
      version: STUDY_DECK_STORAGE_VERSION,
      decks: [
        {
          id: 'deck-advanced',
          name: 'Advanced Deck',
          cards: [],
          metadata: {
            optionsGroupId: 'opts-default',
            schedulingOptions: {
              desiredRetention: 0.9,
              easyBonus: 1.3,
            },
            filtered: {
              query: 'tag:biology due:overdue',
              limit: 30,
            },
            browserPresets: [
              {
                id: 'preset-overdue',
                name: 'Overdue',
                query: 'due:overdue',
              },
            ],
            noteTypes: [
              {
                id: 'custom-basic',
                name: 'Custom Basic',
                kind: 'custom',
                fieldNames: ['Front', 'Back'],
                templates: [
                  {
                    id: 'custom-tmpl',
                    name: 'Card 1',
                    front: '{{Front}}',
                    back: '{{Front}}\n\n{{Back}}',
                  },
                ],
              },
            ],
          },
          createdAt: now,
          updatedAt: now,
        },
      ],
    });
    expect(state.decks[0]?.metadata?.optionsGroupId).toBe('opts-default');
    expect(state.decks[0]?.metadata?.filtered?.query).toContain('due:overdue');
    expect(state.decks[0]?.metadata?.browserPresets).toHaveLength(1);
    expect(state.decks[0]?.metadata?.noteTypes).toHaveLength(1);
  });

  it('migrates legacy scheduling array to versioned sidecar state', () => {
    const now = Date.now();
    const legacyScheduling = [
      {
        cardId: 'card-1',
        deckId: 'deck-1',
        state: 'new',
        due: now,
        stability: 0,
        difficulty: 0,
        elapsedDays: 0,
        scheduledDays: 0,
        reps: 0,
        lapses: 0,
      },
    ];

    const state = normalizeSidecarStorageState(legacyScheduling);

    expect(state.version).toBe(STUDY_SIDECAR_STORAGE_VERSION);
    expect(state.scheduling).toHaveLength(1);
    expect(state.reviewLogs).toEqual([]);
  });

  it('summarizes review logs by grade', () => {
    const logs = [
      {
        id: 'log-1',
        deckId: 'deck-1',
        cardId: 'card-1',
        reviewedAt: 10,
        grade: 4 as const,
        schedulingStateBefore: 'new',
        schedulingStateAfter: 'review',
        dueBefore: 0,
        dueAfter: 100,
      },
      {
        id: 'log-2',
        deckId: 'deck-1',
        cardId: 'card-2',
        reviewedAt: 20,
        grade: 2 as const,
        schedulingStateBefore: 'review',
        schedulingStateAfter: 'relearning',
        dueBefore: 100,
        dueAfter: 200,
      },
    ];

    const summary = summarizeReviewLogs(logs);

    expect(summary.totalReviews).toBe(2);
    expect(summary.byGrade).toEqual({ 1: 0, 2: 1, 3: 0, 4: 1 });
    expect(summary.lastReviewedAt).toBe(20);
  });
});
