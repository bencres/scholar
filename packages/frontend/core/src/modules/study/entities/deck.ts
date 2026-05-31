import type { StudyCardContent } from './card';

export type StudyDeckSortPolicy = 'created-desc' | 'created-asc' | 'due-asc';

export interface StudyDeckLimits {
  dailyNewLimit?: number;
  dailyReviewLimit?: number;
}

export interface StudyDeckMetadata {
  description?: string;
  tags?: string[];
  sourceLinks?: string[];
  sortPolicy?: StudyDeckSortPolicy;
  limits?: StudyDeckLimits;
}

export interface StudyDeckFutureMetadata {
  ownerId?: string;
  visibility?: 'private' | 'shared' | 'public';
  originWorkspaceId?: string;
  syncVector?: string;
}

export interface StudyDeck {
  id: string;
  name: string;
  sourceDocId?: string;
  cards: StudyCardContent[];
  metadata?: StudyDeckMetadata;
  future?: StudyDeckFutureMetadata;
  createdAt: number;
  updatedAt: number;
}
