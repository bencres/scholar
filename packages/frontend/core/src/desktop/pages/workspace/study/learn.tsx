import { Button } from '@affine/component';
import * as styles from '@affine/core/modules/study/views/styles.css';
import {
  ViewBody,
  ViewHeader,
  ViewIcon,
  ViewTitle,
} from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { useMemo, useState } from 'react';

import { useStudyModeCards } from './mode-shared';

export const StudyLearnPage = () => {
  const t = useI18n();
  const cards = useStudyModeCards();
  const [queue, setQueue] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [retry, setRetry] = useState(0);

  const activeQueue = queue.length ? queue : cards.map(card => card.id);
  const card = useMemo(
    () => cards.find(item => item.id === activeQueue[0]),
    [activeQueue, cards]
  );

  const submitResult = (isCorrect: boolean) => {
    if (!card) return;
    setRevealed(false);
    if (isCorrect) {
      setCorrect(value => value + 1);
      setQueue(current => current.slice(1));
      return;
    }
    setRetry(value => value + 1);
    setQueue(current => [...current.slice(1), card.id]);
  };

  if (!card && cards.length === 0) {
    return (
      <>
        <ViewTitle title={t['com.affine.study.learn.title']()} />
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

  if (!card) {
    return (
      <>
        <ViewTitle title={t['com.affine.study.learn.title']()} />
        <ViewBody>
          <div className={styles.content}>
            <div className={styles.formCard}>
              <div className={styles.formTitle}>
                {t['com.affine.study.learn.done']()}
              </div>
              <div className={styles.modeSummary}>
                <span>
                  {t['com.affine.study.learn.correct']({
                    count: String(correct),
                  })}
                </span>
                <span>
                  {t['com.affine.study.learn.retry']({ count: String(retry) })}
                </span>
              </div>
              <div className={styles.actionsRow}>
                <Button
                  onClick={() => {
                    setQueue(cards.map(item => item.id));
                    setCorrect(0);
                    setRetry(0);
                  }}
                >
                  {t['com.affine.study.learn.restart']()}
                </Button>
              </div>
            </div>
          </div>
        </ViewBody>
      </>
    );
  }

  return (
    <>
      <ViewTitle title={t['com.affine.study.learn.title']()} />
      <ViewIcon icon="today" />
      <ViewHeader>
        <div className={styles.sectionTitle}>
          {t['com.affine.study.learn.progress']({
            remaining: String(activeQueue.length),
          })}
        </div>
      </ViewHeader>
      <ViewBody>
        <div className={styles.pageBody}>
          <div className={styles.content}>
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
                  <Button onClick={() => submitResult(false)}>
                    {t['com.affine.study.learn.retry-action']()}
                  </Button>
                  <Button variant="primary" onClick={() => submitResult(true)}>
                    {t['com.affine.study.learn.got-it']()}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </ViewBody>
    </>
  );
};

export const Component = () => <StudyLearnPage />;
