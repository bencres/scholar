import { Button } from '@affine/component';
import { StudyService } from '@affine/core/modules/study';
import {
  StudyPageBody,
  StudyPageHeader,
} from '@affine/core/modules/study/views/study-page-shell';
import { StudySubnav } from '@affine/core/modules/study/views/study-subnav';
import { StudyTodayDashboard } from '@affine/core/modules/study/views/study-today';
import * as styles from '@affine/core/modules/study/views/styles.css';
import {
  ViewHeader,
  ViewIcon,
  ViewTitle,
  WorkbenchService,
} from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { useLiveData, useService } from '@toeverything/infra';

export const StudyHome = () => {
  const t = useI18n();
  const studyService = useService(StudyService);
  const workbench = useService(WorkbenchService).workbench;
  const dueCount = useLiveData(studyService.dueCount$);

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
    <div className={styles.heroSub}>
      {t['com.affine.study.today.hero.subtitle']()}
    </div>
  );

  return (
    <>
      <ViewTitle title={t['com.affine.study.tab.today']()} />
      <ViewIcon icon="today" />
      <ViewHeader>
        <StudyPageHeader
          title={t['com.affine.study.tab.today']()}
          actions={headerActions}
        />
      </ViewHeader>
      <StudySubnav />
      <StudyPageBody toolbar={toolbar}>
        <StudyTodayDashboard />
      </StudyPageBody>
    </>
  );
};

export const Component = () => <StudyHome />;
