import { getAIRequestService } from '@affine/core/blocksuite/ai/runtime/request';
import { collectStreamText } from '@affine/core/blocksuite/ai/utils/stream-objects';
import { DebugLogger } from '@affine/debug';
import type { Store } from '@blocksuite/affine/store';
import { LiveData, Service } from '@toeverything/infra';
import { nanoid } from 'nanoid';

import type { FeatureFlagService } from '../../feature-flag';
import type { GlobalStateService } from '../../storage';
import type { WorkspaceService } from '../../workspace';
import {
  DEFAULT_STUDY_GENERATE_MODEL,
  isStudyGenerateModelId,
  STUDY_GENERATE_MODEL_STORAGE_KEY,
} from '../constants/generate-models';
import type {
  ReviewGrade,
  StudyCardContent,
  StudyNoteType,
} from '../entities/card';
import type {
  StudyDeck,
  StudyDeckBrowserPreset,
  StudyDeckMetadata,
  StudyDeckSchedulingOptions,
  StudyDeckSortPolicy,
} from '../entities/deck';
import type { StudyReviewLog } from '../entities/review-log';
import type { StudyCommandRepository } from '../repositories/study-command-repository';
import {
  type StudyCardPreview,
  type StudyCardsGenerateOutput,
  StudyCardsGenerateOutputSchema,
} from '../schema/generate-output';
import type {
  StudyApkgExportResult,
  StudyApkgImportResult,
  StudyCsvFieldMapping,
} from '../utils/anki-interop';
import {
  createApkgCompatibilityReport,
  exportDeckToApkg,
  exportDeckToCsv,
  importDeckFromApkg,
  importDeckFromCsv,
} from '../utils/anki-interop';
import {
  buildQualityGateErrorMessage,
  evaluateStudyCardSelection,
  type StudyCardQualityAiEvaluator,
} from '../utils/card-quality-evaluator';
import { extractDocMarkdown } from '../utils/extract-doc-text';
import { parseStudyCardsGenerateJson } from '../utils/parse-generate-json';
import {
  burySiblingScheduling,
  createInitialScheduling,
  endOfDay,
  scheduleAfterReview,
  shouldMarkLeech,
} from '../utils/scheduling';

const studyGenerateLogger = new DebugLogger('study.cards.generate');

export type StudyGenerationDebug = {
  at: number;
  docId: string;
  modelId: string;
  stage: 'stream' | 'parse' | 'validate' | 'unknown';
  error: string;
  rawResponse?: string;
};

export type StudyGenerationOptions = {
  qualityProfile?: 'balanced' | 'strict';
  targetRecallCount?: number;
  targetSynthesisCount?: number;
  includeCardMetadata?: boolean;
};

declare global {
  interface Window {
    __affineStudyGenerateDebug?: StudyGenerationDebug;
  }
}

function shouldLogStudyGenerateDebug() {
  if (typeof BUILD_CONFIG !== 'undefined' && BUILD_CONFIG.debug) {
    return true;
  }
  if (typeof location === 'undefined') {
    return false;
  }
  return (
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.hostname.endsWith('.local')
  );
}

function logStudyGenerateDebug(
  message: string,
  payload?: Record<string, unknown>
) {
  if (!shouldLogStudyGenerateDebug()) return;
  if (payload) {
    studyGenerateLogger.warn(message, payload);
    console.warn('[study.cards.generate]', message, payload);
    return;
  }
  studyGenerateLogger.warn(message);
  console.warn('[study.cards.generate]', message);
}

function publishStudyGenerateDebug(debug: StudyGenerationDebug) {
  if (typeof window !== 'undefined') {
    window.__affineStudyGenerateDebug = debug;
  }
  logStudyGenerateDebug(
    'Debug snapshot saved to window.__affineStudyGenerateDebug',
    {
      ...debug,
      rawResponseLength: debug.rawResponse?.length,
    }
  );
}

export type StudyGenerationState =
  | { status: 'idle' }
  | { status: 'generating'; docId: string }
  | {
      status: 'preview';
      docId: string;
      output: StudyCardsGenerateOutput;
      cards: StudyCardPreview[];
    }
  | { status: 'error'; docId: string; message: string; rawResponse?: string };

export class StudyCommandService extends Service {
  lastGenerationDebug: StudyGenerationDebug | null = null;
  private qualityAiEvaluator?: StudyCardQualityAiEvaluator;

  readonly generationState$ = new LiveData<StudyGenerationState>({
    status: 'idle',
  });

  readonly generateModelId$ = LiveData.from(
    this.globalStateService.globalState.watch<string>(
      STUDY_GENERATE_MODEL_STORAGE_KEY
    ),
    DEFAULT_STUDY_GENERATE_MODEL
  );

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly commandRepository: StudyCommandRepository,
    private readonly featureFlagService: FeatureFlagService,
    private readonly globalStateService: GlobalStateService
  ) {
    super();
  }

  get enabled() {
    return this.featureFlagService.flags.enable_study.value === true;
  }

  setGenerateModel(modelId: string) {
    if (!isStudyGenerateModelId(modelId)) {
      throw new Error(`Unsupported study generation model: ${modelId}`);
    }
    this.globalStateService.globalState.set(
      STUDY_GENERATE_MODEL_STORAGE_KEY,
      modelId
    );
  }

  setQualityAiEvaluator(evaluator?: StudyCardQualityAiEvaluator) {
    this.qualityAiEvaluator = evaluator;
  }

  async generateFromDoc(
    doc: Store,
    focus?: string,
    modelId?: string,
    options?: StudyGenerationOptions
  ) {
    if (!this.enabled) {
      throw new Error('Study is disabled');
    }

    const docId = doc.id;
    const workspaceId = this.workspaceService.workspace.id;
    const content = extractDocMarkdown(doc);
    if (!content) {
      throw new Error('Document has no extractable content');
    }

    const selectedModel =
      modelId ?? this.generateModelId$.value ?? DEFAULT_STUDY_GENERATE_MODEL;
    if (!isStudyGenerateModelId(selectedModel)) {
      throw new Error(`Unsupported study generation model: ${selectedModel}`);
    }

    this.generationState$.setValue({ status: 'generating', docId });

    let rawResponse: string | undefined;
    let stage: StudyGenerationDebug['stage'] = 'stream';
    try {
      logStudyGenerateDebug('Starting generation', {
        docId,
        modelId: selectedModel,
        contentLength: content.length,
      });

      const stream = await getAIRequestService().executeAction(
        'generateStudyCards',
        {
          input: content,
          docId,
          workspaceId,
          params: {
            focus,
            qualityProfile: options?.qualityProfile,
            targetRecallCount: toPromptCount(options?.targetRecallCount),
            targetSynthesisCount: toPromptCount(options?.targetSynthesisCount),
            includeCardMetadata:
              options?.includeCardMetadata === undefined
                ? undefined
                : String(options.includeCardMetadata),
          },
          modelId: selectedModel,
          stream: true,
        }
      );

      rawResponse = await collectStreamText(stream);
      logStudyGenerateDebug('Raw model response', {
        modelId: selectedModel,
        docId,
        length: rawResponse.length,
        rawResponse,
      });

      stage = 'parse';
      const json = parseStudyCardsGenerateJson(rawResponse);
      stage = 'validate';
      const parsed = StudyCardsGenerateOutputSchema.parse(json);
      const cards = this.toPreviewCards(parsed);
      this.generationState$.setValue({
        status: 'preview',
        docId,
        output: parsed,
        cards,
      });
      return parsed;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate cards';
      const debug: StudyGenerationDebug = {
        at: Date.now(),
        docId,
        modelId: selectedModel,
        stage,
        error: message,
        rawResponse,
      };
      this.lastGenerationDebug = debug;
      publishStudyGenerateDebug(debug);
      logStudyGenerateDebug('Generation failed', {
        ...debug,
        rawResponseLength: rawResponse?.length,
      });
      this.generationState$.setValue({
        status: 'error',
        docId,
        message,
        rawResponse,
      });
      throw error;
    }
  }

  setPreviewCardAccepted(cardId: string, accepted: boolean) {
    const state = this.generationState$.value;
    if (state.status !== 'preview') return;
    this.generationState$.setValue({
      ...state,
      cards: state.cards.map(card =>
        card.id === cardId ? { ...card, accepted } : card
      ),
    });
  }

  resetGeneration() {
    this.generationState$.setValue({ status: 'idle' });
  }

  async savePreviewDeck() {
    const state = this.generationState$.value;
    if (state.status !== 'preview') {
      throw new Error('No preview to save');
    }

    const accepted = state.cards.filter(card => card.accepted);
    if (!accepted.length) {
      throw new Error('Select at least one card');
    }
    const quality = await this.evaluateSelectedCardsQuality(accepted);
    if (quality.blocking.length) {
      throw new Error(buildQualityGateErrorMessage(accepted, quality.blocking));
    }
    if (quality.warnings.length) {
      logStudyGenerateDebug('Saving deck with quality warnings', {
        warningCount: quality.warnings.length,
        warnings: quality.warnings,
      });
    }

    const deckId = nanoid();
    const now = Date.now();
    const workspaceId = this.workspaceService.workspace.id;
    const cards: StudyCardContent[] = accepted.map(card => ({
      id: nanoid(),
      deckId,
      type: card.type,
      question: card.question,
      answer: card.answer,
      misconceptions: card.misconceptions,
      rubric: card.rubric,
      metadata: card.metadata,
      provenance: {
        workspaceId,
        docId: state.docId,
        blockIds: card.blockIds,
      },
      createdAt: now,
      updatedAt: now,
      suspended: false,
    }));

    const deck: StudyDeck = {
      id: deckId,
      name: state.output.deckName,
      sourceDocId: state.docId,
      cards,
      createdAt: now,
      updatedAt: now,
    };

    await this.commandRepository.upsertDeck(deck);
    await Promise.all(
      cards.map(card =>
        this.commandRepository.upsertScheduling(
          createInitialScheduling(card.id, deckId, now)
        )
      )
    );
    this.resetGeneration();
    return deck;
  }

  async createDeck(input: {
    name: string;
    sourceDocId?: string;
    metadata?: StudyDeckMetadata;
  }) {
    const now = Date.now();
    const deck: StudyDeck = {
      id: nanoid(),
      name: input.name.trim(),
      sourceDocId: input.sourceDocId,
      cards: [],
      metadata: sanitizeDeckMetadata(input.metadata),
      createdAt: now,
      updatedAt: now,
    };
    await this.commandRepository.upsertDeck(deck);
    return deck;
  }

  async updateDeck(
    deckId: string,
    patch: {
      name?: string;
      metadata?: StudyDeckMetadata;
    }
  ) {
    const decks = await this.commandRepository.listDecks();
    const deck = decks.find(item => item.id === deckId);
    if (!deck) {
      throw new Error(`Deck not found: ${deckId}`);
    }
    const nextName = patch.name?.trim();
    const nextDeck: StudyDeck = {
      ...deck,
      name: nextName && nextName.length ? nextName : deck.name,
      metadata: sanitizeDeckMetadata(patch.metadata) ?? deck.metadata,
      updatedAt: Date.now(),
    };
    await this.commandRepository.upsertDeck(nextDeck);
    return nextDeck;
  }

  async deleteDeck(deckId: string) {
    const decks = await this.commandRepository.listDecks();
    const nextDecks = decks.filter(deck => deck.id !== deckId);
    if (nextDecks.length === decks.length) {
      return;
    }
    await this.commandRepository.saveDecks(nextDecks);
    await this.commandRepository.removeSchedulingForDeck(deckId);
  }

  async createCard(
    deckId: string,
    input: {
      type: StudyCardContent['type'];
      question: string;
      answer?: string;
      concepts?: string[];
      noteTypeId?: string;
      templateId?: string;
      noteFields?: Record<string, string>;
      clozeOrdinal?: number;
      imageOcclusion?: StudyCardContent['imageOcclusion'];
      misconceptions?: string[];
      rubric?: string[];
      tags?: string[];
    }
  ) {
    const decks = await this.commandRepository.listDecks();
    const deck = decks.find(item => item.id === deckId);
    if (!deck) {
      throw new Error(`Deck not found: ${deckId}`);
    }
    const now = Date.now();
    const card: StudyCardContent = {
      id: nanoid(),
      deckId,
      type: input.type,
      question: input.question.trim(),
      answer: input.answer?.trim() || undefined,
      concepts: cleanList(input.concepts),
      noteTypeId: input.noteTypeId?.trim() || undefined,
      templateId: input.templateId?.trim() || undefined,
      noteFields: sanitizeNoteFields(input.noteFields),
      clozeOrdinal: sanitizeClozeOrdinal(input.clozeOrdinal),
      imageOcclusion: sanitizeImageOcclusion(input.imageOcclusion),
      misconceptions: cleanList(input.misconceptions),
      rubric: cleanList(input.rubric),
      tags: cleanList(input.tags),
      provenance: {
        workspaceId: this.workspaceService.workspace.id,
        docId: deck.sourceDocId ?? 'manual',
      },
      createdAt: now,
      updatedAt: now,
      suspended: false,
    };
    await this.commandRepository.upsertDeck({
      ...deck,
      cards: [...deck.cards, card],
      updatedAt: now,
    });
    await this.commandRepository.upsertScheduling(
      createInitialScheduling(card.id, deckId, now)
    );
    return card;
  }

  async updateCard(
    cardId: string,
    patch: {
      type?: StudyCardContent['type'];
      question?: string;
      answer?: string;
      concepts?: string[];
      noteTypeId?: string;
      templateId?: string;
      noteFields?: Record<string, string>;
      clozeOrdinal?: number;
      imageOcclusion?: StudyCardContent['imageOcclusion'];
      misconceptions?: string[];
      rubric?: string[];
      tags?: string[];
      suspended?: boolean;
    }
  ) {
    const decks = await this.commandRepository.listDecks();
    const now = Date.now();
    let updatedCard: StudyCardContent | undefined;
    const nextDecks = decks.map(deck => {
      const cardIndex = deck.cards.findIndex(card => card.id === cardId);
      if (cardIndex < 0) return deck;
      const current = deck.cards[cardIndex];
      const nextCard: StudyCardContent = {
        ...current,
        type: patch.type ?? current.type,
        question: patch.question?.trim() || current.question,
        answer:
          patch.answer !== undefined
            ? patch.answer.trim() || undefined
            : current.answer,
        concepts:
          patch.concepts !== undefined
            ? cleanList(patch.concepts)
            : current.concepts,
        noteTypeId:
          patch.noteTypeId !== undefined
            ? patch.noteTypeId.trim() || undefined
            : current.noteTypeId,
        templateId:
          patch.templateId !== undefined
            ? patch.templateId.trim() || undefined
            : current.templateId,
        noteFields:
          patch.noteFields !== undefined
            ? sanitizeNoteFields(patch.noteFields)
            : current.noteFields,
        clozeOrdinal:
          patch.clozeOrdinal !== undefined
            ? sanitizeClozeOrdinal(patch.clozeOrdinal)
            : current.clozeOrdinal,
        imageOcclusion:
          patch.imageOcclusion !== undefined
            ? sanitizeImageOcclusion(patch.imageOcclusion)
            : current.imageOcclusion,
        misconceptions:
          patch.misconceptions !== undefined
            ? cleanList(patch.misconceptions)
            : current.misconceptions,
        rubric:
          patch.rubric !== undefined ? cleanList(patch.rubric) : current.rubric,
        tags: patch.tags !== undefined ? cleanList(patch.tags) : current.tags,
        suspended: patch.suspended ?? current.suspended,
        updatedAt: now,
      };
      const cards = [...deck.cards];
      cards[cardIndex] = nextCard;
      updatedCard = nextCard;
      return {
        ...deck,
        cards,
        updatedAt: now,
      };
    });
    if (!updatedCard) {
      throw new Error(`Card not found: ${cardId}`);
    }
    await this.commandRepository.saveDecks(nextDecks);
    return updatedCard;
  }

  async deleteCard(cardId: string) {
    const decks = await this.commandRepository.listDecks();
    const now = Date.now();
    let targetDeckId: string | undefined;
    const nextDecks = decks.map(deck => {
      const before = deck.cards.length;
      const cards = deck.cards.filter(card => card.id !== cardId);
      if (cards.length === before) {
        return deck;
      }
      targetDeckId = deck.id;
      return {
        ...deck,
        cards,
        updatedAt: now,
      };
    });
    if (!targetDeckId) {
      return;
    }
    await this.commandRepository.saveDecks(nextDecks);
    await this.commandRepository.removeSchedulingForCard(cardId);
  }

  async gradeCard(
    card: StudyCardContent,
    grade: ReviewGrade,
    durationMs?: number
  ) {
    const rows = await this.commandRepository.listScheduling();
    const row = rows.find(item => item.cardId === card.id);
    if (!row) return;
    const now = Date.now();
    let updated = scheduleAfterReview(row, grade, now);
    if (shouldMarkLeech(updated)) {
      updated = { ...updated, leech: true };
      await this.updateCard(card.id, { suspended: true });
    }
    const postReviewRows = burySiblingScheduling(rows, row.cardId, now).map(
      item => (item.cardId === updated.cardId ? updated : item)
    );
    await Promise.all(
      postReviewRows.map(item => this.commandRepository.upsertScheduling(item))
    );
    const reviewLog: StudyReviewLog = {
      id: nanoid(),
      deckId: row.deckId,
      cardId: row.cardId,
      reviewedAt: updated.lastReviewAt ?? now,
      grade,
      schedulingStateBefore: row.state,
      schedulingStateAfter: updated.state,
      dueBefore: row.due,
      dueAfter: updated.due,
      durationMs,
    };
    await this.commandRepository.appendReviewLog(reviewLog);
  }

  async rescheduleCard(cardId: string, scheduledDays: number) {
    const rows = await this.commandRepository.listScheduling();
    const row = rows.find(item => item.cardId === cardId);
    if (!row) {
      throw new Error(`Scheduling not found for card: ${cardId}`);
    }
    const days = Math.max(0, Math.floor(scheduledDays));
    const now = Date.now();
    const due = now + days * 24 * 60 * 60 * 1000;
    const next = {
      ...row,
      state: 'review' as const,
      due,
      scheduledDays: days,
      customDueDate: due,
      learningStep: undefined,
    };
    await this.commandRepository.upsertScheduling(next);
    return next;
  }

  async setCardDueDate(cardId: string, due: number) {
    const rows = await this.commandRepository.listScheduling();
    const row = rows.find(item => item.cardId === cardId);
    if (!row) {
      throw new Error(`Scheduling not found for card: ${cardId}`);
    }
    const next = {
      ...row,
      due,
      customDueDate: due,
      scheduledDays: Math.max(0, Math.round((due - Date.now()) / 86_400_000)),
    };
    await this.commandRepository.upsertScheduling(next);
    return next;
  }

  async forgetCard(cardId: string) {
    const rows = await this.commandRepository.listScheduling();
    const row = rows.find(item => item.cardId === cardId);
    if (!row) {
      throw new Error(`Scheduling not found for card: ${cardId}`);
    }
    const next = createInitialScheduling(row.cardId, row.deckId, Date.now());
    await this.commandRepository.upsertScheduling(next);
    return next;
  }

  async repositionCards(
    deckId: string,
    orderedCardIds: string[],
    startPosition = 1
  ) {
    const rows = await this.commandRepository.listScheduling();
    const rowMap = new Map(rows.map(row => [row.cardId, row]));
    const deckCardIds = new Set(
      rows.filter(row => row.deckId === deckId).map(row => row.cardId)
    );
    const validIds = orderedCardIds.filter(cardId => deckCardIds.has(cardId));
    await Promise.all(
      validIds.map((cardId, index) => {
        const row = rowMap.get(cardId);
        if (!row) return Promise.resolve();
        return this.commandRepository.upsertScheduling({
          ...row,
          manualPosition: Math.max(1, startPosition + index),
        });
      })
    );
  }

  async buryCard(cardId: string, until = endOfDay()) {
    const rows = await this.commandRepository.listScheduling();
    const row = rows.find(item => item.cardId === cardId);
    if (!row) {
      throw new Error(`Scheduling not found for card: ${cardId}`);
    }
    const next = { ...row, buriedUntil: until };
    await this.commandRepository.upsertScheduling(next);
    return next;
  }

  async exportDeckCsv(deckId: string, mapping?: StudyCsvFieldMapping) {
    const decks = await this.commandRepository.listDecks();
    const deck = decks.find(item => item.id === deckId);
    if (!deck) {
      throw new Error(`Deck not found: ${deckId}`);
    }
    return exportDeckToCsv(deck, mapping);
  }

  async importDeckCsv(input: {
    csv: string;
    deckName: string;
    mapping?: StudyCsvFieldMapping;
  }) {
    const imported = importDeckFromCsv({
      csv: input.csv,
      deckName: input.deckName,
      workspaceId: this.workspaceService.workspace.id,
      mapping: input.mapping,
    });
    await this.commandRepository.upsertDeck(imported.deck);
    await Promise.all(
      imported.scheduling.map(row =>
        this.commandRepository.upsertScheduling(row)
      )
    );
    return imported;
  }

  getApkgCompatibilityReport() {
    return createApkgCompatibilityReport();
  }

  async exportDeckApkg(deckId: string): Promise<StudyApkgExportResult> {
    const decks = await this.commandRepository.listDecks();
    const deck = decks.find(item => item.id === deckId);
    if (!deck) {
      throw new Error(`Deck not found: ${deckId}`);
    }
    return exportDeckToApkg(deck);
  }

  async importDeckApkg(input: {
    fileName: string;
    bytes: Uint8Array;
  }): Promise<StudyApkgImportResult> {
    const imported = await importDeckFromApkg({
      fileName: input.fileName,
      bytes: input.bytes,
      workspaceId: this.workspaceService.workspace.id,
    });
    await this.commandRepository.upsertDeck(imported.deck);
    await Promise.all(
      imported.scheduling.map(row =>
        this.commandRepository.upsertScheduling(row)
      )
    );
    return imported;
  }

  private async evaluateSelectedCardsQuality(cards: StudyCardPreview[]) {
    try {
      return await evaluateStudyCardSelection(cards, {
        aiEvaluator: this.qualityAiEvaluator,
      });
    } catch (error) {
      logStudyGenerateDebug(
        'Quality AI evaluator failed, using heuristics only',
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );
      return evaluateStudyCardSelection(cards);
    }
  }

  private toPreviewCards(output: StudyCardsGenerateOutput): StudyCardPreview[] {
    return [
      ...output.recall.map(item => ({
        id: nanoid(),
        type: 'recall' as const,
        question: item.question,
        answer: item.answer,
        misconceptions: item.misconceptions,
        blockIds: item.blockIds,
        metadata: item.metadata,
        accepted: true,
      })),
      ...output.synthesis.map(item => ({
        id: nanoid(),
        type: 'synthesis' as const,
        question: item.question,
        rubric: item.rubric,
        blockIds: item.blockIds,
        metadata: item.metadata,
        accepted: true,
      })),
    ];
  }
}

function cleanList(input?: string[]) {
  if (!input) return undefined;
  const values = input.map(item => item.trim()).filter(Boolean);
  return values.length ? values : undefined;
}

function sanitizeDeckMetadata(
  metadata?: StudyDeckMetadata
): StudyDeckMetadata | undefined {
  if (!metadata) return undefined;
  const description = metadata.description?.trim() || undefined;
  const tags = cleanList(metadata.tags);
  const sourceLinks = cleanList(metadata.sourceLinks);
  const noteTypes = sanitizeNoteTypes(metadata.noteTypes);
  const dailyNewLimit = toPositiveLimit(metadata.limits?.dailyNewLimit);
  const dailyReviewLimit = toPositiveLimit(metadata.limits?.dailyReviewLimit);
  const sortPolicy = isSortPolicy(metadata.sortPolicy)
    ? metadata.sortPolicy
    : undefined;
  const optionsGroupId = metadata.optionsGroupId?.trim() || undefined;
  const schedulingOptions = sanitizeSchedulingOptions(
    metadata.schedulingOptions
  );
  const filtered = sanitizeFilteredDeckConfig(metadata.filtered);
  const browserPresets = sanitizeBrowserPresets(metadata.browserPresets);
  const limits =
    dailyNewLimit !== undefined || dailyReviewLimit !== undefined
      ? {
          dailyNewLimit,
          dailyReviewLimit,
        }
      : undefined;
  if (
    !description &&
    !tags &&
    !sourceLinks &&
    !noteTypes &&
    !limits &&
    !sortPolicy &&
    !optionsGroupId &&
    !schedulingOptions &&
    !filtered &&
    !browserPresets
  ) {
    return undefined;
  }
  return {
    description,
    tags,
    sourceLinks,
    noteTypes,
    sortPolicy,
    limits,
    optionsGroupId,
    schedulingOptions,
    filtered,
    browserPresets,
  };
}

function toPositiveLimit(limit?: number) {
  if (!Number.isFinite(limit)) {
    return undefined;
  }
  const rounded = Math.floor(limit as number);
  return rounded > 0 ? rounded : undefined;
}

function toPromptCount(value?: number) {
  if (!Number.isFinite(value)) {
    return undefined;
  }
  const rounded = Math.floor(value as number);
  return rounded > 0 ? String(rounded) : undefined;
}

function isSortPolicy(value?: string): value is StudyDeckSortPolicy {
  return (
    value === 'created-asc' || value === 'created-desc' || value === 'due-asc'
  );
}

function sanitizeSchedulingOptions(
  options?: StudyDeckSchedulingOptions
): StudyDeckSchedulingOptions | undefined {
  if (!options) return undefined;
  const learningStepsMinutes = sanitizePositiveNumbers(
    options.learningStepsMinutes
  );
  const relearningStepsMinutes = sanitizePositiveNumbers(
    options.relearningStepsMinutes
  );
  const desiredRetention =
    options.desiredRetention &&
    Number.isFinite(options.desiredRetention) &&
    options.desiredRetention > 0 &&
    options.desiredRetention <= 1
      ? Number(options.desiredRetention.toFixed(3))
      : undefined;
  const easyBonus =
    options.easyBonus &&
    Number.isFinite(options.easyBonus) &&
    options.easyBonus > 0
      ? Number(options.easyBonus.toFixed(3))
      : undefined;
  const graduatingIntervalDays = toPositiveLimit(
    options.graduatingIntervalDays
  );
  const easyIntervalDays = toPositiveLimit(options.easyIntervalDays);
  const newCardOrder =
    options.newCardOrder === 'position' || options.newCardOrder === 'random'
      ? options.newCardOrder
      : undefined;
  const burySiblings =
    typeof options.burySiblings === 'boolean'
      ? options.burySiblings
      : undefined;
  const leechThreshold = toPositiveLimit(options.leechThreshold);
  if (
    !learningStepsMinutes &&
    !relearningStepsMinutes &&
    desiredRetention === undefined &&
    easyBonus === undefined &&
    graduatingIntervalDays === undefined &&
    easyIntervalDays === undefined &&
    !newCardOrder &&
    burySiblings === undefined &&
    leechThreshold === undefined
  ) {
    return undefined;
  }
  return {
    learningStepsMinutes,
    relearningStepsMinutes,
    desiredRetention,
    easyBonus,
    graduatingIntervalDays,
    easyIntervalDays,
    newCardOrder,
    burySiblings,
    leechThreshold,
  };
}

function sanitizeFilteredDeckConfig(filtered?: StudyDeckMetadata['filtered']) {
  if (!filtered?.query?.trim()) {
    return undefined;
  }
  return {
    query: filtered.query.trim(),
    limit: toPositiveLimit(filtered.limit),
    reschedule:
      typeof filtered.reschedule === 'boolean'
        ? filtered.reschedule
        : undefined,
  };
}

function sanitizeBrowserPresets(
  presets?: StudyDeckBrowserPreset[]
): StudyDeckBrowserPreset[] | undefined {
  if (!presets?.length) {
    return undefined;
  }
  const normalized = presets
    .map(preset => ({
      id: preset.id.trim(),
      name: preset.name.trim(),
      query: preset.query.trim(),
    }))
    .filter(preset => preset.id && preset.name && preset.query);
  return normalized.length ? normalized : undefined;
}

function sanitizeNoteTypes(
  noteTypes?: StudyNoteType[]
): StudyNoteType[] | undefined {
  if (!noteTypes?.length) {
    return undefined;
  }
  const normalized = noteTypes
    .map(noteType => ({
      id: noteType.id.trim(),
      name: noteType.name.trim(),
      kind: noteType.kind,
      fieldNames: noteType.fieldNames
        .map(field => field.trim())
        .filter(Boolean),
      templates: noteType.templates
        .map(template => ({
          id: template.id.trim(),
          name: template.name.trim(),
          front: template.front.trim(),
          back: template.back.trim(),
        }))
        .filter(template => template.id && template.name),
    }))
    .filter(noteType => noteType.id && noteType.name);
  return normalized.length ? normalized : undefined;
}

function sanitizeNoteFields(
  fields?: Record<string, string>
): Record<string, string> | undefined {
  if (!fields) {
    return undefined;
  }
  const entries = Object.entries(fields)
    .map(([key, value]) => [key.trim(), value.trim()] as const)
    .filter(([key, value]) => key && value);
  if (!entries.length) {
    return undefined;
  }
  return Object.fromEntries(entries);
}

function sanitizeClozeOrdinal(ordinal?: number): number | undefined {
  if (!Number.isFinite(ordinal)) {
    return undefined;
  }
  const rounded = Math.floor(ordinal as number);
  return rounded > 0 ? rounded : undefined;
}

function sanitizeImageOcclusion(
  value?: StudyCardContent['imageOcclusion']
): StudyCardContent['imageOcclusion'] | undefined {
  if (!value) {
    return undefined;
  }
  const imageAssetId = value.imageAssetId?.trim() || '';
  const occlusionId = value.occlusionId?.trim() || '';
  if (!imageAssetId || !occlusionId) {
    return undefined;
  }
  return {
    imageAssetId,
    occlusionId,
    prompt: value.prompt?.trim() || undefined,
    answer: value.answer?.trim() || undefined,
  };
}

function sanitizePositiveNumbers(values?: number[]) {
  if (!values?.length) {
    return undefined;
  }
  const normalized = values
    .filter(value => Number.isFinite(value) && value > 0)
    .map(value => Number(value.toFixed(3)));
  return normalized.length ? normalized : undefined;
}
