import { Header } from '@affine/core/components/pure/header';
import { ViewBody } from '@affine/core/modules/workbench';
import type { ReactNode } from 'react';

import * as styles from './styles.css';

export const StudyPageHeader = ({
  title,
  actions,
}: {
  title: ReactNode;
  actions?: ReactNode;
}) => {
  return (
    <Header
      left={<div className={styles.headerTitle}>{title}</div>}
      right={actions}
    />
  );
};

export const StudyPageBody = ({
  children,
  toolbar,
}: {
  children: ReactNode;
  toolbar?: ReactNode;
}) => {
  return (
    <ViewBody>
      <div className={styles.body}>
        {toolbar ? <div className={styles.toolbarArea}>{toolbar}</div> : null}
        <div className={styles.scrollArea}>
          <div className={styles.scrollContent}>{children}</div>
        </div>
      </div>
    </ViewBody>
  );
};
