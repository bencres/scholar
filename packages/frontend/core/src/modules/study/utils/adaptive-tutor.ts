import type { StudyCardContent, StudyCardScheduling } from '../entities/card';
import type { StudyDeck } from '../entities/deck';
import type { StudyReviewLog } from '../entities/review-log';
import type { StudyLearningGraphSnapshot } from './learning-graph';

const DAY_MS = 86_400_000;
const RECENT_WINDOW_MS = 14 * DAY_MS;

export interface StudyTutorRemediationDraft {
  deckId: string;
  question: string;
  answer: string;
  concepts: string[];
  misconceptions?: string[];
  tags: string[];
  provenance: StudyCardContent['provenance'];
}

export interface StudyTutorCardPlan {
  cardId: string;
  deckId: string;
  question: string;
  answer?: string;
  concepts: string[];
  provenance: StudyCardContent['provenance'];
  priorityScore: number;
  mastery: number;
  forgettingRisk: number;
  recentMisses: number;
  rationale: string[];
  remediationDraft: StudyTutorRemediationDraft;
}

export interface StudyTutorSynthesisDrill {
  conceptId: string;
  conceptLabel: string;
  deckIds: string[];
  prompt: string;
}

export interface StudyAdaptiveTutorSnapshot {
  generatedAt: number;
  queue: StudyTutorCardPlan[];
  synthesisDrills: StudyTutorSynthesisDrill[];
}

export interface StudyTeachBackEvaluation {
  score: number;
  maxScore: number;
  missingKeywords: string[];
  feedback: string[];
}

type BuildInput = {
  decks: StudyDeck[];
  scheduling: StudyCardScheduling[];
  reviewLogs: StudyReviewLog[];
  learningGraph: StudyLearningGraphSnapshot;
  targetCount?: number;
  now?: number;
};

export function buildAdaptiveTutorSnapshot({
  decks,
  scheduling,
  reviewLogs,
  learningGraph,
  targetCount = 8,
  now = Date.now(),
}: BuildInput): StudyAdaptiveTutorSnapshot {
  const schedulingByCardId = new Map(scheduling.map(row => [row.cardId, row]));
  const recentMissesByCardId = new Map<string, number>();
  for (const log of reviewLogs) {
    if (now - log.reviewedAt > RECENT_WINDOW_MS || log.grade > 2) {
      continue;
    }
    recentMissesByCardId.set(
      log.cardId,
      (recentMissesByCardId.get(log.cardId) ?? 0) + 1
    );
  }

  const conceptById = new Map(learningGraph.concepts.map(c => [c.id, c]));
  const queue: StudyTutorCardPlan[] = [];

  for (const deck of decks) {
    for (const card of deck.cards) {
      if (card.suspended) continue;
      const conceptIds = normalizeConceptIds(card);
      if (!conceptIds.length) continue;
      const matchedConcepts = conceptIds
        .map(conceptId => conceptById.get(conceptId))
        .filter(Boolean);
      const conceptRisk = average(
        matchedConcepts.map(concept => concept?.forgettingRisk ?? 0.35)
      );
      const conceptMastery = average(
        matchedConcepts.map(concept => concept?.mastery ?? 0.5)
      );
      const row = schedulingByCardId.get(card.id);
      const cardRisk = scoreCardRisk(row, now);
      const recentMisses = recentMissesByCardId.get(card.id) ?? 0;
      const missPenalty = Math.min(1, recentMisses / 3);
      const priorityScore = clamp01(
        conceptRisk * 0.55 + cardRisk * 0.25 + missPenalty * 0.2
      );
      const rationale: string[] = [];
      if (conceptRisk >= 0.6) rationale.push('high concept forgetting risk');
      if (recentMisses > 0)
        rationale.push(`missed ${recentMisses} times recently`);
      if (row && row.due <= now)
        rationale.push('currently due in review queue');
      if (!rationale.length)
        rationale.push('scheduled for proactive reinforcement');
      queue.push({
        cardId: card.id,
        deckId: deck.id,
        question: card.question,
        answer: card.answer,
        concepts: conceptIds,
        provenance: card.provenance,
        priorityScore,
        mastery: conceptMastery,
        forgettingRisk: conceptRisk,
        recentMisses,
        rationale,
        remediationDraft: buildRemediationDraft(card, deck.id, conceptIds),
      });
    }
  }

  const synthesisDrills = buildSynthesisDrills(learningGraph);
  return {
    generatedAt: now,
    queue: queue
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, targetCount),
    synthesisDrills,
  };
}

export function evaluateTeachBackResponse(
  card: StudyCardContent,
  response: string
): StudyTeachBackEvaluation {
  const normalized = response.toLowerCase();
  const keywords = extractKeywords(card).slice(0, 6);
  const matched = keywords.filter(keyword => normalized.includes(keyword));
  const score = Math.round((matched.length / Math.max(1, keywords.length)) * 5);
  const feedback: string[] = [];
  if (score <= 2) {
    feedback.push('Explain the core mechanism in your own words first.');
  }
  if (score <= 3) {
    feedback.push('Include one concrete detail from the answer or rubric.');
  }
  if (score >= 4) {
    feedback.push('Strong teach-back. Add an example to lock transfer.');
  }
  return {
    score,
    maxScore: 5,
    missingKeywords: keywords.filter(keyword => !normalized.includes(keyword)),
    feedback,
  };
}

function buildRemediationDraft(
  card: StudyCardContent,
  deckId: string,
  concepts: string[]
): StudyTutorRemediationDraft {
  const leadingConcept = concepts[0] ?? 'core-concept';
  return {
    deckId,
    question: `Remediation: explain ${leadingConcept.replaceAll('-', ' ')} in relation to "${card.question}"`,
    answer:
      card.answer?.trim() ||
      'Provide a concise explanation and one contrasting counter-example.',
    concepts,
    misconceptions: card.misconceptions,
    tags: [
      ...(card.tags ?? []),
      'tutor:remediation',
      `concept:${leadingConcept}`,
    ],
    provenance: card.provenance,
  };
}

function buildSynthesisDrills(
  learningGraph: StudyLearningGraphSnapshot
): StudyTutorSynthesisDrill[] {
  return learningGraph.concepts
    .filter(concept => concept.deckIds.length >= 2)
    .slice(0, 6)
    .map(concept => ({
      conceptId: concept.id,
      conceptLabel: concept.label,
      deckIds: concept.deckIds,
      prompt: `Connect ${concept.label} across ${concept.deckIds.length} decks and explain one transferable pattern.`,
    }));
}

function normalizeConceptIds(card: StudyCardContent) {
  const conceptTags = (card.tags ?? [])
    .filter(tag => tag.toLowerCase().startsWith('concept:'))
    .map(tag => tag.slice('concept:'.length).trim());
  return [
    ...new Set(
      [...(card.concepts ?? []), ...conceptTags].map(normalizeConceptId)
    ),
  ];
}

function normalizeConceptId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function scoreCardRisk(row: StudyCardScheduling | undefined, now: number) {
  if (!row) {
    return 0.35;
  }
  const dueFactor = row.due <= now ? 0.7 : 0.2;
  const difficultyFactor = clamp01(row.difficulty / 10);
  const lapseFactor = clamp01(row.lapses / Math.max(1, row.reps || 1));
  return clamp01(
    dueFactor * 0.4 + difficultyFactor * 0.35 + lapseFactor * 0.25
  );
}

function extractKeywords(card: StudyCardContent) {
  const fromAnswer = (card.answer ?? '').toLowerCase().split(/[^a-z0-9]+/g);
  const fromRubric = (card.rubric ?? [])
    .join(' ')
    .toLowerCase()
    .split(/[^a-z0-9]+/g);
  return [...new Set([...fromAnswer, ...fromRubric])]
    .map(token => token.trim())
    .filter(token => token.length >= 5);
}

function average(values: number[]) {
  if (!values.length) return 0;
  return clamp01(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function clamp01(value: number) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return Number(value.toFixed(3));
}
