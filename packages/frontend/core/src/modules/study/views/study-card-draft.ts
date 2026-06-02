import type { StudyCardContent } from '@affine/core/modules/study/entities/card';

export type CardDraft = {
  type: StudyCardContent['type'];
  question: string;
  answer: string;
  concepts: string;
  misconceptions: string;
  rubric: string;
  tags: string;
};

export const DEFAULT_CARD_DRAFT: CardDraft = {
  type: 'recall',
  question: '',
  answer: '',
  concepts: '',
  misconceptions: '',
  rubric: '',
  tags: '',
};

export function parseCsvInput(value: string) {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

export function toCardDraft(card: StudyCardContent): CardDraft {
  return {
    type: card.type,
    question: card.question,
    answer: card.answer ?? '',
    concepts: (card.concepts ?? []).join(', '),
    misconceptions: (card.misconceptions ?? []).join(', '),
    rubric: (card.rubric ?? []).join(', '),
    tags: (card.tags ?? []).join(', '),
  };
}

export function cardDraftToPayload(draft: CardDraft) {
  return {
    type: draft.type,
    question: draft.question,
    answer: draft.answer,
    concepts: parseCsvInput(draft.concepts),
    misconceptions: parseCsvInput(draft.misconceptions),
    rubric: parseCsvInput(draft.rubric),
    tags: parseCsvInput(draft.tags),
  };
}
