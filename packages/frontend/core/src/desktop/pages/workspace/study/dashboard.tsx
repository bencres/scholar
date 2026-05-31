import { Input } from '@affine/component';
import { StudyService } from '@affine/core/modules/study';
import {
  StudyPageBody,
  StudyPageHeader,
} from '@affine/core/modules/study/views/study-page-shell';
import * as styles from '@affine/core/modules/study/views/styles.css';
import {
  ViewHeader,
  ViewIcon,
  ViewTitle,
} from '@affine/core/modules/workbench';
import { useService } from '@toeverything/infra';
import { useMemo, useState } from 'react';

export const StudyDashboardPage = () => {
  const studyService = useService(StudyService);
  const snapshot = studyService.intelligenceDashboardSnapshot();
  const [daysUntilGoal, setDaysUntilGoal] = useState('30');
  const [minutesPerDay, setMinutesPerDay] = useState('45');
  const [targetRetention, setTargetRetention] = useState('0.9');

  const goalPlan = useMemo(
    () =>
      studyService.planStudyGoal({
        daysUntilGoal: Number.parseInt(daysUntilGoal, 10) || 30,
        minutesPerDay: Number.parseInt(minutesPerDay, 10) || 45,
        targetRetention: Number.parseFloat(targetRetention) || 0.9,
      }),
    [daysUntilGoal, minutesPerDay, studyService, targetRetention]
  );

  return (
    <>
      <ViewTitle title="Study intelligence dashboard" />
      <ViewIcon icon="today" />
      <ViewHeader>
        <StudyPageHeader title="Study intelligence dashboard" />
      </ViewHeader>
      <StudyPageBody>
        <div className={styles.formCard}>
          <div className={styles.formTitle}>Mastery distribution</div>
          <div className={styles.modeSummary}>
            <span>{`Strong concepts: ${snapshot.masteryBands.strong}`}</span>
            <span>{`Developing concepts: ${snapshot.masteryBands.developing}`}</span>
            <span>{`Fragile concepts: ${snapshot.masteryBands.fragile}`}</span>
          </div>
        </div>

        <div className={styles.formCard}>
          <div className={styles.formTitle}>Top forgetting-risk concepts</div>
          {snapshot.topRiskConcepts.length ? (
            <div className={styles.conceptGrid}>
              {snapshot.topRiskConcepts.map(concept => (
                <div key={concept.conceptId} className={styles.conceptCard}>
                  <div className={styles.conceptTitle}>{concept.label}</div>
                  <div className={styles.conceptMeta}>
                    {`Mastery: ${Math.round(concept.mastery * 100)}%`}
                  </div>
                  <div className={styles.conceptMeta}>
                    {`Risk: ${Math.round(concept.forgettingRisk * 100)}%`}
                  </div>
                  <div className={styles.conceptMeta}>
                    {`Due: ${concept.dueCount}, misses: ${concept.recentMisses}`}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>No concept risk data yet.</div>
          )}
        </div>

        <div className={styles.formCard}>
          <div className={styles.formTitle}>Goal planner</div>
          <div className={styles.formGrid}>
            <Input
              value={daysUntilGoal}
              onChange={event => setDaysUntilGoal(event.target.value)}
              placeholder="Days until exam"
            />
            <Input
              value={minutesPerDay}
              onChange={event => setMinutesPerDay(event.target.value)}
              placeholder="Minutes per day"
            />
            <Input
              value={targetRetention}
              onChange={event => setTargetRetention(event.target.value)}
              placeholder="Target retention (0.7 - 0.97)"
            />
          </div>
          <div className={styles.modeSummary}>
            <span>{`Daily cards target: ${goalPlan.dailyCardsTarget}`}</span>
            <span>{`Daily review target: ${goalPlan.dailyReviewTarget}`}</span>
            <span>{`Estimated minutes/day: ${goalPlan.estimatedMinutesPerDay}`}</span>
            <span>{`Buffer days: ${goalPlan.bufferDays}`}</span>
            <span>{goalPlan.recommendation}</span>
          </div>
        </div>

        <div className={styles.formCard}>
          <div className={styles.formTitle}>Action recommendations</div>
          <div className={styles.modeSummary}>
            {snapshot.recommendations.map(item => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        <div className={styles.formCard}>
          <div className={styles.formTitle}>7-day workload forecast</div>
          <div className={styles.conceptGrid}>
            {snapshot.workloadForecast.map(day => (
              <div key={day.dayOffset} className={styles.conceptCard}>
                <div
                  className={styles.conceptTitle}
                >{`Day ${day.dayOffset + 1}`}</div>
                <div
                  className={styles.conceptMeta}
                >{`Due cards: ${day.dueCount}`}</div>
              </div>
            ))}
          </div>
        </div>
      </StudyPageBody>
    </>
  );
};

export const Component = () => <StudyDashboardPage />;
