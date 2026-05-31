export type CardType = 'recall' | 'synthesis';

export type ReviewGrade = 1 | 2 | 3 | 4;

export type CardState = 'new' | 'learning' | 'review' | 'relearning';

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
  deckId: string;
  type: CardType;
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
  deckId: string;
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
}
