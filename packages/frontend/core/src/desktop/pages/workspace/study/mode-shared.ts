import type { StudyCardContent } from '@affine/core/modules/study';
import { StudyService } from '@affine/core/modules/study';
import { useLiveData, useService } from '@toeverything/infra';
import { useMemo } from 'react';

export function useStudyModeCards() {
  const studyService = useService(StudyService);
  const dueCards = useLiveData(studyService.reviewQueue$());
  const decks = useLiveData(studyService.decks$);

  return useMemo(() => {
    if (dueCards.length) {
      return dueCards;
    }
    const allCards: StudyCardContent[] = [];
    for (const deck of decks) {
      allCards.push(...deck.cards.filter(card => !card.suspended));
    }
    return allCards;
  }, [decks, dueCards]);
}
