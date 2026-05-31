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
  StudyCardScheduling,
} from '../entities/card';
import type { StudyDeck } from '../entities/deck';
import {
  type StudyCardPreview,
  type StudyCardsGenerateOutput,
  StudyCardsGenerateOutputSchema,
} from '../schema/generate-output';
import type { StudyDeckStore } from '../stores/study-deck';
import type { StudySidecarStore } from '../stores/study-sidecar';
import { extractDocMarkdown } from '../utils/extract-doc-text';
import { parseStudyCardsGenerateJson } from '../utils/parse-generate-json';
import {
  createInitialScheduling,
  isDue,
  scheduleAfterReview,
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

export class StudyService extends Service {
  lastGenerationDebug: StudyGenerationDebug | null = null;

  readonly generationState$ = new LiveData<StudyGenerationState>({
    status: 'idle',
  });

  readonly decks$ = LiveData.from(
    this.deckStore.watchDecks(),
    [] as StudyDeck[]
  );

  readonly scheduling$ = LiveData.from(
    this.sidecarStore.watchScheduling(),
    [] as StudyCardScheduling[]
  );

  readonly generateModelId$ = LiveData.from(
    this.globalStateService.globalState.watch<string>(
      STUDY_GENERATE_MODEL_STORAGE_KEY
    ),
    DEFAULT_STUDY_GENERATE_MODEL
  );

  readonly dueCount$ = LiveData.computed(get => {
    const now = Date.now();
    return get(this.scheduling$).filter(row => isDue(row, now)).length;
  });

  readonly dueCountByDeck$ = LiveData.computed(get => {
    const now = Date.now();
    const counts = new Map<string, number>();
    for (const row of get(this.scheduling$)) {
      if (!isDue(row, now)) continue;
      counts.set(row.deckId, (counts.get(row.deckId) ?? 0) + 1);
    }
    return counts;
  });

  dueCountForDeck$(deckId: string) {
    return LiveData.computed(get => {
      const now = Date.now();
      return get(this.scheduling$).filter(
        row => row.deckId === deckId && isDue(row, now)
      ).length;
    });
  }

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly deckStore: StudyDeckStore,
    private readonly sidecarStore: StudySidecarStore,
    private readonly featureFlagService: FeatureFlagService,
    private readonly globalStateService: GlobalStateService
  ) {
    super();
  }

  get enabled() {
    return this.featureFlagService.flags.enable_study.value === true;
  }

  deck$(deckId: string) {
    return this.decks$.map(decks => decks.find(deck => deck.id === deckId));
  }

  schedulingForDeck$(deckId: string) {
    return this.scheduling$.map(rows =>
      rows.filter(row => row.deckId === deckId)
    );
  }

  reviewQueue$(deckId?: string) {
    return LiveData.computed(get => {
      const now = Date.now();
      const decks = get(this.decks$);
      const scheduling = get(this.scheduling$).filter(row => {
        if (deckId && row.deckId !== deckId) return false;
        return isDue(row, now);
      });
      const cardMap = new Map<string, StudyCardContent>();
      for (const deck of decks) {
        if (deckId && deck.id !== deckId) continue;
        for (const card of deck.cards) {
          if (!card.suspended) {
            cardMap.set(card.id, card);
          }
        }
      }
      return scheduling
        .map(row => cardMap.get(row.cardId))
        .filter((card): card is StudyCardContent => !!card)
        .sort((a, b) => {
          const aDue =
            scheduling.find(row => row.cardId === a.id)?.due ??
            Number.MAX_SAFE_INTEGER;
          const bDue =
            scheduling.find(row => row.cardId === b.id)?.due ??
            Number.MAX_SAFE_INTEGER;
          return aDue - bDue;
        });
    });
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

  async generateFromDoc(doc: Store, focus?: string, modelId?: string) {
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
          params: { focus },
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

    await this.deckStore.upsertDeck(deck);
    await Promise.all(
      cards.map(card =>
        this.sidecarStore.upsertScheduling(
          createInitialScheduling(card.id, deckId, now)
        )
      )
    );
    this.resetGeneration();
    return deck;
  }

  async gradeCard(cardId: string, grade: ReviewGrade) {
    const rows = await this.sidecarStore.listScheduling();
    const row = rows.find(item => item.cardId === cardId);
    if (!row) return;
    await this.sidecarStore.upsertScheduling(scheduleAfterReview(row, grade));
  }

  getDeckById(deckId: string) {
    return this.decks$.value.find(deck => deck.id === deckId);
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
        accepted: true,
      })),
      ...output.synthesis.map(item => ({
        id: nanoid(),
        type: 'synthesis' as const,
        question: item.question,
        rubric: item.rubric,
        blockIds: item.blockIds,
        accepted: true,
      })),
    ];
  }
}
