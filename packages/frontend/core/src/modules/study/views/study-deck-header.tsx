import { Button } from '@affine/component';
import { WorkbenchLink } from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { TodayIcon } from '@blocksuite/icons/rc';
import type { ReactNode } from 'react';

import * as styles from './styles.css';

export const StudyDeckHeader = ({
  deckName,
  actions,
}: {
  deckName: string;
  actions?: ReactNode;
}) => {
  const t = useI18n();

  return (
    <header className={styles.deckPageHeader}>
      <div className={styles.breadcrumb}>
        <div className={styles.breadcrumbItem}>
          <WorkbenchLink to="/study" className={styles.breadcrumbLink}>
            {t['com.affine.study.title']()}
          </WorkbenchLink>
        </div>
        <div className={styles.breadcrumbSeparator}>/</div>
        <div className={styles.breadcrumbItem} data-active={true}>
          <TodayIcon className={styles.breadcrumbIcon} />
          {deckName}
        </div>
      </div>
      {actions ? <div className={styles.headerActions}>{actions}</div> : null}
    </header>
  );
};

export const StudyDeckHeaderActions = ({
  dueCount,
  onReview,
}: {
  dueCount: number;
  onReview: () => void;
}) => {
  const t = useI18n();

  return (
    <Button variant="primary" onClick={onReview}>
      {dueCount > 0
        ? t['com.affine.study.review-due']({ count: String(dueCount) })
        : t['com.affine.study.review']()}
    </Button>
  );
};
