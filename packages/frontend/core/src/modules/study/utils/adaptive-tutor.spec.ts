import { describe, expect, it } from 'vitest';

import {
  buildAdaptiveTutorSnapshot,
  evaluateTeachBackResponse,
} from './adaptive-tutor';
import { buildStudyLearningGraphSnapshot } from './learning-graph';
import { createInitialScheduling } from './scheduling';

describe('adaptive tutor', () => {
  it('builds prioritized tutor queue and remediation draft', () => {
    const now = 1_730_000_000_000;
    const decks = [
      {
        id: 'deck-1',
        name: 'Physics',
        cards: [
          {
            id: 'card-1',
            deckId: 'deck-1',
            type: 'recall' as const,
            question: 'State Newton second law',
            answer: 'Force equals mass times acceleration',
            concepts: ['newton-law'],
            provenance: {
              workspaceId: 'ws-1',
              docId: 'doc-1',
              blockIds: ['b1'],
            },
            createdAt: now,
            updatedAt: now,
            suspended: false,
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'deck-2',
        name: 'Math',
        cards: [
          {
            id: 'card-2',
            deckId: 'deck-2',
            type: 'recall' as const,
            question: 'Derivative of x^2',
            answer: '2x',
            concepts: ['newton-law'],
            provenance: { workspaceId: 'ws-1', docId: 'doc-2' },
            createdAt: now,
            updatedAt: now,
            suspended: false,
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
    ];
    const scheduling = [
      {
        ...createInitialScheduling('card-1', 'deck-1', now),
        due: now - 1_000,
        lapses: 2,
      },
      { ...createInitialScheduling('card-2', 'deck-2', now), due: now + 1_000 },
    ];
    const reviewLogs = [
      {
        id: 'log-1',
        deckId: 'deck-1',
        cardId: 'card-1',
        reviewedAt: now - 5_000,
        grade: 1 as const,
        schedulingStateBefore: 'review',
        schedulingStateAfter: 'relearning',
        dueBefore: now - 6_000,
        dueAfter: now + 10_000,
      },
    ];
    const learningGraph = buildStudyLearningGraphSnapshot({
      decks,
      scheduling,
      reviewLogs,
      now,
    });
    const snapshot = buildAdaptiveTutorSnapshot({
      decks,
      scheduling,
      reviewLogs,
      learningGraph,
      now,
    });

    expect(snapshot.queue[0]?.cardId).toBe('card-1');
    expect(snapshot.queue[0]?.remediationDraft.provenance.docId).toBe('doc-1');
    expect(snapshot.queue[0]?.rationale.join(' ')).toContain('due');
    expect(snapshot.synthesisDrills[0]?.conceptId).toBe('newton-law');
  });

  it('evaluates teach-back responses against card keywords', () => {
    const result = evaluateTeachBackResponse(
      {
        id: 'card-1',
        deckId: 'deck-1',
        type: 'recall',
        question: 'Q',
        answer: 'Force equals mass times acceleration',
        rubric: ['explain acceleration'],
        provenance: { workspaceId: 'ws-1', docId: 'doc-1' },
        createdAt: 1,
        updatedAt: 1,
        suspended: false,
      },
      'Acceleration and force together determine motion with mass.'
    );
    expect(result.score).toBeGreaterThanOrEqual(2);
    expect(result.maxScore).toBe(5);
    expect(result.missingKeywords.length).toBeGreaterThanOrEqual(0);
  });
});
