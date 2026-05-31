import type { ReviewGrade, StudyCardScheduling } from '../entities/card';
import type { StudyReviewLog } from '../entities/review-log';

export interface StudyStatsSnapshot {
  retentionCurve: Array<{ bucketDays: number; retention: number }>;
  intervalDistribution: Array<{ days: number; count: number }>;
  easeDistribution: Array<{ grade: ReviewGrade; count: number }>;
  workloadForecast: Array<{ dayOffset: number; dueCount: number }>;
  leechCount: number;
  lapseCount: number;
}

export function buildStudyStatsSnapshot(
  scheduling: StudyCardScheduling[],
  logs: StudyReviewLog[],
  now = Date.now()
): StudyStatsSnapshot {
  const reviewed = logs.length || 1;
  const successful = logs.filter(log => log.grade >= 3).length;
  const baseRetention = successful / reviewed;
  const retentionCurve = [1, 7, 30, 90].map(bucket => ({
    bucketDays: bucket,
    retention: Number(
      Math.max(
        0.05,
        Math.min(0.99, baseRetention * Math.exp(-bucket / 180))
      ).toFixed(3)
    ),
  }));
  const intervalDistributionMap = new Map<number, number>();
  for (const row of scheduling) {
    const days = Math.max(0, Math.round(row.scheduledDays));
    intervalDistributionMap.set(
      days,
      (intervalDistributionMap.get(days) ?? 0) + 1
    );
  }
  const intervalDistribution = [...intervalDistributionMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([days, count]) => ({ days, count }));
  const easeDistribution: StudyStatsSnapshot['easeDistribution'] = [
    1, 2, 3, 4,
  ].map(grade => ({
    grade: grade as ReviewGrade,
    count: logs.filter(log => log.grade === grade).length,
  }));
  const workloadForecast = Array.from({ length: 7 }, (_, dayOffset) => {
    const start = now + dayOffset * 86_400_000;
    const end = start + 86_400_000;
    return {
      dayOffset,
      dueCount: scheduling.filter(row => row.due >= start && row.due < end)
        .length,
    };
  });
  return {
    retentionCurve,
    intervalDistribution,
    easeDistribution,
    workloadForecast,
    leechCount: scheduling.filter(row => row.leech).length,
    lapseCount: scheduling.reduce((sum, row) => sum + row.lapses, 0),
  };
}
