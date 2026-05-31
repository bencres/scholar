import type { Store } from '@blocksuite/affine/store';
import { Service } from '@toeverything/infra';

import type { ReviewGrade } from '../entities/card';
import type {
  StudyCommandService,
  StudyGenerationOptions,
} from './study-command';
import type { StudyQueryService } from './study-query';

export {
  type StudyGenerationDebug,
  type StudyGenerationOptions,
  type StudyGenerationState,
} from './study-command';

export class StudyService extends Service {
  readonly generationState$ = this.commandService.generationState$;
  readonly generateModelId$ = this.commandService.generateModelId$;
  readonly decks$ = this.queryService.decks$;
  readonly scheduling$ = this.queryService.scheduling$;
  readonly reviewLogs$ = this.queryService.reviewLogs$;
  readonly dueCount$ = this.queryService.dueCount$;
  readonly dueCountByDeck$ = this.queryService.dueCountByDeck$;

  constructor(
    private readonly queryService: StudyQueryService,
    private readonly commandService: StudyCommandService
  ) {
    super();
  }

  get enabled() {
    return this.queryService.enabled;
  }

  get lastGenerationDebug() {
    return this.commandService.lastGenerationDebug;
  }

  deck$(deckId: string) {
    return this.queryService.deck$(deckId);
  }

  dueCountForDeck$(deckId: string) {
    return this.queryService.dueCountForDeck$(deckId);
  }

  schedulingForDeck$(deckId: string) {
    return this.queryService.schedulingForDeck$(deckId);
  }

  reviewQueue$(deckId?: string) {
    return this.queryService.reviewQueue$(deckId);
  }

  setGenerateModel(modelId: string) {
    this.commandService.setGenerateModel(modelId);
  }

  generateFromDoc(
    doc: Store,
    focus?: string,
    modelId?: string,
    options?: StudyGenerationOptions
  ) {
    return this.commandService.generateFromDoc(doc, focus, modelId, options);
  }

  setPreviewCardAccepted(cardId: string, accepted: boolean) {
    this.commandService.setPreviewCardAccepted(cardId, accepted);
  }

  resetGeneration() {
    this.commandService.resetGeneration();
  }

  savePreviewDeck() {
    return this.commandService.savePreviewDeck();
  }

  createDeck(input: {
    name: string;
    sourceDocId?: string;
    metadata?: {
      description?: string;
      tags?: string[];
      sourceLinks?: string[];
      sortPolicy?: 'created-desc' | 'created-asc' | 'due-asc';
      limits?: {
        dailyNewLimit?: number;
        dailyReviewLimit?: number;
      };
    };
  }) {
    return this.commandService.createDeck(input);
  }

  updateDeck(
    deckId: string,
    patch: {
      name?: string;
      metadata?: {
        description?: string;
        tags?: string[];
        sourceLinks?: string[];
        sortPolicy?: 'created-desc' | 'created-asc' | 'due-asc';
        limits?: {
          dailyNewLimit?: number;
          dailyReviewLimit?: number;
        };
      };
    }
  ) {
    return this.commandService.updateDeck(deckId, patch);
  }

  deleteDeck(deckId: string) {
    return this.commandService.deleteDeck(deckId);
  }

  createCard(
    deckId: string,
    input: {
      type: 'recall' | 'synthesis';
      question: string;
      answer?: string;
      misconceptions?: string[];
      rubric?: string[];
      tags?: string[];
    }
  ) {
    return this.commandService.createCard(deckId, input);
  }

  updateCard(
    cardId: string,
    patch: {
      type?: 'recall' | 'synthesis';
      question?: string;
      answer?: string;
      misconceptions?: string[];
      rubric?: string[];
      tags?: string[];
      suspended?: boolean;
    }
  ) {
    return this.commandService.updateCard(cardId, patch);
  }

  deleteCard(cardId: string) {
    return this.commandService.deleteCard(cardId);
  }

  async gradeCard(cardId: string, grade: ReviewGrade, durationMs?: number) {
    const card = this.queryService.findCardById(cardId);
    if (!card) return;
    await this.commandService.gradeCard(card, grade, durationMs);
  }

  getDeckById(deckId: string) {
    return this.queryService.getDeckById(deckId);
  }

  searchCards(query: string, deckId?: string) {
    return this.queryService.searchCards(query, deckId);
  }
}
