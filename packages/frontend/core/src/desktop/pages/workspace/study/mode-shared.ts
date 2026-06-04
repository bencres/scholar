import { StudyService } from '@affine/core/modules/study';
import { useLiveData, useService } from '@toeverything/infra';
import { useMemo } from 'react';

export function useStudyModeCards() {
  const studyService = useService(StudyService);
  const dueCards = useLiveData(studyService.reviewQueue$());
  const cards = useLiveData(studyService.cards$);

  return useMemo(() => {
    if (dueCards.length) {
      return dueCards;
    }
    return cards.filter(card => !card.suspended);
  }, [cards, dueCards]);
}
