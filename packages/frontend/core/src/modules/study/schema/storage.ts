import { z } from 'zod';

import type { StudyCardScheduling } from '../entities/card';
import type { StudyDeck } from '../entities/deck';
import type { StudyReviewLog, StudyReviewStats } from '../entities/review-log';

const StudyDeckSortPolicySchema = z.enum([
  'created-desc',
  'created-asc',
  'due-asc',
]);

const StudyDeckSchema: z.ZodType<StudyDeck> = z.object({
  id: z.string(),
  name: z.string(),
  sourceDocId: z.string().optional(),
  cards: z.array(z.unknown()).transform(cards => cards as StudyDeck['cards']),
  metadata: z
    .object({
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
      sourceLinks: z.array(z.string()).optional(),
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
    .optional(),
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

const StudyCardSchedulingSchema: z.ZodType<StudyCardScheduling> = z.object({
  cardId: z.string(),
  deckId: z.string(),
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
  deckId: z.string(),
  cardId: z.string(),
  reviewedAt: z.number(),
  grade: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  schedulingStateBefore: z.string(),
  schedulingStateAfter: z.string(),
  dueBefore: z.number(),
  dueAfter: z.number(),
  durationMs: z.number().optional(),
});

export const STUDY_DECK_STORAGE_VERSION = 2;
export const STUDY_SIDECAR_STORAGE_VERSION = 2;

const StudyDeckStorageStateSchema = z.object({
  version: z.literal(STUDY_DECK_STORAGE_VERSION),
  decks: z.array(StudyDeckSchema),
});

const StudySidecarStorageStateSchema = z.object({
  version: z.literal(STUDY_SIDECAR_STORAGE_VERSION),
  scheduling: z.array(StudyCardSchedulingSchema),
  reviewLogs: z.array(StudyReviewLogSchema),
});

export type StudyDeckStorageState = z.infer<typeof StudyDeckStorageStateSchema>;
export type StudySidecarStorageState = z.infer<
  typeof StudySidecarStorageStateSchema
>;

function toDeckStorageStateFromLegacy(raw: unknown): StudyDeckStorageState {
  if (Array.isArray(raw)) {
    const parsed = z.array(StudyDeckSchema).safeParse(raw);
    return {
      version: STUDY_DECK_STORAGE_VERSION,
      decks: parsed.success ? parsed.data : [],
    };
  }
  return { version: STUDY_DECK_STORAGE_VERSION, decks: [] };
}

function toSidecarStorageStateFromLegacy(
  raw: unknown
): StudySidecarStorageState {
  if (Array.isArray(raw)) {
    const parsed = z.array(StudyCardSchedulingSchema).safeParse(raw);
    return {
      version: STUDY_SIDECAR_STORAGE_VERSION,
      scheduling: parsed.success ? parsed.data : [],
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
  const parsed = StudyDeckStorageStateSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }
  return toDeckStorageStateFromLegacy(raw);
}

export function normalizeSidecarStorageState(
  raw: unknown
): StudySidecarStorageState {
  const parsed = StudySidecarStorageStateSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }
  return toSidecarStorageStateFromLegacy(raw);
}

export function isDeckStorageState(raw: unknown): raw is StudyDeckStorageState {
  return StudyDeckStorageStateSchema.safeParse(raw).success;
}

export function isSidecarStorageState(
  raw: unknown
): raw is StudySidecarStorageState {
  return StudySidecarStorageStateSchema.safeParse(raw).success;
}

export function createEmptyDeckStorageState(): StudyDeckStorageState {
  return { version: STUDY_DECK_STORAGE_VERSION, decks: [] };
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
