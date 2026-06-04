import {
  WorkbenchLink,
  WorkbenchService,
} from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { useLiveData, useService } from '@toeverything/infra';

import * as styles from './styles.css';

const tabs = [
  { to: '/study/decks', labelKey: 'com.affine.study.tab.decks' as const },
  { to: '/study/cards', labelKey: 'com.affine.study.tab.cards' as const },
];

export const StudySubnav = () => {
  const t = useI18n();
  const workbench = useService(WorkbenchService).workbench;
  const location = useLiveData(workbench.location$);

  return (
    <nav className={styles.subnav} aria-label={t['com.affine.study.title']()}>
      {tabs.map(tab => (
        <WorkbenchLink
          key={tab.to}
          to={tab.to}
          className={styles.subnavTab}
          data-active={location.pathname.startsWith(tab.to)}
          replaceHistory
        >
          {t[tab.labelKey]()}
        </WorkbenchLink>
      ))}
    </nav>
  );
};
