import type { StudyCardContent } from './card';

export type StudyDeckSortPolicy = 'created-desc' | 'created-asc' | 'due-asc';

export interface StudyDeckBrowserPreset {
  id: string;
  name: string;
  query: string;
}

export interface StudyDeckFilteredConfig {
  query: string;
  limit?: number;
  reschedule?: boolean;
}

export interface StudyDeckSchedulingOptions {
  learningStepsMinutes?: number[];
  relearningStepsMinutes?: number[];
  desiredRetention?: number;
  easyBonus?: number;
  graduatingIntervalDays?: number;
  easyIntervalDays?: number;
  newCardOrder?: 'position' | 'random';
  burySiblings?: boolean;
  leechThreshold?: number;
}

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
  optionsGroupId?: string;
  schedulingOptions?: StudyDeckSchedulingOptions;
  filtered?: StudyDeckFilteredConfig;
  browserPresets?: StudyDeckBrowserPreset[];
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
