import { useI18n } from '@affine/i18n';

import * as styles from './styles.css';

export const StudyCardSearchHelp = () => {
  const t = useI18n();
  return (
    <details className={styles.searchHelp}>
      <summary className={styles.searchHelpSummary}>
        {t['com.affine.study.card-library.search.help-title']()}
      </summary>
      <p className={styles.searchHelpIntro}>
        {t['com.affine.study.card-library.search.help-intro']()}
      </p>
      <ul className={styles.searchHelpList}>
        <li>
          <code className={styles.searchHelpCode}>deck:name</code>
          {' — '}
          {t['com.affine.study.card-library.search.help-deck']()}
        </li>
        <li>
          <code className={styles.searchHelpCode}>concept:name</code>
          {' — '}
          {t['com.affine.study.card-library.search.help-concept']()}
        </li>
        <li>
          <code className={styles.searchHelpCode}>tag:name</code>
          {' — '}
          {t['com.affine.study.card-library.search.help-tag']()}
        </li>
        <li>
          <code className={styles.searchHelpCode}>
            state:new|learning|review|relearning
          </code>
          {' — '}
          {t['com.affine.study.card-library.search.help-state']()}
        </li>
        <li>
          <code className={styles.searchHelpCode}>
            due:overdue|today|future
          </code>
          {' — '}
          {t['com.affine.study.card-library.search.help-due']()}
        </li>
        <li>{t['com.affine.study.card-library.search.help-text']()}</li>
      </ul>
      <p className={styles.searchHelpExample}>
        {t['com.affine.study.card-library.search.help-example']()}
      </p>
    </details>
  );
};
