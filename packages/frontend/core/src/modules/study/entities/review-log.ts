import type { ReviewGrade } from './card';

export interface StudyReviewLog {
  id: string;
  deckId: string;
  cardId: string;
  reviewedAt: number;
  grade: ReviewGrade;
  schedulingStateBefore: string;
  schedulingStateAfter: string;
  dueBefore: number;
  dueAfter: number;
  durationMs?: number;
}

export interface StudyReviewStats {
  totalReviews: number;
  byGrade: Record<ReviewGrade, number>;
  lastReviewedAt?: number;
}
