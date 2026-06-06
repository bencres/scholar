import { WorkbenchService } from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { useService } from '@toeverything/infra';

import * as styles from './styles.css';

type StudyMode = {
  path: string;
  titleKey:
    | 'com.affine.study.today.mode.review.title'
    | 'com.affine.study.today.mode.flashcards.title'
    | 'com.affine.study.today.mode.learn.title'
    | 'com.affine.study.today.mode.test.title'
    | 'com.affine.study.today.mode.graph.title'
    | 'com.affine.study.today.mode.tutor.title'
    | 'com.affine.study.today.mode.insights.title'
    | 'com.affine.study.today.mode.synthesize.title';
  descriptionKey:
    | 'com.affine.study.today.mode.review.description'
    | 'com.affine.study.today.mode.flashcards.description'
    | 'com.affine.study.today.mode.learn.description'
    | 'com.affine.study.today.mode.test.description'
    | 'com.affine.study.today.mode.graph.description'
    | 'com.affine.study.today.mode.tutor.description'
    | 'com.affine.study.today.mode.insights.description'
    | 'com.affine.study.today.mode.synthesize.description';
};

const STUDY_MODES: StudyMode[] = [
  {
    path: '/study/review',
    titleKey: 'com.affine.study.today.mode.review.title',
    descriptionKey: 'com.affine.study.today.mode.review.description',
  },
  {
    path: '/study/synthesize',
    titleKey: 'com.affine.study.today.mode.synthesize.title',
    descriptionKey: 'com.affine.study.today.mode.synthesize.description',
  },
  {
    path: '/study/flashcards',
    titleKey: 'com.affine.study.today.mode.flashcards.title',
    descriptionKey: 'com.affine.study.today.mode.flashcards.description',
  },
  {
    path: '/study/learn',
    titleKey: 'com.affine.study.today.mode.learn.title',
    descriptionKey: 'com.affine.study.today.mode.learn.description',
  },
  {
    path: '/study/test',
    titleKey: 'com.affine.study.today.mode.test.title',
    descriptionKey: 'com.affine.study.today.mode.test.description',
  },
  {
    path: '/study/graph',
    titleKey: 'com.affine.study.today.mode.graph.title',
    descriptionKey: 'com.affine.study.today.mode.graph.description',
  },
  {
    path: '/study/tutor',
    titleKey: 'com.affine.study.today.mode.tutor.title',
    descriptionKey: 'com.affine.study.today.mode.tutor.description',
  },
  {
    path: '/study/dashboard',
    titleKey: 'com.affine.study.today.mode.insights.title',
    descriptionKey: 'com.affine.study.today.mode.insights.description',
  },
];

export const StudyModeCards = () => {
  const t = useI18n();
  const workbench = useService(WorkbenchService).workbench;

  return (
    <div className={styles.formCard}>
      <div className={styles.formTitle}>
        {t['com.affine.study.today.modes.title']()}
      </div>
      <div className={styles.heroSub}>
        {t['com.affine.study.today.modes.subtitle']()}
      </div>
      <div className={styles.studyModeGrid}>
        {STUDY_MODES.map(mode => (
          <button
            key={mode.path}
            type="button"
            className={styles.studyModeCard}
            onClick={() => workbench.open(mode.path, { at: 'active' })}
          >
            <div className={styles.studyModeTitle}>{t[mode.titleKey]()}</div>
            <div className={styles.studyModeDescription}>
              {t[mode.descriptionKey]()}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
