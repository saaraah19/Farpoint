import { useDrill, DRILL_GOAL_REPS, DRILL_GOAL_SESSIONS } from '../hooks/useDrill';
import CatMascot from './CatMascot';

interface DrillCardProps {
  drillSessionsToday: number;
  onSessionComplete: () => void;
}

export default function DrillCard({ drillSessionsToday, onSessionComplete }: DrillCardProps) {
  const { running, reps, dotAt, justCompleted, start, stop } = useDrill({ onSessionComplete });

  const sessionsDone = Math.min(drillSessionsToday, DRILL_GOAL_SESSIONS);

  let instruction = "Hold a pencil or your thumb at arm's length. Press start, then follow the dot with your eyes only — don't turn your head.";
  if (running) {
    instruction = dotAt === 'far'
      ? 'Shift your focus to the far point across the room. Hold for a moment.'
      : "Bring your focus back to the near point. If it doubles, pause and try to merge it into one before continuing.";
  } else if (justCompleted) {
    instruction = `Session complete — ${DRILL_GOAL_REPS} reps done. ` +
      (sessionsDone >= DRILL_GOAL_SESSIONS ? 'Both sessions done for today, nice work! 🐾' : 'One more session later today to hit your goal.');
  }

  return (
    <div className="card">
      <div className="drill-header">
        <h2>Eye pushups</h2>
        <CatMascot mood={running ? 'focus' : justCompleted ? 'happy' : 'idle'} size={40} />
      </div>
      <p className="drill-goal">
        Goal: {DRILL_GOAL_REPS} reps per session · {DRILL_GOAL_SESSIONS} sessions/day — {sessionsDone}/{DRILL_GOAL_SESSIONS} done today
      </p>

      <div className="paw-track" aria-label={`${reps} of ${DRILL_GOAL_REPS} reps`}>
        {Array.from({ length: DRILL_GOAL_REPS }, (_, i) => (
          <span key={i} className={`paw-dot ${i < reps ? 'filled' : ''}`}>🐾</span>
        ))}
      </div>

      <div className="drill-stage">
        <div className="drill-track" />
        <div
          className="drill-dot"
          style={{
            left: dotAt === 'far' ? '90%' : '10%',
            background: dotAt === 'far' ? 'var(--far)' : 'var(--near)',
            boxShadow: `0 0 0 6px ${dotAt === 'far' ? 'var(--far-dim)' : 'var(--near-dim)'}`,
            width: dotAt === 'far' ? '16px' : '26px',
            height: dotAt === 'far' ? '16px' : '26px',
          }}
        />
      </div>
      <div className="drill-labels">
        <span>Near — arm's length</span>
        <span>Far — across the room</span>
      </div>
      <p className="drill-instruction">{instruction}</p>
      <div className="drill-controls">
        {!running ? (
          <button className="primary" onClick={start}>Start drill</button>
        ) : (
          <button className="ghost" onClick={stop}>Stop</button>
        )}
        <span className="drill-count">{reps} / {DRILL_GOAL_REPS} reps</span>
      </div>
    </div>
  );
}
