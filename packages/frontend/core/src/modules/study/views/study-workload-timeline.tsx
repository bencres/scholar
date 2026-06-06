import type { StudyWorkloadDayForecast } from '@affine/core/modules/study/utils/study-concept-stats';
import { i18nTime, useI18n } from '@affine/i18n';

import * as styles from './styles.css';

export const StudyWorkloadTimeline = ({
  days,
}: {
  days: StudyWorkloadDayForecast[];
}) => {
  const t = useI18n();
  const maxDue = Math.max(1, ...days.map(day => day.dueCount));

  return (
    <div className={styles.formCard}>
      <div className={styles.formTitle}>
        {t['com.affine.study.today.forecast.title']()}
      </div>
      <div className={styles.heroSub}>
        {t['com.affine.study.today.forecast.subtitle']()}
      </div>
      <div className={styles.workloadTimeline}>
        {days.map((day, index) => (
          <div
            key={day.dayOffset}
            className={`${styles.workloadDay} ${
              day.dayOffset === 0 ? styles.workloadDayToday : ''
            }`}
          >
            {index < days.length - 1 ? (
              <span className={styles.workloadDayConnector} aria-hidden />
            ) : null}
            <div className={styles.conceptTitle}>
              {day.dayOffset === 0
                ? t['com.affine.study.today.forecast.today']()
                : i18nTime(day.date, { absolute: { accuracy: 'day' } })}
            </div>
            <div className={styles.conceptMeta}>
              {t['com.affine.study.today.forecast.due']({
                count: String(day.dueCount),
              })}
            </div>
            <div className={styles.workloadDueBar}>
              <div
                className={styles.workloadDueFill}
                style={{ width: `${(day.dueCount / maxDue) * 100}%` }}
              />
            </div>
            {day.topConcepts.length ? (
              <div className={styles.conceptChipRow}>
                {day.topConcepts.map(concept => (
                  <span key={concept.id} className={styles.conceptChip}>
                    {concept.label}
                  </span>
                ))}
              </div>
            ) : (
              <div className={styles.conceptMeta}>
                {t['com.affine.study.today.forecast.no-concepts']()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
