import type { StudyCardContent, StudyCardScheduling } from '../entities/card';
import type { StudyDeck } from '../entities/deck';
import type { StudyReviewLog } from '../entities/review-log';
import { normalizeConceptId } from './study-graph-metadata';
import { getDeckCards } from './study-storage';

const DAY_MS = 86_400_000;
const RECENT_WINDOW_MS = 14 * DAY_MS;

export interface StudyLearningGraphEdge {
  from: string;
  to: string;
  type: 'prerequisite' | 'misconception';
}

export interface StudyLearningGraphConcept {
  id: string;
  label: string;
  cardCount: number;
  dueCount: number;
  coverageShare: number;
  forgettingRisk: number;
  mastery: number;
  prerequisiteReadiness: number;
  recentMisses: number;
  prerequisites: string[];
  misconceptions: string[];
  deckIds: string[];
}

export interface StudyLearningGraphDeckCoverage {
  deckId: string;
  deckName: string;
  totalCards: number;
  mappedCards: number;
  mappedRatio: number;
  dueMappedCards: number;
}

export interface StudyLearningGraphSnapshot {
  generatedAt: number;
  totalCards: number;
  mappedCards: number;
  uncoveredCardIds: string[];
  concepts: StudyLearningGraphConcept[];
  edges: StudyLearningGraphEdge[];
  coverageByDeck: StudyLearningGraphDeckCoverage[];
}

type BuildInput = {
  decks: StudyDeck[];
  cards: StudyCardContent[];
  scheduling: StudyCardScheduling[];
  reviewLogs: StudyReviewLog[];
  now?: number;
};

type ConceptAccumulator = {
  id: string;
  label: string;
  cardIds: Set<string>;
  dueCount: number;
  forgettingRiskTotal: number;
  masteryTotal: number;
  recentMisses: number;
  prerequisites: Set<string>;
  misconceptions: Set<string>;
  deckIds: Set<string>;
};

export function buildStudyLearningGraphSnapshot({
  decks,
  cards,
  scheduling,
  reviewLogs,
  now = Date.now(),
}: BuildInput): StudyLearningGraphSnapshot {
  const schedulingByCardId = new Map(scheduling.map(row => [row.cardId, row]));
  const logsByCardId = new Map<string, StudyReviewLog[]>();
  for (const log of reviewLogs) {
    const current = logsByCardId.get(log.cardId);
    if (current) {
      current.push(log);
    } else {
      logsByCardId.set(log.cardId, [log]);
    }
  }

  const conceptMap = new Map<string, ConceptAccumulator>();
  const edgeSet = new Set<string>();
  let totalCards = 0;
  let mappedCards = 0;
  const uncoveredCardIds: string[] = [];
  const coverageByDeck: StudyLearningGraphDeckCoverage[] = [];

  for (const deck of decks) {
    let deckTotalCards = 0;
    let deckMappedCards = 0;
    let deckDueMappedCards = 0;
    for (const card of getDeckCards(deck, cards)) {
      totalCards += 1;
      deckTotalCards += 1;
      const conceptIds = extractConceptIds(card);
      if (!conceptIds.length) {
        uncoveredCardIds.push(card.id);
        continue;
      }
      mappedCards += 1;
      deckMappedCards += 1;
      const row = schedulingByCardId.get(card.id);
      const cardLogs = logsByCardId.get(card.id) ?? [];
      const cardMastery = scoreCardMastery(row, cardLogs, now);
      const cardRisk = scoreForgettingRisk(row, now);
      const cardMisses = countRecentMisses(cardLogs, now);
      const due = row && row.due <= now ? 1 : 0;
      if (due) {
        deckDueMappedCards += 1;
      }
      const prereq = extractPrefixedTags(card.tags, 'prereq:');
      const misconceptions = extractMisconceptions(card);

      for (const conceptId of conceptIds) {
        const concept = ensureConcept(conceptMap, conceptId);
        concept.cardIds.add(card.id);
        concept.dueCount += due;
        concept.forgettingRiskTotal += cardRisk;
        concept.masteryTotal += cardMastery;
        concept.recentMisses += cardMisses;
        concept.deckIds.add(deck.id);
        for (const prerequisite of prereq) {
          ensureConcept(conceptMap, prerequisite).deckIds.add(deck.id);
          concept.prerequisites.add(prerequisite);
          edgeSet.add(`${prerequisite}->${conceptId}:prerequisite`);
        }
        for (const misconception of misconceptions) {
          ensureConcept(conceptMap, misconception).deckIds.add(deck.id);
          concept.misconceptions.add(misconception);
          if (misconception !== conceptId) {
            edgeSet.add(`${misconception}->${conceptId}:misconception`);
          }
        }
      }
    }
    coverageByDeck.push({
      deckId: deck.id,
      deckName: deck.name,
      totalCards: deckTotalCards,
      mappedCards: deckMappedCards,
      mappedRatio:
        deckTotalCards > 0
          ? Number((deckMappedCards / deckTotalCards).toFixed(3))
          : 0,
      dueMappedCards: deckDueMappedCards,
    });
  }

  const concepts = [...conceptMap.values()]
    .map(concept => {
      const cardCount = concept.cardIds.size || 1;
      const prerequisiteReadiness = concept.prerequisites.size
        ? average(
            [...concept.prerequisites].map(prerequisiteId => {
              const prerequisiteConcept = conceptMap.get(prerequisiteId);
              if (
                !prerequisiteConcept ||
                prerequisiteConcept.cardIds.size === 0
              ) {
                return 0.5;
              }
              return (
                prerequisiteConcept.masteryTotal /
                Math.max(1, prerequisiteConcept.cardIds.size)
              );
            })
          )
        : 1;
      return {
        id: concept.id,
        label: concept.label,
        cardCount: concept.cardIds.size,
        dueCount: concept.dueCount,
        coverageShare:
          mappedCards > 0
            ? Number((concept.cardIds.size / mappedCards).toFixed(3))
            : 0,
        forgettingRisk: Number(
          (concept.forgettingRiskTotal / cardCount).toFixed(3)
        ),
        mastery: Number((concept.masteryTotal / cardCount).toFixed(3)),
        prerequisiteReadiness: Number(prerequisiteReadiness.toFixed(3)),
        recentMisses: concept.recentMisses,
        prerequisites: [...concept.prerequisites].sort(),
        misconceptions: [...concept.misconceptions].sort(),
        deckIds: [...concept.deckIds].sort(),
      };
    })
    .sort((a, b) => {
      if (b.forgettingRisk !== a.forgettingRisk) {
        return b.forgettingRisk - a.forgettingRisk;
      }
      if (a.mastery !== b.mastery) {
        return a.mastery - b.mastery;
      }
      return a.label.localeCompare(b.label);
    });

  const edges = [...edgeSet]
    .map(item => {
      const [pair, type] = item.split(':');
      const [from, to] = pair.split('->');
      return {
        from,
        to,
        type: type as StudyLearningGraphEdge['type'],
      };
    })
    .filter(
      edge =>
        conceptMap.has(edge.from) &&
        conceptMap.has(edge.to) &&
        edge.from !== edge.to
    )
    .sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));

  return {
    generatedAt: now,
    totalCards,
    mappedCards,
    uncoveredCardIds,
    concepts,
    edges,
    coverageByDeck: coverageByDeck.sort((a, b) =>
      a.deckName.localeCompare(b.deckName)
    ),
  };
}

function ensureConcept(
  concepts: Map<string, ConceptAccumulator>,
  conceptId: string
): ConceptAccumulator {
  const existing = concepts.get(conceptId);
  if (existing) {
    return existing;
  }
  const created: ConceptAccumulator = {
    id: conceptId,
    label: toConceptLabel(conceptId),
    cardIds: new Set(),
    dueCount: 0,
    forgettingRiskTotal: 0,
    masteryTotal: 0,
    recentMisses: 0,
    prerequisites: new Set(),
    misconceptions: new Set(),
    deckIds: new Set(),
  };
  concepts.set(conceptId, created);
  return created;
}

function scoreCardMastery(
  scheduling: StudyCardScheduling | undefined,
  logs: StudyReviewLog[],
  now: number
) {
  if (!scheduling && !logs.length) {
    return 0.5;
  }
  const recentLogs = logs
    .filter(log => now - log.reviewedAt <= RECENT_WINDOW_MS)
    .sort((a, b) => b.reviewedAt - a.reviewedAt)
    .slice(0, 8);
  const recentSuccess =
    recentLogs.length > 0
      ? recentLogs.filter(log => log.grade >= 3).length / recentLogs.length
      : 0.5;
  const difficultyFactor = scheduling
    ? 1 - Math.min(1, Math.max(0, scheduling.difficulty / 10))
    : 0.5;
  return clamp01(recentSuccess * 0.7 + difficultyFactor * 0.3);
}

function scoreForgettingRisk(
  scheduling: StudyCardScheduling | undefined,
  now: number
) {
  if (!scheduling) {
    return 0.35;
  }
  const overdueRatio =
    scheduling.due <= now ? Math.min(1.5, (now - scheduling.due) / DAY_MS) : 0;
  const dueFactor =
    scheduling.due <= now ? clamp01(0.45 + overdueRatio * 0.35) : 0.15;
  const difficultyFactor = clamp01(scheduling.difficulty / 10);
  const lapseFactor = clamp01(
    scheduling.lapses / Math.max(1, scheduling.reps || 1)
  );
  return clamp01(dueFactor * 0.5 + difficultyFactor * 0.3 + lapseFactor * 0.2);
}

function countRecentMisses(logs: StudyReviewLog[], now: number) {
  return logs.filter(
    log => now - log.reviewedAt <= RECENT_WINDOW_MS && log.grade <= 2
  ).length;
}

function extractConceptIds(card: StudyCardContent) {
  const explicit = card.concepts ?? [];
  const tagged = extractPrefixedTags(card.tags, 'concept:');
  const combined = [...explicit, ...tagged]
    .map(normalizeConceptId)
    .filter(Boolean);
  return [...new Set(combined)];
}

function extractMisconceptions(card: StudyCardContent) {
  return [
    ...(card.misconceptions ?? []),
    ...extractPrefixedTags(card.tags, 'mistake:'),
  ]
    .map(normalizeConceptId)
    .filter(Boolean);
}

function extractPrefixedTags(tags: string[] | undefined, prefix: string) {
  if (!tags?.length) {
    return [];
  }
  return tags
    .map(tag => tag.trim())
    .filter(tag => tag.toLowerCase().startsWith(prefix))
    .map(tag => tag.slice(prefix.length).trim())
    .filter(Boolean);
}

function toConceptLabel(id: string) {
  return id
    .split('-')
    .filter(Boolean)
    .map(chunk => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

function clamp01(value: number) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return Number(value.toFixed(3));
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }
  return clamp01(values.reduce((sum, value) => sum + value, 0) / values.length);
}
