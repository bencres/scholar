export type CardType = 'recall' | 'synthesis';

export type ReviewGrade = 1 | 2 | 3 | 4;

export type CardState = 'new' | 'learning' | 'review' | 'relearning';

export type StudyNoteTypeKind =
  | 'basic'
  | 'basic-reversed'
  | 'cloze'
  | 'image-occlusion'
  | 'custom';

export interface StudyCardTemplate {
  id: string;
  name: string;
  front: string;
  back: string;
}

export interface StudyNoteType {
  id: string;
  name: string;
  kind: StudyNoteTypeKind;
  fieldNames: string[];
  templates: StudyCardTemplate[];
}

export interface StudyImageOcclusion {
  imageAssetId: string;
  occlusionId: string;
  prompt?: string;
  answer?: string;
}

export interface StudyCardProvenance {
  workspaceId: string;
  docId: string;
  blockIds?: string[];
  chunkId?: string;
}

export interface StudyCardGenerationMetadata {
  noteTypeHint?: 'basic' | 'reversed' | 'cloze' | 'scenario';
  cognitiveLevel?: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate';
  reasoningType?:
    | 'mechanism'
    | 'tradeoff'
    | 'comparison'
    | 'scenario'
    | 'debugging'
    | 'transfer';
  difficulty?: 'intro' | 'intermediate' | 'advanced';
}

export interface StudyCardContent {
  id: string;
  type: CardType;
  concepts?: string[];
  noteTypeId?: string;
  templateId?: string;
  noteFields?: Record<string, string>;
  clozeOrdinal?: number;
  imageOcclusion?: StudyImageOcclusion;
  question: string;
  answer?: string;
  misconceptions?: string[];
  rubric?: string[];
  metadata?: StudyCardGenerationMetadata;
  tags?: string[];
  provenance: StudyCardProvenance;
  createdAt: number;
  updatedAt: number;
  suspended: boolean;
}

export interface StudyCardScheduling {
  cardId: string;
  /** @deprecated Legacy field; scheduling is global per card. */
  deckId?: string;
  state: CardState;
  due: number;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  learningStep?: number;
  leech?: boolean;
  lastReviewAt?: number;
  lastGrade?: ReviewGrade;
  buriedUntil?: number;
  manualPosition?: number;
  customDueDate?: number;
}
