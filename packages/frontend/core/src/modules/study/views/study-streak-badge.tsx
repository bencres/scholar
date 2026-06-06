import { Button } from '@affine/component';
import type { StudyActivityStreak } from '@affine/core/modules/study/utils/study-activity';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { useService } from '@toeverything/infra';

import * as styles from './styles.css';

export const StudyStreakBadge = ({
  streak,
  dueCount,
}: {
  streak: StudyActivityStreak;
  dueCount: number;
}) => {
  const t = useI18n();
  const workbench = useService(WorkbenchService).workbench;

  const streakLabel =
    streak.current === 0
      ? t['com.affine.study.today.streak.zero']()
      : streak.current === 1
        ? `1 ${t['com.affine.study.today.streak.day']()}`
        : t['com.affine.study.today.streak.days']({
            count: String(streak.current),
          });

  return (
    <div className={styles.streakCard}>
      <div className={styles.streakValue}>{streak.current}</div>
      <div className={styles.streakMeta}>{streakLabel}</div>
      <div className={styles.streakLongest}>
        {t['com.affine.study.today.streak.longest']({
          count: String(streak.longest),
        })}
      </div>
      {dueCount > 0 ? (
        <div className={styles.streakActions}>
          <Button
            variant="primary"
            onClick={() => workbench.open('/study/review', { at: 'active' })}
          >
            {t['com.affine.study.review-due']({ count: String(dueCount) })}
          </Button>
        </div>
      ) : null}
    </div>
  );
};
