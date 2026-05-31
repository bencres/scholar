import type { Store } from '@blocksuite/affine/store';
import { Service } from '@toeverything/infra';

import type { ReviewGrade } from '../entities/card';
import type { StudyCommandService } from './study-command';
import type { StudyQueryService } from './study-query';

export {
  type StudyGenerationDebug,
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

  generateFromDoc(doc: Store, focus?: string, modelId?: string) {
    return this.commandService.generateFromDoc(doc, focus, modelId);
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

  async gradeCard(cardId: string, grade: ReviewGrade, durationMs?: number) {
    const card = this.queryService.findCardById(cardId);
    if (!card) return;
    await this.commandService.gradeCard(card, grade, durationMs);
  }

  getDeckById(deckId: string) {
    return this.queryService.getDeckById(deckId);
  }
}
