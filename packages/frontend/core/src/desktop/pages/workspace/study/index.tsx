import { Button } from '@affine/component';
import { StudyService } from '@affine/core/modules/study';
import {
  StudyPageBody,
  StudyPageHeader,
} from '@affine/core/modules/study/views/study-page-shell';
import { StudySubnav } from '@affine/core/modules/study/views/study-subnav';
import * as styles from '@affine/core/modules/study/views/styles.css';
import {
  ViewHeader,
  ViewIcon,
  ViewTitle,
  WorkbenchService,
} from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { useLiveData, useService } from '@toeverything/infra';
import { useMemo } from 'react';

export const StudyHome = () => {
  const t = useI18n();
  const studyService = useService(StudyService);
  const workbench = useService(WorkbenchService).workbench;
  const dueCount = useLiveData(studyService.dueCount$);
  const learningGraph = studyService.learningGraphSnapshot();
  const weakestConcepts = useMemo(
    () => learningGraph.concepts.slice(0, 5),
    [learningGraph.concepts]
  );

  if (!studyService.enabled) {
    return (
      <StudyPageBody>
        <div className={styles.emptyState}>
          {t['com.affine.study.disabled']()}
        </div>
      </StudyPageBody>
    );
  }

  const headerActions = (
    <>
      {dueCount > 0 ? (
        <Button
          variant="primary"
          onClick={() => workbench.open('/study/review', { at: 'active' })}
        >
          {t['com.affine.study.review-due']({ count: String(dueCount) })}
        </Button>
      ) : null}
      <Button
        onClick={() => workbench.open('/study/generate', { at: 'active' })}
      >
        {t['com.affine.study.generate.title']()}
      </Button>
    </>
  );

  const toolbar = (
    <>
      <div className={styles.heroSub}>
        {t['com.affine.study.hero.subtitle']()}
      </div>
      <div className={styles.modeGrid}>
        <Button
          onClick={() => workbench.open('/study/flashcards', { at: 'active' })}
        >
          {t['com.affine.study.flashcards.title']()}
        </Button>
        <Button
          onClick={() => workbench.open('/study/learn', { at: 'active' })}
        >
          {t['com.affine.study.learn.title']()}
        </Button>
        <Button onClick={() => workbench.open('/study/test', { at: 'active' })}>
          {t['com.affine.study.test.title']()}
        </Button>
        <Button
          onClick={() => workbench.open('/study/graph', { at: 'active' })}
        >
          Learning graph
        </Button>
        <Button
          onClick={() => workbench.open('/study/tutor', { at: 'active' })}
        >
          Adaptive tutor
        </Button>
        <Button
          onClick={() => workbench.open('/study/dashboard', { at: 'active' })}
        >
          Intelligence dashboard
        </Button>
      </div>
    </>
  );

  return (
    <>
      <ViewTitle title={t['com.affine.study.title']()} />
      <ViewIcon icon="today" />
      <ViewHeader>
        <StudyPageHeader
          title={t['com.affine.study.title']()}
          actions={headerActions}
        />
      </ViewHeader>
      <StudySubnav />
      <StudyPageBody toolbar={toolbar}>
        <div className={styles.formCard}>
          <div className={styles.formTitle}>Learning graph overview</div>
          <div className={styles.modeSummary}>
            <span>
              {`Mapped cards: ${learningGraph.mappedCards}/${learningGraph.totalCards}`}
            </span>
            <span>{`Concept links: ${learningGraph.edges.length}`}</span>
          </div>
          {weakestConcepts.length ? (
            <div className={styles.conceptGrid}>
              {weakestConcepts.map(concept => (
                <div key={concept.id} className={styles.conceptCard}>
                  <div className={styles.conceptTitle}>{concept.label}</div>
                  <div className={styles.conceptMeta}>
                    {`Mastery: ${Math.round(concept.mastery * 100)}%`}
                  </div>
                  <div className={styles.conceptMeta}>
                    {`Risk: ${Math.round(concept.forgettingRisk * 100)}%`}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>No mapped concepts yet.</div>
          )}
        </div>
      </StudyPageBody>
    </>
  );
};

export const Component = () => <StudyHome />;
