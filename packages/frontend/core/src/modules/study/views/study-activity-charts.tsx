import type { StudyActivitySnapshot } from '@affine/core/modules/study/utils/study-activity';
import { i18nTime } from '@affine/i18n';
import { cssVar } from '@toeverything/theme';
import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from 'recharts';

import * as styles from './styles.css';

type ActivityChartPoint = {
  x: number;
  date: string;
  count: number;
};

function toChartPoints(
  series: StudyActivitySnapshot['createdByDay']
): ActivityChartPoint[] {
  return series.map((point, index) => ({
    x: index,
    date: point.date,
    count: point.count,
  }));
}

function formatChartDate(value: string) {
  return i18nTime(value, { absolute: { accuracy: 'day' } });
}

function ActivityChartTooltip({
  active,
  payload,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) {
    return null;
  }
  const point = payload[0]?.payload as ActivityChartPoint | undefined;
  if (!point) {
    return null;
  }
  const count =
    typeof payload[0]?.value === 'number'
      ? payload[0].value
      : Number(payload[0]?.value ?? 0);

  return (
    <div className={styles.conceptCard}>
      <div className={styles.conceptTitle}>{formatChartDate(point.date)}</div>
      <div className={styles.conceptMeta}>
        {count} {count === 1 ? 'card' : 'cards'}
      </div>
    </div>
  );
}

function StudyActivityLineChart({
  title,
  points,
  strokeColor,
}: {
  title: string;
  points: ActivityChartPoint[];
  strokeColor: string;
}) {
  const chartPoints = useMemo(() => {
    if (points.length !== 1) {
      return points;
    }
    return [
      points[0],
      {
        ...points[0],
        x: points[0].x + 1,
      },
    ];
  }, [points]);

  return (
    <div className={styles.activityChartBlock}>
      <div className={styles.activityChartTitle}>{title}</div>
      <div className={styles.activityChartContainer}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartPoints}
            margin={{ top: 10, right: 6, bottom: 6, left: 6 }}
          >
            <CartesianGrid
              vertical={false}
              stroke={cssVar('borderColor')}
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="x"
              type="number"
              hide
              allowDecimals={false}
              domain={['dataMin', 'dataMax']}
            />
            <YAxis
              hide
              allowDecimals={false}
              domain={[
                0,
                (max: number) => {
                  if (max <= 0) {
                    return 1;
                  }
                  return Math.ceil(max * 1.1);
                },
              ]}
            />
            <RechartsTooltip
              cursor={{
                stroke: cssVar('borderColor'),
                strokeDasharray: '4 4',
              }}
              content={<ActivityChartTooltip />}
            />
            <Line
              dataKey="count"
              type="monotone"
              stroke={strokeColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {chartPoints.length ? (
        <div className={styles.activityChartAxis}>
          <span>{formatChartDate(chartPoints[0].date)}</span>
          <span>
            {formatChartDate(chartPoints[chartPoints.length - 1].date)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export const StudyActivityCharts = ({
  snapshot,
}: {
  snapshot: StudyActivitySnapshot;
}) => {
  const createdPoints = useMemo(
    () => toChartPoints(snapshot.createdByDay),
    [snapshot.createdByDay]
  );
  const reviewedPoints = useMemo(
    () => toChartPoints(snapshot.reviewedByDay),
    [snapshot.reviewedByDay]
  );

  return (
    <div className={styles.formCard}>
      <div className={styles.formTitle}>How you are doing</div>
      <div className={styles.heroSub}>Last {snapshot.windowDays} days</div>
      <div className={styles.activityChartsGrid}>
        <StudyActivityLineChart
          title="Cards created"
          points={createdPoints}
          strokeColor={cssVar('primaryColor')}
        />
        <StudyActivityLineChart
          title="Cards reviewed"
          points={reviewedPoints}
          strokeColor={cssVar('processingColor')}
        />
      </div>
    </div>
  );
};
