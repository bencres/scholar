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
} from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { useService } from '@toeverything/infra';

export const StudyHome = () => {
  const t = useI18n();
  const studyService = useService(StudyService);

  if (!studyService.enabled) {
    return (
      <StudyPageBody>
        <div className={styles.emptyState}>
          {t['com.affine.study.disabled']()}
        </div>
      </StudyPageBody>
    );
  }

  const toolbar = (
    <div className={styles.heroSub}>
      {t['com.affine.study.today.hero.subtitle']()}
    </div>
  );

  return (
    <>
      <ViewTitle title={t['com.affine.study.tab.today']()} />
      <ViewIcon icon="study" />
      <ViewHeader>
        <StudyPageHeader title={t['com.affine.study.tab.today']()} />
      </ViewHeader>
      <StudySubnav />
      <StudyPageBody toolbar={toolbar}>
        <StudyTodayDashboard />
      </StudyPageBody>
    </>
  );
};

export const Component = () => <StudyHome />;
