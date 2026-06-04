import { describe, expect, it } from 'vitest';

import {
  dedupeSchedulingByCardId,
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
    expect(state.cards).toEqual([]);
  });

  it('migrates v2 embedded cards to v3 canonical cards', () => {
    const now = Date.now();
    const state = normalizeDeckStorageState({
      version: 2,
      decks: [
        {
          id: 'deck-1',
          name: 'Biology',
          cards: [
            {
              id: 'card-1',
              deckId: 'deck-1',
              type: 'recall',
              question: 'Q1',
              provenance: { workspaceId: 'ws', docId: 'doc' },
              createdAt: now,
              updatedAt: now,
              suspended: false,
            },
            {
              id: 'card-2',
              deckId: 'deck-1',
              type: 'recall',
              question: 'Q2',
              provenance: { workspaceId: 'ws', docId: 'doc' },
              createdAt: now,
              updatedAt: now,
              suspended: false,
            },
          ],
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    expect(state.version).toBe(3);
    expect(state.cards).toHaveLength(2);
    expect(state.cards[0]).not.toHaveProperty('deckId');
    expect(state.decks[0]?.cardIds).toEqual(['card-1', 'card-2']);
  });

  it('preserves advanced deck metadata fields', () => {
    const now = Date.now();
    const state = normalizeDeckStorageState({
      version: STUDY_DECK_STORAGE_VERSION,
      cards: [],
      decks: [
        {
          id: 'deck-advanced',
          name: 'Advanced Deck',
          cardIds: [],
          metadata: {
            optionsGroupId: 'opts-default',
            sourcePage: { docId: 'doc-source' },
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
    expect(state.decks[0]?.metadata?.sourcePage?.docId).toBe('doc-source');
    expect(state.decks[0]?.metadata?.filtered?.query).toContain('due:overdue');
    expect(state.decks[0]?.metadata?.browserPresets).toHaveLength(1);
    expect(state.decks[0]?.metadata?.noteTypes).toHaveLength(1);
  });

  it('dedupes scheduling rows by card id', () => {
    const now = Date.now();
    const deduped = dedupeSchedulingByCardId([
      {
        cardId: 'card-1',
        deckId: 'deck-a',
        state: 'new',
        due: now + 1000,
        stability: 0,
        difficulty: 0,
        elapsedDays: 0,
        scheduledDays: 0,
        reps: 0,
        lapses: 0,
      },
      {
        cardId: 'card-1',
        deckId: 'deck-b',
        state: 'review',
        due: now - 1000,
        stability: 1,
        difficulty: 5,
        elapsedDays: 1,
        scheduledDays: 2,
        reps: 2,
        lapses: 0,
      },
    ]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0]?.due).toBe(now - 1000);
    expect(deduped[0]?.deckId).toBeUndefined();
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
