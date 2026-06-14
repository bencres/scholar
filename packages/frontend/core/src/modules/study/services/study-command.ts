import { getAIRequestService } from '@affine/core/blocksuite/ai/runtime/request';
import { collectStreamText } from '@affine/core/blocksuite/ai/utils/stream-objects';
import { DebugLogger } from '@affine/debug';
import type { AffineTextAttributes } from '@blocksuite/affine/shared/types';
import { type DeltaInsert, type Store, Text } from '@blocksuite/affine/store';
import { LiveData, Service } from '@toeverything/infra';
import { nanoid } from 'nanoid';

import type { DocsService } from '../../doc';
import type { FeatureFlagService } from '../../feature-flag';
import type { GlobalStateService } from '../../storage';
import type { WorkspaceService } from '../../workspace';
import {
  DEFAULT_STUDY_FLASHCARDS_TRACK_SCHEDULE,
  DEFAULT_STUDY_GENERATE_MODEL,
  DEFAULT_STUDY_GENERATION_FOCUS,
  DEFAULT_STUDY_INCLUDE_RECALL,
  DEFAULT_STUDY_INCLUDE_SYNTHESIS,
  DEFAULT_STUDY_RECALL_COUNT,
  DEFAULT_STUDY_SYNTHESIS_COUNT,
  isStudyGenerateModelId,
  STUDY_DEFAULT_GENERATION_FOCUS_KEY,
  STUDY_DEFAULT_INCLUDE_RECALL_KEY,
  STUDY_DEFAULT_INCLUDE_SYNTHESIS_KEY,
  STUDY_DEFAULT_RECALL_COUNT_KEY,
  STUDY_DEFAULT_SYNTHESIS_COUNT_KEY,
  STUDY_FLASHCARDS_TRACK_SCHEDULE_KEY,
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
import {
  buildMultiDocGenerationFocus,
  combineDocsMarkdown,
  extractDocSection,
} from '../utils/extract-docs-markdown';
import { parseStudyCardsGenerateJson } from '../utils/parse-generate-json';
import {
  burySiblingScheduling,
  createInitialScheduling,
  endOfDay,
  scheduleAfterReview,
  shouldMarkLeech,
} from '../utils/scheduling';
import {
  sanitizeStudyCardsGenerateOutput,
  toStudyCardGraphFields,
} from '../utils/study-graph-metadata';
import { pruneDeckCardIds } from '../utils/study-storage';

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
  includeRecall?: boolean;
  includeSynthesis?: boolean;
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

export type StudyGenerationStage =
  | 'preparing'
  | 'generating'
  | 'parsing'
  | 'validating';

export const STUDY_GENERATION_STAGE_PROGRESS: Record<
  StudyGenerationStage,
  number
> = {
  preparing: 10,
  generating: 20,
  parsing: 75,
  validating: 90,
};

export function getStudyGenerationProgress(
  state: Extract<StudyGenerationState, { status: 'generating' }>
): number {
  return state.progress ?? STUDY_GENERATION_STAGE_PROGRESS[state.stage];
}

export type StudyGenerationState =
  | { status: 'idle' }
  | {
      status: 'generating';
      docIds: string[];
      stage: StudyGenerationStage;
      progress?: number;
    }
  | {
      status: 'preview';
      docIds: string[];
      output: StudyCardsGenerateOutput;
      cards: StudyCardPreview[];
    }
  | {
      status: 'error';
      docIds: string[];
      message: string;
      rawResponse?: string;
    };

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

  readonly defaultIncludeRecall$ = LiveData.from(
    this.globalStateService.globalState.watch<boolean>(
      STUDY_DEFAULT_INCLUDE_RECALL_KEY
    ),
    DEFAULT_STUDY_INCLUDE_RECALL
  );

  readonly defaultIncludeSynthesis$ = LiveData.from(
    this.globalStateService.globalState.watch<boolean>(
      STUDY_DEFAULT_INCLUDE_SYNTHESIS_KEY
    ),
    DEFAULT_STUDY_INCLUDE_SYNTHESIS
  );

  readonly defaultRecallCount$ = LiveData.from(
    this.globalStateService.globalState.watch<number>(
      STUDY_DEFAULT_RECALL_COUNT_KEY
    ),
    DEFAULT_STUDY_RECALL_COUNT
  );

  readonly defaultSynthesisCount$ = LiveData.from(
    this.globalStateService.globalState.watch<number>(
      STUDY_DEFAULT_SYNTHESIS_COUNT_KEY
    ),
    DEFAULT_STUDY_SYNTHESIS_COUNT
  );

  readonly defaultGenerationFocus$ = LiveData.from(
    this.globalStateService.globalState.watch<string>(
      STUDY_DEFAULT_GENERATION_FOCUS_KEY
    ),
    DEFAULT_STUDY_GENERATION_FOCUS
  );

  readonly flashcardsTrackSchedule$ = LiveData.from(
    this.globalStateService.globalState.watch<boolean>(
      STUDY_FLASHCARDS_TRACK_SCHEDULE_KEY
    ),
    DEFAULT_STUDY_FLASHCARDS_TRACK_SCHEDULE
  );

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly docsService: DocsService,
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

  setDefaultIncludeRecall(value: boolean) {
    this.globalStateService.globalState.set(
      STUDY_DEFAULT_INCLUDE_RECALL_KEY,
      value
    );
  }

  setDefaultIncludeSynthesis(value: boolean) {
    this.globalStateService.globalState.set(
      STUDY_DEFAULT_INCLUDE_SYNTHESIS_KEY,
      value
    );
  }

  setDefaultRecallCount(value: number) {
    const clamped = Math.max(1, Math.min(30, Math.floor(value)));
    this.globalStateService.globalState.set(
      STUDY_DEFAULT_RECALL_COUNT_KEY,
      clamped
    );
  }

  setDefaultSynthesisCount(value: number) {
    const clamped = Math.max(1, Math.min(30, Math.floor(value)));
    this.globalStateService.globalState.set(
      STUDY_DEFAULT_SYNTHESIS_COUNT_KEY,
      clamped
    );
  }

  setDefaultGenerationFocus(value: string) {
    this.globalStateService.globalState.set(
      STUDY_DEFAULT_GENERATION_FOCUS_KEY,
      value
    );
  }

  setFlashcardsTrackSchedule(value: boolean) {
    this.globalStateService.globalState.set(
      STUDY_FLASHCARDS_TRACK_SCHEDULE_KEY,
      value
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
    return this.generateFromDocs([doc.id], focus, modelId, options, doc);
  }

  async generateFromDocs(
    docIds: string[],
    focus?: string,
    modelId?: string,
    options?: StudyGenerationOptions,
    primaryStore?: Store
  ) {
    if (!this.enabled) {
      throw new Error('Study is disabled');
    }

    const uniqueDocIds = [...new Set(docIds.filter(Boolean))];
    if (!uniqueDocIds.length) {
      throw new Error('Select at least one note page');
    }

    this.setGeneratingStage(uniqueDocIds, 'preparing');

    const releases: Array<() => void> = [];
    const sections = [];
    try {
      if (primaryStore && uniqueDocIds.length === 1) {
        let title = 'Untitled';
        try {
          const { doc, release } = this.docsService.open(primaryStore.id);
          title = doc.title$.value || 'Untitled';
          release();
        } catch {
          // fall back to untitled when the record is unavailable
        }
        const section = extractDocSection(primaryStore.id, title, primaryStore);
        if (section) {
          sections.push(section);
        }
      } else {
        for (const docId of uniqueDocIds) {
          const { doc, release } = this.docsService.open(docId);
          releases.push(release);
          const section = extractDocSection(
            docId,
            doc.title$.value || 'Untitled',
            doc.blockSuiteDoc
          );
          if (section) {
            sections.push(section);
          }
        }
      }
    } finally {
      for (const release of releases) {
        release();
      }
    }

    if (!sections.length) {
      throw new Error('Selected pages have no extractable content');
    }

    const content = combineDocsMarkdown(sections);
    const mergedFocus = buildMultiDocGenerationFocus(sections, focus);
    return this.generateFromContent({
      docIds: uniqueDocIds,
      content,
      focus: mergedFocus,
      modelId,
      options,
    });
  }

  private async generateFromContent({
    docIds,
    content,
    focus,
    modelId,
    options,
  }: {
    docIds: string[];
    content: string;
    focus?: string;
    modelId?: string;
    options?: StudyGenerationOptions;
  }) {
    const docId = docIds[0];
    const workspaceId = this.workspaceService.workspace.id;
    const selectedModel =
      modelId ?? this.generateModelId$.value ?? DEFAULT_STUDY_GENERATE_MODEL;
    if (!isStudyGenerateModelId(selectedModel)) {
      throw new Error(`Unsupported study generation model: ${selectedModel}`);
    }

    this.setGeneratingStage(docIds, 'generating');

    let rawResponse: string | undefined;
    let stage: StudyGenerationDebug['stage'] = 'stream';
    try {
      logStudyGenerateDebug('Starting generation', {
        docIds,
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

      rawResponse = await collectStreamText(stream, {
        onChunk: index => {
          if (index % 5 !== 0) return;
          const progress = Math.min(70, 20 + Math.floor(index / 2));
          this.setGeneratingStage(docIds, 'generating', progress);
        },
      });
      logStudyGenerateDebug('Raw model response', {
        modelId: selectedModel,
        docIds,
        length: rawResponse.length,
        rawResponse,
      });

      this.setGeneratingStage(docIds, 'parsing');
      stage = 'parse';
      const json = parseStudyCardsGenerateJson(rawResponse);
      this.setGeneratingStage(docIds, 'validating');
      stage = 'validate';
      const parsed = sanitizeStudyCardsGenerateOutput(
        StudyCardsGenerateOutputSchema.parse(json)
      );
      const cards = this.toPreviewCards(parsed, options);
      this.generationState$.setValue({
        status: 'preview',
        docIds,
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
        docIds,
        message,
        rawResponse,
      });
      throw error;
    }
  }

  private setGeneratingStage(
    docIds: string[],
    stage: StudyGenerationStage,
    progress?: number
  ) {
    this.generationState$.setValue({
      status: 'generating',
      docIds,
      stage,
      progress: progress ?? STUDY_GENERATION_STAGE_PROGRESS[stage],
    });
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
    const cards: StudyCardContent[] = accepted.map(card => {
      const graphFields = toStudyCardGraphFields({
        concepts: card.concepts ?? [],
        prerequisites: card.prerequisites ?? [],
        misconceptions: card.misconceptions ?? [],
      });
      return {
        id: nanoid(),
        type: card.type,
        question: card.question,
        answer: card.answer,
        concepts: graphFields.concepts,
        tags: graphFields.tags,
        misconceptions: graphFields.misconceptions,
        rubric: card.rubric,
        metadata: card.metadata,
        provenance: {
          workspaceId,
          docId: state.docIds[0],
          blockIds: card.blockIds,
        },
        createdAt: now,
        updatedAt: now,
        suspended: false,
      };
    });

    const deck: StudyDeck = {
      id: deckId,
      name: state.output.deckName,
      sourceDocId: state.docIds[0],
      cardIds: cards.map(card => card.id),
      metadata: sanitizeDeckMetadata({
        sourcePage: { docId: state.docIds[0] },
        sourceLinks: state.docIds,
      }),
      createdAt: now,
      updatedAt: now,
    };

    const storage = await this.commandRepository.listDeckState();
    await this.commandRepository.saveDeckState({
      ...storage,
      cards: [...storage.cards, ...cards],
      decks: [...storage.decks, deck],
    });
    await Promise.all(
      cards.map(card =>
        this.commandRepository.upsertScheduling(
          createInitialScheduling(card.id, now)
        )
      )
    );
    this.resetGeneration();
    await this.addDeckLinkToDoc(state.docIds[0], deck);
    return deck;
  }

  private async addDeckLinkToDoc(docId: string, deck: StudyDeck) {
    try {
      const { doc, release } = this.docsService.open(docId);
      const disposePriorityLoad = doc.addPriorityLoad(10);
      await doc.waitForSyncReady();
      disposePriorityLoad();
      const workspaceId = this.workspaceService.workspace.id;
      const deckPath = `/workspace/${workspaceId}/study/decks/${deck.id}`;
      const text = new Text([
        { insert: deck.name, attributes: { link: deckPath } },
      ] as DeltaInsert<AffineTextAttributes>[]);
      const [frame] = doc.blockSuiteDoc.getBlocksByFlavour('affine:note');
      if (frame) {
        doc.blockSuiteDoc.addBlock('affine:divider' as never, {}, frame.id);
        doc.blockSuiteDoc.addBlock(
          'affine:paragraph' as never,
          { text },
          frame.id
        );
      }
      release();
    } catch (e) {
      logStudyGenerateDebug('Failed to add deck link to doc', {
        docId,
        deckId: deck.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  async createDeck(input: {
    name: string;
    sourceDocId?: string;
    cardIds?: string[];
    metadata?: StudyDeckMetadata;
  }) {
    const now = Date.now();
    const storage = await this.commandRepository.listDeckState();
    const validIds = (input.cardIds ?? []).filter(id =>
      storage.cards.some(card => card.id === id)
    );
    const deck: StudyDeck = {
      id: nanoid(),
      name: input.name.trim(),
      sourceDocId: input.sourceDocId,
      cardIds: validIds,
      metadata: sanitizeDeckMetadata(
        input.sourceDocId
          ? {
              ...input.metadata,
              sourcePage: { docId: input.sourceDocId },
            }
          : input.metadata
      ),
      createdAt: now,
      updatedAt: now,
    };
    await this.commandRepository.saveDeckState({
      ...storage,
      decks: [...storage.decks, deck],
    });
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
    const storage = await this.commandRepository.listDeckState();
    const nextDecks = storage.decks.filter(deck => deck.id !== deckId);
    if (nextDecks.length === storage.decks.length) {
      return;
    }
    await this.commandRepository.saveDeckState({
      ...storage,
      decks: nextDecks,
    });
  }

  async addCardsToDeck(deckId: string, cardIds: string[]) {
    const storage = await this.commandRepository.listDeckState();
    const deck = storage.decks.find(item => item.id === deckId);
    if (!deck) {
      throw new Error(`Deck not found: ${deckId}`);
    }
    const validIds = cardIds.filter(id =>
      storage.cards.some(card => card.id === id)
    );
    const nextIds = [...new Set([...deck.cardIds, ...validIds])];
    const now = Date.now();
    await this.commandRepository.saveDeckState({
      ...storage,
      decks: storage.decks.map(item =>
        item.id === deckId
          ? { ...item, cardIds: nextIds, updatedAt: now }
          : item
      ),
    });
  }

  async removeCardsFromDeck(deckId: string, cardIds: string[]) {
    const storage = await this.commandRepository.listDeckState();
    const deck = storage.decks.find(item => item.id === deckId);
    if (!deck) {
      throw new Error(`Deck not found: ${deckId}`);
    }
    const removeSet = new Set(cardIds);
    const now = Date.now();
    await this.commandRepository.saveDeckState({
      ...storage,
      decks: storage.decks.map(item =>
        item.id === deckId
          ? {
              ...item,
              cardIds: item.cardIds.filter(id => !removeSet.has(id)),
              updatedAt: now,
            }
          : item
      ),
    });
  }

  async createCard(
    input: {
      type: StudyCardContent['type'];
      question: string;
      answer?: string;
      concepts?: string[];
      provenance?: {
        docId?: string;
        blockIds?: string[];
        chunkId?: string;
      };
      noteTypeId?: string;
      templateId?: string;
      noteFields?: Record<string, string>;
      clozeOrdinal?: number;
      imageOcclusion?: StudyCardContent['imageOcclusion'];
      misconceptions?: string[];
      rubric?: string[];
      tags?: string[];
    },
    options?: { deckIds?: string[] }
  ) {
    const storage = await this.commandRepository.listDeckState();
    const now = Date.now();
    const soleDeckId =
      options?.deckIds?.length === 1 ? options.deckIds[0] : undefined;
    const defaultDocId = soleDeckId
      ? storage.decks.find(deck => deck.id === soleDeckId)?.sourceDocId
      : undefined;
    const card: StudyCardContent = {
      id: nanoid(),
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
        docId: input.provenance?.docId?.trim() || defaultDocId || 'manual',
        blockIds: cleanList(input.provenance?.blockIds),
        chunkId: input.provenance?.chunkId?.trim() || undefined,
      },
      createdAt: now,
      updatedAt: now,
      suspended: false,
    };
    const deckIds = new Set(
      (options?.deckIds ?? []).filter(id =>
        storage.decks.some(deck => deck.id === id)
      )
    );
    const nextDecks = storage.decks.map(deck => {
      if (!deckIds.has(deck.id)) return deck;
      return {
        ...deck,
        cardIds: [...deck.cardIds, card.id],
        updatedAt: now,
      };
    });
    await this.commandRepository.saveDeckState({
      ...storage,
      cards: [...storage.cards, card],
      decks: nextDecks,
    });
    const existingScheduling = await this.commandRepository.listScheduling();
    if (!existingScheduling.some(row => row.cardId === card.id)) {
      await this.commandRepository.upsertScheduling(
        createInitialScheduling(card.id, now)
      );
    }
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
    const storage = await this.commandRepository.listDeckState();
    const now = Date.now();
    const index = storage.cards.findIndex(card => card.id === cardId);
    if (index < 0) {
      throw new Error(`Card not found: ${cardId}`);
    }
    const current = storage.cards[index];
    const updatedCard: StudyCardContent = {
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
    const cards = [...storage.cards];
    cards[index] = updatedCard;
    const validIds = new Set(cards.map(card => card.id));
    await this.commandRepository.saveDeckState({
      ...storage,
      cards,
      decks: storage.decks.map(deck => pruneDeckCardIds(deck, validIds)),
    });
    return updatedCard;
  }

  async deleteCard(cardId: string) {
    const storage = await this.commandRepository.listDeckState();
    if (!storage.cards.some(card => card.id === cardId)) {
      return;
    }
    const now = Date.now();
    const cards = storage.cards.filter(card => card.id !== cardId);
    const validIds = new Set(cards.map(card => card.id));
    await this.commandRepository.saveDeckState({
      ...storage,
      cards,
      decks: storage.decks.map(deck => ({
        ...pruneDeckCardIds(deck, validIds),
        updatedAt: now,
      })),
    });
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
    const next = createInitialScheduling(row.cardId, Date.now());
    await this.commandRepository.upsertScheduling(next);
    return next;
  }

  async repositionCards(
    deckId: string,
    orderedCardIds: string[],
    startPosition = 1
  ) {
    const storage = await this.commandRepository.listDeckState();
    const deck = storage.decks.find(item => item.id === deckId);
    if (!deck) {
      throw new Error(`Deck not found: ${deckId}`);
    }
    const rows = await this.commandRepository.listScheduling();
    const rowMap = new Map(rows.map(row => [row.cardId, row]));
    const deckCardIds = new Set(deck.cardIds);
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
    const storage = await this.commandRepository.listDeckState();
    const deck = storage.decks.find(item => item.id === deckId);
    if (!deck) {
      throw new Error(`Deck not found: ${deckId}`);
    }
    return exportDeckToCsv(deck, storage.cards, mapping);
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
    const storage = await this.commandRepository.listDeckState();
    await this.commandRepository.saveDeckState({
      ...storage,
      cards: [...storage.cards, ...imported.cards],
      decks: [...storage.decks, imported.deck],
    });
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
    const storage = await this.commandRepository.listDeckState();
    const deck = storage.decks.find(item => item.id === deckId);
    if (!deck) {
      throw new Error(`Deck not found: ${deckId}`);
    }
    return exportDeckToApkg(deck, storage.cards);
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
    const storage = await this.commandRepository.listDeckState();
    await this.commandRepository.saveDeckState({
      ...storage,
      cards: [...storage.cards, ...imported.cards],
      decks: [...storage.decks, imported.deck],
    });
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

  private toPreviewCards(
    output: StudyCardsGenerateOutput,
    options?: Pick<StudyGenerationOptions, 'includeRecall' | 'includeSynthesis'>
  ): StudyCardPreview[] {
    const acceptRecall = options?.includeRecall !== false;
    const acceptSynthesis = options?.includeSynthesis !== false;
    return [
      ...output.recall.map(item => ({
        id: nanoid(),
        type: 'recall' as const,
        question: item.question,
        answer: item.answer,
        concepts: item.concepts,
        prerequisites: item.prerequisites,
        misconceptions: item.misconceptions,
        blockIds: item.blockIds,
        metadata: item.metadata,
        accepted: acceptRecall,
      })),
      ...output.synthesis.map(item => ({
        id: nanoid(),
        type: 'synthesis' as const,
        question: item.question,
        concepts: item.concepts,
        prerequisites: item.prerequisites,
        rubric: item.rubric,
        blockIds: item.blockIds,
        metadata: item.metadata,
        accepted: acceptSynthesis,
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
  const sourcePage = metadata.sourcePage?.docId?.trim()
    ? { docId: metadata.sourcePage.docId.trim() }
    : undefined;
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
    !sourcePage &&
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
    sourcePage,
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
