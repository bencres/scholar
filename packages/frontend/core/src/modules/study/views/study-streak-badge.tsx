import type { StudyActivityStreak } from '@affine/core/modules/study/utils/study-activity';
import { useI18n } from '@affine/i18n';

import * as styles from './styles.css';

export const StudyStreakBadge = ({
  streak,
}: {
  streak: StudyActivityStreak;
}) => {
  const t = useI18n();

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
      <div>
        <div className={styles.streakValue}>{streak.current}</div>
        <div className={styles.streakMeta}>{streakLabel}</div>
      </div>
      <div className={styles.streakMeta}>
        {streak.activeToday
          ? t['com.affine.study.today.streak.active-today']()
          : t['com.affine.study.today.streak.study-today']()}
        <span>
          {t['com.affine.study.today.streak.longest']({
            count: String(streak.longest),
          })}
        </span>
      </div>
    </div>
  );
};
