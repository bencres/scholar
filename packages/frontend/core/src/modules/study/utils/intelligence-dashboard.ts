import type { StudyCardScheduling } from '../entities/card';
import type { StudyAdaptiveTutorSnapshot } from './adaptive-tutor';
import type { StudyLearningGraphSnapshot } from './learning-graph';
import type { StudyStatsSnapshot } from './study-stats';

export interface StudyMasteryBandSummary {
  strong: number;
  developing: number;
  fragile: number;
}

export interface StudyGoalPlanInput {
  daysUntilGoal: number;
  minutesPerDay: number;
  targetRetention: number;
}

export interface StudyGoalPlan {
  daysUntilGoal: number;
  dailyCardsTarget: number;
  dailyReviewTarget: number;
  estimatedMinutesPerDay: number;
  targetRetention: number;
  bufferDays: number;
  recommendation: string;
}

export interface StudyIntelligenceDashboardSnapshot {
  generatedAt: number;
  masteryBands: StudyMasteryBandSummary;
  topRiskConcepts: Array<{
    conceptId: string;
    label: string;
    mastery: number;
    forgettingRisk: number;
    dueCount: number;
    recentMisses: number;
  }>;
  topRiskCards: Array<{
    cardId: string;
    deckId: string;
    priorityScore: number;
    rationale: string[];
  }>;
  recommendations: string[];
  workloadForecast: StudyStatsSnapshot['workloadForecast'];
}

type BuildInput = {
  learningGraph: StudyLearningGraphSnapshot;
  tutor: StudyAdaptiveTutorSnapshot;
  stats: StudyStatsSnapshot;
  scheduling: StudyCardScheduling[];
  now?: number;
};

export function buildIntelligenceDashboardSnapshot({
  learningGraph,
  tutor,
  stats,
  scheduling,
  now = Date.now(),
}: BuildInput): StudyIntelligenceDashboardSnapshot {
  const masteryBands: StudyMasteryBandSummary = {
    strong: learningGraph.concepts.filter(item => item.mastery >= 0.75).length,
    developing: learningGraph.concepts.filter(
      item => item.mastery >= 0.5 && item.mastery < 0.75
    ).length,
    fragile: learningGraph.concepts.filter(item => item.mastery < 0.5).length,
  };
  const topRiskConcepts = learningGraph.concepts.slice(0, 8).map(concept => ({
    conceptId: concept.id,
    label: concept.label,
    mastery: concept.mastery,
    forgettingRisk: concept.forgettingRisk,
    dueCount: concept.dueCount,
    recentMisses: concept.recentMisses,
  }));
  const topRiskCards = tutor.queue.slice(0, 8).map(item => ({
    cardId: item.cardId,
    deckId: item.deckId,
    priorityScore: item.priorityScore,
    rationale: item.rationale,
  }));
  const dueSoon = scheduling.filter(
    row => row.due <= now + 2 * 86_400_000
  ).length;
  const recommendations = buildRecommendations({
    masteryBands,
    dueSoon,
    tutorQueueSize: tutor.queue.length,
    averageRisk: average(
      learningGraph.concepts.map(concept => concept.forgettingRisk)
    ),
  });
  return {
    generatedAt: now,
    masteryBands,
    topRiskConcepts,
    topRiskCards,
    recommendations,
    workloadForecast: stats.workloadForecast,
  };
}

export function buildStudyGoalPlan(
  input: StudyGoalPlanInput,
  dashboard: StudyIntelligenceDashboardSnapshot
): StudyGoalPlan {
  const daysUntilGoal = Math.max(1, Math.floor(input.daysUntilGoal));
  const minutesPerDay = Math.max(10, Math.floor(input.minutesPerDay));
  const targetRetention = clamp(input.targetRetention, 0.7, 0.97);
  const riskLoad = dashboard.topRiskCards.length;
  const fragilePenalty = dashboard.masteryBands.fragile * 1.2;
  const retentionFactor = 1 + (targetRetention - 0.8) * 1.8;
  const rawCardsPerDay =
    ((riskLoad + fragilePenalty) * retentionFactor) /
    Math.max(1, daysUntilGoal / 7);
  const dailyCardsTarget = Math.max(8, Math.ceil(rawCardsPerDay));
  const dailyReviewTarget = Math.max(
    dailyCardsTarget,
    Math.ceil(
      dashboard.workloadForecast.reduce((sum, day) => sum + day.dueCount, 0) / 7
    )
  );
  const estimatedMinutesPerDay = Math.ceil(
    (dailyCardsTarget + dailyReviewTarget) * 0.7
  );
  const bufferDays = Math.max(
    0,
    Math.floor((minutesPerDay - estimatedMinutesPerDay) / 20)
  );
  const recommendation =
    estimatedMinutesPerDay <= minutesPerDay
      ? 'Current pace is feasible. Prioritize fragile concepts first.'
      : 'Planned pace is tight. Reduce target retention or add extra study days.';
  return {
    daysUntilGoal,
    dailyCardsTarget,
    dailyReviewTarget,
    estimatedMinutesPerDay,
    targetRetention: Number(targetRetention.toFixed(2)),
    bufferDays,
    recommendation,
  };
}

function buildRecommendations(input: {
  masteryBands: StudyMasteryBandSummary;
  dueSoon: number;
  tutorQueueSize: number;
  averageRisk: number;
}) {
  const recommendations: string[] = [];
  if (input.masteryBands.fragile > input.masteryBands.strong) {
    recommendations.push(
      'Shift this week toward remediation sessions before adding many new cards.'
    );
  }
  if (input.dueSoon > 25) {
    recommendations.push(
      'Backlog spike detected in the next 48 hours. Run a focused review sprint.'
    );
  }
  if (input.tutorQueueSize > 0) {
    recommendations.push(
      'Use adaptive tutor mode to close high-risk concepts with provenance-grounded remediation.'
    );
  }
  if (input.averageRisk >= 0.6) {
    recommendations.push(
      'Forgetting risk is elevated. Interleave cross-deck synthesis drills after each review block.'
    );
  }
  if (!recommendations.length) {
    recommendations.push(
      'Mastery and risk are balanced. Maintain cadence and schedule one synthesis drill daily.'
    );
  }
  return recommendations;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
