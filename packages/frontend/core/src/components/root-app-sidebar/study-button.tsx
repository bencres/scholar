import { MenuLinkItem } from '@affine/core/modules/app-sidebar/views';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import { StudyService } from '@affine/core/modules/study';
import * as styles from '@affine/core/modules/study/views/styles.css';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { TodayIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';

export const AppSidebarStudyButton = () => {
  const t = useI18n();
  const studyService = useService(StudyService);
  const featureFlagService = useService(FeatureFlagService);
  const workbench = useService(WorkbenchService).workbench;
  const location = useLiveData(workbench.location$);
  const enabled = useLiveData(featureFlagService.flags.enable_study.$);
  const dueCount = useLiveData(studyService.dueCount$);

  if (!enabled) {
    return null;
  }

  return (
    <MenuLinkItem
      data-testid="slider-bar-study-button"
      active={location.pathname.startsWith('/study')}
      to={'/study'}
      icon={<TodayIcon />}
    >
      {t['com.affine.study.title']()}
      {dueCount > 0 ? (
        <span className={styles.badge}>{dueCount}</span>
      ) : null}
    </MenuLinkItem>
  );
};
