import type { DailyStats } from '../types';
import { DRILL_GOAL_SESSIONS } from '../hooks/useDrill';

interface ComplianceHeatmapProps {
  history: DailyStats[];
}

function levelFor(day: DailyStats): 0 | 1 | 2 {
  const sessionGoalMet = day.targetSessions > 0 && day.cyclesToday >= day.targetSessions;
  const drillGoalMet = day.drillSessionsToday >= DRILL_GOAL_SESSIONS;
  if (sessionGoalMet || drillGoalMet) return 2;
  if (day.cyclesToday > 0 || day.drillSessionsToday > 0 || day.hydrationCount > 0 || day.dropsCount > 0) return 1;
  return 0;
}

function fmtDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function ComplianceHeatmap({ history }: ComplianceHeatmapProps) {
  if (history.length === 0) {
    return (
      <details>
        <summary>🐾 Compliance heatmap</summary>
        <div className="details-body">
          <p className="hint">Once you've used Farpoint for a few days, a little map of your consistency shows up here.</p>
        </div>
      </details>
    );
  }

  const metDays = history.filter((d) => levelFor(d) === 2).length;

  return (
    <details open>
      <summary>🐾 Compliance heatmap</summary>
      <div className="details-body">
        <p className="hint">
          One paw per day, most recent on the right. Full paw = goal day ({DRILL_GOAL_SESSIONS} eye-pushup sessions or
          your session target). {metDays} of the last {history.length} days hit that.
        </p>
        <div className="heatmap-grid">
          {history.map((day) => (
            <span
              key={day.date}
              className={`heatmap-cell level-${levelFor(day)}`}
              title={`${fmtDateLabel(day.date)} — ${day.cyclesToday} sessions, ${day.drillSessionsToday}/${DRILL_GOAL_SESSIONS} eye-pushup sets`}
            >
              🐾
            </span>
          ))}
        </div>
        <div className="heatmap-legend">
          <span><i className="heatmap-cell level-0" /> nothing logged</span>
          <span><i className="heatmap-cell level-1" /> some activity</span>
          <span><i className="heatmap-cell level-2" /> goal hit</span>
        </div>
      </div>
    </details>
  );
}
