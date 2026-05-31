import { describe, expect, it } from 'vitest';

import {
  buildIntelligenceDashboardSnapshot,
  buildStudyGoalPlan,
} from './intelligence-dashboard';

describe('intelligence dashboard', () => {
  it('builds mastery/risk snapshot and recommendations', () => {
    const dashboard = buildIntelligenceDashboardSnapshot({
      learningGraph: {
        generatedAt: 1,
        totalCards: 10,
        mappedCards: 8,
        uncoveredCardIds: [],
        concepts: [
          {
            id: 'concept-a',
            label: 'Concept A',
            cardCount: 3,
            dueCount: 2,
            coverageShare: 0.4,
            forgettingRisk: 0.72,
            mastery: 0.42,
            prerequisiteReadiness: 0.5,
            recentMisses: 3,
            prerequisites: [],
            misconceptions: [],
            deckIds: ['deck-1'],
          },
        ],
        edges: [],
        coverageByDeck: [
          {
            deckId: 'deck-1',
            deckName: 'Deck 1',
            totalCards: 5,
            mappedCards: 4,
            mappedRatio: 0.8,
            dueMappedCards: 2,
          },
        ],
      },
      tutor: {
        generatedAt: 1,
        queue: [
          {
            cardId: 'card-1',
            deckId: 'deck-1',
            question: 'Q',
            answer: 'A',
            concepts: ['concept-a'],
            provenance: { workspaceId: 'ws', docId: 'doc-1' },
            priorityScore: 0.88,
            mastery: 0.4,
            forgettingRisk: 0.7,
            recentMisses: 2,
            rationale: ['high concept forgetting risk'],
            remediationDraft: {
              deckId: 'deck-1',
              question: 'RQ',
              answer: 'RA',
              concepts: ['concept-a'],
              tags: ['tutor:remediation'],
              provenance: { workspaceId: 'ws', docId: 'doc-1' },
            },
          },
        ],
        synthesisDrills: [],
      },
      stats: {
        retentionCurve: [],
        intervalDistribution: [],
        easeDistribution: [],
        workloadForecast: [{ dayOffset: 0, dueCount: 20 }],
        leechCount: 0,
        lapseCount: 0,
      },
      scheduling: [],
      now: 1,
    });

    expect(dashboard.masteryBands.fragile).toBe(1);
    expect(dashboard.topRiskCards[0]?.cardId).toBe('card-1');
    expect(dashboard.recommendations.length).toBeGreaterThan(0);
  });

  it('builds practical goal plan targets', () => {
    const plan = buildStudyGoalPlan(
      { daysUntilGoal: 21, minutesPerDay: 45, targetRetention: 0.9 },
      {
        generatedAt: 1,
        masteryBands: { strong: 2, developing: 3, fragile: 4 },
        topRiskConcepts: [],
        topRiskCards: Array.from({ length: 9 }, (_, index) => ({
          cardId: `card-${index}`,
          deckId: 'deck-1',
          priorityScore: 0.7,
          rationale: ['risk'],
        })),
        recommendations: [],
        workloadForecast: [
          { dayOffset: 0, dueCount: 12 },
          { dayOffset: 1, dueCount: 18 },
        ],
      }
    );
    expect(plan.dailyCardsTarget).toBeGreaterThanOrEqual(8);
    expect(plan.dailyReviewTarget).toBeGreaterThanOrEqual(
      plan.dailyCardsTarget
    );
    expect(plan.recommendation.length).toBeGreaterThan(0);
  });
});
