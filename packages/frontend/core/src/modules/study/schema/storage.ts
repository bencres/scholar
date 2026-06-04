import { z } from 'zod';

import type { StudyCardContent, StudyCardScheduling } from '../entities/card';
import type { StudyDeck } from '../entities/deck';
import type { StudyReviewLog, StudyReviewStats } from '../entities/review-log';

const StudyDeckSortPolicySchema = z.enum([
  'created-desc',
  'created-asc',
  'due-asc',
]);

const StudyDeckMetadataSchema = z
  .object({
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    sourceLinks: z.array(z.string()).optional(),
    sourcePage: z
      .object({
        docId: z.string(),
      })
      .optional(),
    noteTypes: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          kind: z.enum([
            'basic',
            'basic-reversed',
            'cloze',
            'image-occlusion',
            'custom',
          ]),
          fieldNames: z.array(z.string()),
          templates: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              front: z.string(),
              back: z.string(),
            })
          ),
        })
      )
      .optional(),
    sortPolicy: StudyDeckSortPolicySchema.optional(),
    limits: z
      .object({
        dailyNewLimit: z.number().int().positive().optional(),
        dailyReviewLimit: z.number().int().positive().optional(),
      })
      .optional(),
    optionsGroupId: z.string().optional(),
    schedulingOptions: z
      .object({
        learningStepsMinutes: z.array(z.number().positive()).optional(),
        relearningStepsMinutes: z.array(z.number().positive()).optional(),
        desiredRetention: z.number().positive().max(1).optional(),
        easyBonus: z.number().positive().optional(),
        graduatingIntervalDays: z.number().int().positive().optional(),
        easyIntervalDays: z.number().int().positive().optional(),
        newCardOrder: z.enum(['position', 'random']).optional(),
        burySiblings: z.boolean().optional(),
        leechThreshold: z.number().int().positive().optional(),
      })
      .optional(),
    filtered: z
      .object({
        query: z.string(),
        limit: z.number().int().positive().optional(),
        reschedule: z.boolean().optional(),
      })
      .optional(),
    browserPresets: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          query: z.string(),
        })
      )
      .optional(),
  })
  .optional();

const StudyDeckV3Schema: z.ZodType<StudyDeck> = z.object({
  id: z.string(),
  name: z.string(),
  sourceDocId: z.string().optional(),
  cardIds: z.array(z.string()),
  metadata: StudyDeckMetadataSchema,
  future: z
    .object({
      ownerId: z.string().optional(),
      visibility: z.enum(['private', 'shared', 'public']).optional(),
      originWorkspaceId: z.string().optional(),
      syncVector: z.string().optional(),
    })
    .optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const StudyCardContentSchema: z.ZodType<StudyCardContent> = z.object({
  id: z.string(),
  type: z.enum(['recall', 'synthesis']),
  concepts: z.array(z.string()).optional(),
  noteTypeId: z.string().optional(),
  templateId: z.string().optional(),
  noteFields: z.record(z.string(), z.string()).optional(),
  clozeOrdinal: z.number().int().positive().optional(),
  imageOcclusion: z
    .object({
      imageAssetId: z.string(),
      occlusionId: z.string(),
      prompt: z.string().optional(),
      answer: z.string().optional(),
    })
    .optional(),
  question: z.string(),
  answer: z.string().optional(),
  misconceptions: z.array(z.string()).optional(),
  rubric: z.array(z.string()).optional(),
  metadata: z
    .object({
      noteTypeHint: z
        .enum(['basic', 'reversed', 'cloze', 'scenario'])
        .optional(),
      cognitiveLevel: z
        .enum(['remember', 'understand', 'apply', 'analyze', 'evaluate'])
        .optional(),
      reasoningType: z
        .enum([
          'mechanism',
          'tradeoff',
          'comparison',
          'scenario',
          'debugging',
          'transfer',
        ])
        .optional(),
      difficulty: z.enum(['intro', 'intermediate', 'advanced']).optional(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
  provenance: z.object({
    workspaceId: z.string(),
    docId: z.string(),
    blockIds: z.array(z.string()).optional(),
    chunkId: z.string().optional(),
  }),
  createdAt: z.number(),
  updatedAt: z.number(),
  suspended: z.boolean(),
});

const StudyDeckV2Schema = z.object({
  id: z.string(),
  name: z.string(),
  sourceDocId: z.string().optional(),
  cards: z.array(z.unknown()),
  metadata: StudyDeckMetadataSchema,
  future: StudyDeckV3Schema.shape.future,
  createdAt: z.number(),
  updatedAt: z.number(),
});

const StudyCardSchedulingSchema: z.ZodType<StudyCardScheduling> = z.object({
  cardId: z.string(),
  deckId: z.string().optional(),
  state: z.enum(['new', 'learning', 'review', 'relearning']),
  due: z.number(),
  stability: z.number(),
  difficulty: z.number(),
  elapsedDays: z.number(),
  scheduledDays: z.number(),
  reps: z.number(),
  lapses: z.number(),
  learningStep: z.number().int().nonnegative().optional(),
  leech: z.boolean().optional(),
  lastReviewAt: z.number().optional(),
  lastGrade: z
    .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
    .optional(),
  buriedUntil: z.number().optional(),
  manualPosition: z.number().int().positive().optional(),
  customDueDate: z.number().optional(),
});

const StudyReviewLogSchema: z.ZodType<StudyReviewLog> = z.object({
  id: z.string(),
  deckId: z.string().optional(),
  cardId: z.string(),
  reviewedAt: z.number(),
  grade: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  schedulingStateBefore: z.string(),
  schedulingStateAfter: z.string(),
  dueBefore: z.number(),
  dueAfter: z.number(),
  durationMs: z.number().optional(),
});

export const STUDY_DECK_STORAGE_VERSION = 3;
export const STUDY_SIDECAR_STORAGE_VERSION = 2;

const StudyDeckStorageStateV3Schema = z.object({
  version: z.literal(STUDY_DECK_STORAGE_VERSION),
  cards: z.array(StudyCardContentSchema),
  decks: z.array(StudyDeckV3Schema),
});

const StudyDeckStorageStateV2Schema = z.object({
  version: z.literal(2),
  decks: z.array(StudyDeckV2Schema),
});

const StudySidecarStorageStateSchema = z.object({
  version: z.literal(STUDY_SIDECAR_STORAGE_VERSION),
  scheduling: z.array(StudyCardSchedulingSchema),
  reviewLogs: z.array(StudyReviewLogSchema),
});

export type StudyDeckStorageState = z.infer<
  typeof StudyDeckStorageStateV3Schema
>;

export type StudySidecarStorageState = z.infer<
  typeof StudySidecarStorageStateSchema
>;

function stripDeckIdFromCard(raw: unknown): StudyCardContent | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const { deckId: _deckId, ...rest } = record;
  const parsed = StudyCardContentSchema.safeParse(rest);
  return parsed.success ? parsed.data : null;
}

function migrateV2DecksToV3(
  v2Decks: z.infer<typeof StudyDeckV2Schema>[]
): StudyDeckStorageState {
  const cardsMap = new Map<string, StudyCardContent>();
  const decks: StudyDeck[] = [];

  for (const deck of v2Decks) {
    const cardIds: string[] = [];
    const embedded = Array.isArray(deck.cards) ? deck.cards : [];
    for (const rawCard of embedded) {
      const card = stripDeckIdFromCard(rawCard);
      if (!card) continue;
      cardsMap.set(card.id, card);
      cardIds.push(card.id);
    }
    decks.push({
      id: deck.id,
      name: deck.name,
      sourceDocId: deck.sourceDocId,
      cardIds,
      metadata: deck.metadata,
      future: deck.future,
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt,
    });
  }

  return {
    version: STUDY_DECK_STORAGE_VERSION,
    cards: [...cardsMap.values()],
    decks,
  };
}

function migrateLegacyDeckArray(raw: unknown[]): StudyDeckStorageState {
  const v2Decks: z.infer<typeof StudyDeckV2Schema>[] = [];
  for (const item of raw) {
    const parsed = StudyDeckV2Schema.safeParse(item);
    if (parsed.success) {
      v2Decks.push(parsed.data);
    }
  }
  return migrateV2DecksToV3(v2Decks);
}

function toDeckStorageStateFromLegacy(raw: unknown): StudyDeckStorageState {
  if (Array.isArray(raw)) {
    return migrateLegacyDeckArray(raw);
  }
  return createEmptyDeckStorageState();
}

export function dedupeSchedulingByCardId(
  scheduling: StudyCardScheduling[]
): StudyCardScheduling[] {
  const byCard = new Map<string, StudyCardScheduling>();
  for (const row of scheduling) {
    const existing = byCard.get(row.cardId);
    if (!existing || row.due < existing.due) {
      const { deckId: _deckId, ...rest } = row;
      byCard.set(row.cardId, rest);
    }
  }
  return [...byCard.values()];
}

function toSidecarStorageStateFromLegacy(
  raw: unknown
): StudySidecarStorageState {
  if (Array.isArray(raw)) {
    const parsed = z.array(StudyCardSchedulingSchema).safeParse(raw);
    return {
      version: STUDY_SIDECAR_STORAGE_VERSION,
      scheduling: dedupeSchedulingByCardId(parsed.success ? parsed.data : []),
      reviewLogs: [],
    };
  }
  return {
    version: STUDY_SIDECAR_STORAGE_VERSION,
    scheduling: [],
    reviewLogs: [],
  };
}

export function normalizeDeckStorageState(raw: unknown): StudyDeckStorageState {
  const v3 = StudyDeckStorageStateV3Schema.safeParse(raw);
  if (v3.success) {
    return v3.data;
  }

  const v2 = StudyDeckStorageStateV2Schema.safeParse(raw);
  if (v2.success) {
    return migrateV2DecksToV3(v2.data.decks);
  }

  return toDeckStorageStateFromLegacy(raw);
}

export function normalizeSidecarStorageState(
  raw: unknown
): StudySidecarStorageState {
  const parsed = StudySidecarStorageStateSchema.safeParse(raw);
  if (parsed.success) {
    return {
      ...parsed.data,
      scheduling: dedupeSchedulingByCardId(parsed.data.scheduling),
    };
  }
  return toSidecarStorageStateFromLegacy(raw);
}

export function isDeckStorageState(raw: unknown): raw is StudyDeckStorageState {
  return StudyDeckStorageStateV3Schema.safeParse(raw).success;
}

export function isSidecarStorageState(
  raw: unknown
): raw is StudySidecarStorageState {
  return StudySidecarStorageStateSchema.safeParse(raw).success;
}

export function createEmptyDeckStorageState(): StudyDeckStorageState {
  return {
    version: STUDY_DECK_STORAGE_VERSION,
    cards: [],
    decks: [],
  };
}

export function createEmptySidecarStorageState(): StudySidecarStorageState {
  return {
    version: STUDY_SIDECAR_STORAGE_VERSION,
    scheduling: [],
    reviewLogs: [],
  };
}

export function summarizeReviewLogs(logs: StudyReviewLog[]): StudyReviewStats {
  const byGrade: StudyReviewStats['byGrade'] = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  };
  let lastReviewedAt: number | undefined;
  for (const log of logs) {
    byGrade[log.grade] += 1;
    if (!lastReviewedAt || log.reviewedAt > lastReviewedAt) {
      lastReviewedAt = log.reviewedAt;
    }
  }
  return {
    totalReviews: logs.length,
    byGrade,
    lastReviewedAt,
  };
}
