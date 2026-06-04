import { Button } from '@affine/component';
import { StudyService } from '@affine/core/modules/study';
import { getDeckCards } from '@affine/core/modules/study/utils/study-storage';
import {
  StudyPageBody,
  StudyPageHeader,
} from '@affine/core/modules/study/views/study-page-shell';
import * as styles from '@affine/core/modules/study/views/styles.css';
import {
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
  const allCards = useLiveData(studyService.cards$);

  const cards = useMemo(() => {
    if (dueCards.length) {
      return dueCards;
    }
    if (deckId) {
      const deck = decks.find(item => item.id === deckId);
      if (!deck) return [];
      return getDeckCards(deck, allCards).filter(card => !card.suspended);
    }
    return allCards.filter(card => !card.suspended);
  }, [allCards, deckId, decks, dueCards]);

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
        <StudyPageBody>
          <div className={styles.emptyState}>
            {t['com.affine.study.review.empty']()}
          </div>
        </StudyPageBody>
      </>
    );
  }

  return (
    <>
      <ViewTitle title={t['com.affine.study.review.title']()} />
      <ViewIcon icon="today" />
      <ViewHeader>
        <StudyPageHeader
          title={t['com.affine.study.review.title']()}
          actions={
            <span className={styles.headerMeta}>
              {t['com.affine.study.review.progress']({
                current: String(index + 1),
                total: String(cards.length),
              })}
            </span>
          }
        />
      </ViewHeader>
      <StudyPageBody>
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
              <Button
                key={item.grade}
                onClick={() => {
                  handleGrade(item.grade).catch(error => {
                    console.error('[study.review] grade failed', error);
                  });
                }}
              >
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
      </StudyPageBody>
    </>
  );
};

export const Component = () => <StudyReviewPage />;
