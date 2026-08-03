import { useEffect, useState } from 'react';

interface PlanCardProps {
  workMin: number;
  targetSessions: number;
  cyclesToday: number;
  onChangeTarget: (target: number) => void;
}

export default function PlanCard({ workMin, targetSessions, cyclesToday, onChangeTarget }: PlanCardProps) {
  // Hours field is derived for display but kept as local text so users can
  // type "1.5" etc. without fighting rounding on every keystroke.
  const [hoursDraft, setHoursDraft] = useState(
    targetSessions > 0 ? String(Math.round(((targetSessions * workMin) / 60) * 4) / 4) : ''
  );

  useEffect(() => {
    setHoursDraft(targetSessions > 0 ? String(Math.round(((targetSessions * workMin) / 60) * 4) / 4) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetSessions]);

  function applyHours(value: string) {
    setHoursDraft(value);
    const hours = parseFloat(value);
    if (!isNaN(hours) && hours > 0) {
      const sessions = Math.max(1, Math.round((hours * 60) / workMin));
      onChangeTarget(sessions);
    }
  }

  function applySessions(value: string) {
    const sessions = parseInt(value, 10);
    if (!isNaN(sessions) && sessions >= 0) {
      onChangeTarget(sessions);
    }
  }

  const impliedHours = targetSessions > 0 ? ((targetSessions * workMin) / 60).toFixed(1) : null;

  return (
    <details className="plan-card">
      <summary>🐾 Plan today's sessions</summary>
      <div className="details-body">
        <p className="hint">
          Tell Farpoint how much time you've got, and it'll split it into {workMin}-minute focus sessions with breaks
          built in — or set the session count directly.
        </p>
        <div className="field-row">
          <span>Hours available today</span>
          <input
            type="number" min={0} step={0.25} max={16}
            placeholder="e.g. 3"
            value={hoursDraft}
            onChange={(e) => applyHours(e.target.value)}
          />
        </div>
        <div className="field-row">
          <span>Target sessions today</span>
          <input
            type="number" min={0} max={30}
            value={targetSessions || ''}
            placeholder="—"
            onChange={(e) => applySessions(e.target.value)}
          />
        </div>
        {targetSessions > 0 && (
          <p className="plan-summary">
            That's about <strong>{targetSessions}</strong> session{targetSessions === 1 ? '' : 's'} (~{impliedHours}h).
            You've done <strong>{Math.min(cyclesToday, targetSessions)}</strong> of them so far today.
          </p>
        )}
      </div>
    </details>
  );
}
