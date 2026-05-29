import type { StudyCardContent } from './card';

export interface StudyDeck {
  id: string;
  name: string;
  sourceDocId?: string;
  cards: StudyCardContent[];
  createdAt: number;
  updatedAt: number;
}
