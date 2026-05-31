import { Button, Checkbox } from '@affine/component';
import { StudyService } from '@affine/core/modules/study';
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
import { useService } from '@toeverything/infra';
import { useState } from 'react';

import { useStudyModeCards } from './mode-shared';

const GRADES = [
  { grade: 1 as const, key: 'com.affine.study.grade.again' },
  { grade: 2 as const, key: 'com.affine.study.grade.hard' },
  { grade: 3 as const, key: 'com.affine.study.grade.good' },
  { grade: 4 as const, key: 'com.affine.study.grade.easy' },
];

export const StudyFlashcardsPage = () => {
  const t = useI18n();
  const studyService = useService(StudyService);
  const cards = useStudyModeCards();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [trackProgress, setTrackProgress] = useState(false);
  const card = cards[index];

  const goNext = () => {
    setRevealed(false);
    setIndex(current => (current + 1) % Math.max(cards.length, 1));
  };

  const gradeCard = async (grade: 1 | 2 | 3 | 4) => {
    if (!card) return;
    if (trackProgress) {
      await studyService.gradeCard(card.id, grade);
    }
    goNext();
  };

  if (!card) {
    return (
      <>
        <ViewTitle title={t['com.affine.study.flashcards.title']()} />
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
      <ViewTitle title={t['com.affine.study.flashcards.title']()} />
      <ViewIcon icon="today" />
      <ViewHeader>
        <StudyPageHeader
          title={t['com.affine.study.flashcards.title']()}
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
            GRADES.map(item => (
              <Button
                key={item.grade}
                onClick={() => {
                  gradeCard(item.grade).catch(error => {
                    console.error('[study.flashcards] grade failed', error);
                  });
                }}
              >
                {t[item.key]()}
              </Button>
            ))
          )}
        </div>
        <div className={styles.modeOptionRow}>
          <Checkbox checked={trackProgress} onChange={setTrackProgress} />
          <span>{t['com.affine.study.flashcards.track-progress']()}</span>
        </div>
      </StudyPageBody>
    </>
  );
};

export const Component = () => <StudyFlashcardsPage />;
