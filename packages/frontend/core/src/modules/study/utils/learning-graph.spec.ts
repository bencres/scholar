import { describe, expect, it } from 'vitest';

import type { StudyCardContent } from '../entities/card';
import { buildStudyLearningGraphSnapshot } from './learning-graph';
import { createInitialScheduling } from './scheduling';

describe('study learning graph', () => {
  it('builds concept coverage and prerequisite edges', () => {
    const now = 1_720_000_000_000;
    const cards: StudyCardContent[] = [
      {
        id: 'card-1',
        type: 'recall',
        question: 'What is ATP?',
        answer: 'Cell energy molecule',
        concepts: ['Cell Respiration', 'ATP Cycle'],
        tags: ['prereq:mitochondria'],
        provenance: { workspaceId: 'ws-1', docId: 'doc-1' },
        createdAt: now,
        updatedAt: now,
        suspended: false,
      },
      {
        id: 'card-2',
        type: 'recall',
        question: 'Photosynthesis input',
        answer: 'CO2 + H2O',
        tags: ['concept:photosynthesis'],
        misconceptions: ['plants absorb food from soil'],
        provenance: { workspaceId: 'ws-1', docId: 'doc-1' },
        createdAt: now,
        updatedAt: now,
        suspended: false,
      },
      {
        id: 'card-3',
        type: 'synthesis',
        question: 'Compare ATP and NADH roles.',
        rubric: ['Contrast storage and transport'],
        provenance: { workspaceId: 'ws-1', docId: 'doc-2' },
        createdAt: now,
        updatedAt: now,
        suspended: false,
      },
    ];
    const decks = [
      {
        id: 'deck-1',
        name: 'Biology',
        cardIds: ['card-1', 'card-2', 'card-3'],
        createdAt: now,
        updatedAt: now,
      },
    ];
    const scheduling = [
      { ...createInitialScheduling('card-1', now), due: now - 1_000 },
      {
        ...createInitialScheduling('card-2', now),
        due: now + 1_000,
        difficulty: 6,
      },
    ];
    const reviewLogs = [
      {
        id: 'log-1',
        cardId: 'card-1',
        reviewedAt: now - 1_000,
        grade: 4 as const,
        schedulingStateBefore: 'new',
        schedulingStateAfter: 'review',
        dueBefore: now - 2_000,
        dueAfter: now + 20_000,
      },
      {
        id: 'log-2',
        cardId: 'card-2',
        reviewedAt: now - 2_000,
        grade: 1 as const,
        schedulingStateBefore: 'learning',
        schedulingStateAfter: 'relearning',
        dueBefore: now - 5_000,
        dueAfter: now + 50_000,
      },
    ];

    const graph = buildStudyLearningGraphSnapshot({
      decks,
      cards,
      scheduling,
      reviewLogs,
      now,
    });

    expect(graph.totalCards).toBe(3);
    expect(graph.mappedCards).toBe(2);
    expect(graph.uncoveredCardIds).toContain('card-3');
    expect(
      graph.concepts.find(item => item.id === 'cell-respiration')?.cardCount
    ).toBe(1);
    expect(
      graph.concepts.find(item => item.id === 'cell-respiration')?.dueCount
    ).toBe(1);
    expect(
      graph.edges.find(
        edge =>
          edge.type === 'prerequisite' &&
          edge.from === 'mitochondria' &&
          edge.to === 'cell-respiration'
      )
    ).toBeTruthy();
    expect(graph.coverageByDeck[0]?.mappedRatio).toBeCloseTo(0.667, 2);
    expect(
      graph.concepts.find(item => item.id === 'cell-respiration')
        ?.prerequisiteReadiness
    ).toBeGreaterThan(0);
  });
});
