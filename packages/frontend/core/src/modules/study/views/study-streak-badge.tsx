import type { StudyActivityStreak } from '@affine/core/modules/study/utils/study-activity';

import * as styles from './styles.css';

export const StudyStreakBadge = ({
  streak,
}: {
  streak: StudyActivityStreak;
}) => {
  const streakLabel =
    streak.current === 0
      ? 'Start a streak by reviewing or creating a card today.'
      : streak.current === 1
        ? '1 day streak'
        : `${streak.current} day streak`;

  return (
    <div className={styles.streakCard}>
      <div>
        <div className={styles.streakValue}>{streak.current}</div>
        <div className={styles.streakMeta}>{streakLabel}</div>
      </div>
      <div className={styles.streakMeta}>
        {streak.activeToday
          ? 'You studied today. Keep it going tomorrow.'
          : 'Review or create a card today to continue your streak.'}
        <span>Longest streak: {streak.longest} days</span>
      </div>
    </div>
  );
};
