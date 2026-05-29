import { Button } from '@affine/component';
import type { StudyCardContent } from '@affine/core/modules/study';
import { StudyService } from '@affine/core/modules/study';
import * as styles from '@affine/core/modules/study/views/styles.css';
import {
  ViewBody,
  ViewHeader,
  ViewIcon,
  ViewTitle,
  WorkbenchService,
} from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { useLiveData, useService } from '@toeverything/infra';
import { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

const GRADES = [
  { grade: 1 as const, labelKey: 'com.affine.study.grade.again' },
  { grade: 2 as const, labelKey: 'com.affine.study.grade.hard' },
  { grade: 3 as const, labelKey: 'com.affine.study.grade.good' },
  { grade: 4 as const, labelKey: 'com.affine.study.grade.easy' },
];

function useReviewCards(deckId?: string) {
  const studyService = useService(StudyService);
  const dueCards = useLiveData(studyService.reviewQueue$(deckId));
  const decks = useLiveData(studyService.decks$);

  const cards = useMemo(() => {
    if (dueCards.length) {
      return dueCards;
    }
    if (deckId) {
      const deck = decks.find(item => item.id === deckId);
      return deck?.cards.filter(card => !card.suspended) ?? [];
    }
    const allCards: StudyCardContent[] = [];
    for (const deck of decks) {
      allCards.push(...deck.cards.filter(card => !card.suspended));
    }
    return allCards;
  }, [deckId, decks, dueCards]);

  return { cards, useGrading: dueCards.length > 0 };
}

export const StudyReviewPage = () => {
  const t = useI18n();
  const { deckId } = useParams<{ deckId?: string }>();
  const studyService = useService(StudyService);
  const workbench = useService(WorkbenchService).workbench;
  const { cards, useGrading } = useReviewCards(deckId);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const card = cards[index];

  const goNext = useCallback(() => {
    setRevealed(false);
    setIndex(current => (current + 1) % Math.max(cards.length, 1));
  }, [cards.length]);

  const handleGrade = useCallback(
    async (grade: 1 | 2 | 3 | 4) => {
      if (!card) return;
      await studyService.gradeCard(card.id, grade);
      goNext();
    },
    [card, goNext, studyService]
  );

  const handleViewSource = useCallback(() => {
    if (!card) return;
    workbench.openDoc({
      docId: card.provenance.docId,
      mode: 'page',
      blockIds: card.provenance.blockIds,
    });
  }, [card, workbench]);

  if (!cards.length) {
    return (
      <>
        <ViewTitle title={t['com.affine.study.review.title']()} />
        <ViewBody>
          <div className={styles.content}>
            <div className={styles.emptyState}>
              {t['com.affine.study.review.empty']()}
            </div>
          </div>
        </ViewBody>
      </>
    );
  }

  return (
    <>
      <ViewTitle title={t['com.affine.study.review.title']()} />
      <ViewIcon icon="today" />
      <ViewHeader>
        <div className={styles.sectionTitle}>
          {t['com.affine.study.review.progress']({
            current: String(index + 1),
            total: String(cards.length),
          })}
        </div>
      </ViewHeader>
      <ViewBody>
        <div className={styles.pageBody}>
          <div className={styles.content}>
            <div className={styles.cardSurface}>
              <div className={styles.cardLabel}>{card.type}</div>
              <div className={styles.cardQuestion}>{card.question}</div>
              {revealed ? (
                <>
                  {card.type === 'recall' && card.answer ? (
                    <div className={styles.cardAnswer}>{card.answer}</div>
                  ) : null}
                  {card.type === 'recall' && card.misconceptions?.length ? (
                    <div>
                      <div className={styles.cardLabel}>
                        {t['com.affine.study.misconceptions']()}
                      </div>
                      <ul>
                        {card.misconceptions.map(item => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {card.type === 'synthesis' && card.rubric?.length ? (
                    <div>
                      <div className={styles.cardLabel}>
                        {t['com.affine.study.rubric']()}
                      </div>
                      <ul>
                        {card.rubric.map(item => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
            <div className={styles.actionsRow}>
              {!revealed ? (
                <Button variant="primary" onClick={() => setRevealed(true)}>
                  {t['com.affine.study.reveal']()}
                </Button>
              ) : useGrading ? (
                GRADES.map(item => (
                  <Button key={item.grade} onClick={() => handleGrade(item.grade)}>
                    {t[item.labelKey]()}
                  </Button>
                ))
              ) : (
                <Button variant="primary" onClick={goNext}>
                  {t['com.affine.study.next']()}
                </Button>
              )}
              <Button onClick={handleViewSource}>
                {t['com.affine.study.view-source']()}
              </Button>
            </div>
          </div>
        </div>
      </ViewBody>
    </>
  );
};

export const Component = () => <StudyReviewPage />;
