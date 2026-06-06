import { Button, Input } from '@affine/component';
import {
  StudyPageBody,
  StudyPageHeader,
} from '@affine/core/modules/study/views/study-page-shell';
import * as styles from '@affine/core/modules/study/views/styles.css';
import {
  ViewHeader,
  ViewIcon,
  ViewTitle,
} from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { useMemo, useState } from 'react';

import { useStudyModeCards } from './mode-shared';

export const StudyTestPage = () => {
  const t = useI18n();
  const cards = useStudyModeCards();
  const [questionCount, setQuestionCount] = useState('10');
  const [sessionCardIds, setSessionCardIds] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);

  const sessionCards = useMemo(() => {
    if (!sessionCardIds) return [];
    const map = new Map(cards.map(card => [card.id, card]));
    return sessionCardIds
      .map(id => map.get(id))
      .filter((card): card is NonNullable<typeof card> => !!card);
  }, [cards, sessionCardIds]);

  const card = sessionCards[index];

  const startSession = () => {
    const count = Math.max(
      1,
      Math.min(cards.length, Number.parseInt(questionCount, 10) || 10)
    );
    setSessionCardIds(cards.slice(0, count).map(item => item.id));
    setIndex(0);
    setRevealed(false);
    setScore(0);
  };

  const submitAnswer = (correctAnswer: boolean) => {
    setScore(value => value + (correctAnswer ? 1 : 0));
    setRevealed(false);
    setIndex(current => current + 1);
  };

  if (!cards.length) {
    return (
      <>
        <ViewTitle title={t['com.affine.study.test.title']()} />
        <StudyPageBody>
          <div className={styles.emptyState}>
            {t['com.affine.study.review.empty']()}
          </div>
        </StudyPageBody>
      </>
    );
  }

  if (!sessionCardIds) {
    return (
      <>
        <ViewTitle title={t['com.affine.study.test.title']()} />
        <StudyPageBody>
          <div className={styles.formCard}>
            <div className={styles.formTitle}>
              {t['com.affine.study.test.setup']()}
            </div>
            <div className={styles.formGrid}>
              <Input
                value={questionCount}
                onChange={event => setQuestionCount(event.target.value)}
                placeholder={t['com.affine.study.test.count.placeholder']()}
              />
            </div>
            <div className={styles.actionsRow}>
              <Button variant="primary" onClick={startSession}>
                {t['com.affine.study.test.start']()}
              </Button>
            </div>
          </div>
        </StudyPageBody>
      </>
    );
  }

  if (!card) {
    return (
      <>
        <ViewTitle title={t['com.affine.study.test.title']()} />
        <StudyPageBody>
          <div className={styles.formCard}>
            <div className={styles.formTitle}>
              {t['com.affine.study.test.complete']()}
            </div>
            <div className={styles.modeSummary}>
              {t['com.affine.study.test.score']({
                score: String(score),
                total: String(sessionCards.length),
              })}
            </div>
            <div className={styles.actionsRow}>
              <Button
                onClick={() => {
                  setSessionCardIds(null);
                  setQuestionCount(String(sessionCards.length));
                }}
              >
                {t['com.affine.study.test.new-session']()}
              </Button>
            </div>
          </div>
        </StudyPageBody>
      </>
    );
  }

  return (
    <>
      <ViewTitle title={t['com.affine.study.test.title']()} />
      <ViewIcon icon="study" />
      <ViewHeader>
        <StudyPageHeader
          title={t['com.affine.study.test.title']()}
          actions={
            <span className={styles.headerMeta}>
              {t['com.affine.study.review.progress']({
                current: String(index + 1),
                total: String(sessionCards.length),
              })}
            </span>
          }
        />
      </ViewHeader>
      <StudyPageBody>
        <div className={styles.cardSurface}>
          <div className={styles.cardLabel}>{card.type}</div>
          <div className={styles.cardQuestion}>{card.question}</div>
          {revealed && card.answer ? (
            <div className={styles.cardAnswer}>{card.answer}</div>
          ) : null}
        </div>
        <div className={styles.actionsRow}>
          {!revealed ? (
            <Button variant="primary" onClick={() => setRevealed(true)}>
              {t['com.affine.study.reveal']()}
            </Button>
          ) : (
            <>
              <Button onClick={() => submitAnswer(false)}>
                {t['com.affine.study.test.incorrect']()}
              </Button>
              <Button variant="primary" onClick={() => submitAnswer(true)}>
                {t['com.affine.study.test.correct']()}
              </Button>
            </>
          )}
        </div>
      </StudyPageBody>
    </>
  );
};

export const Component = () => <StudyTestPage />;
