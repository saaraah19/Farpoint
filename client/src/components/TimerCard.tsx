import type { Phase, PomodoroSettings } from '../types';
import { fmtClock } from '../utils';

const RING_CIRC = 628;

const PHASE_META: Record<Phase, { label: string; color: string; hint: string }> = {
  work: { label: 'Focus', color: 'var(--near)', hint: 'Work session running. When it ends, look at something 20+ feet away.' },
  break: { label: 'Look away', color: 'var(--far)', hint: 'Look at something 20+ feet away. Let your eyes relax fully — no screen.' },
  long: { label: 'Long break', color: 'var(--amber)', hint: 'Longer break. Stand up, walk around, get your eyes off near focus entirely.' },
};

interface TimerCardProps {
  phase: Phase;
  remaining: number;
  fraction: number;
  running: boolean;
  cycle: number;
  cyclesToday: number;
  onToggle: () => void;
  onSkip: () => void;
  onReset: () => void;
  onLogSession: () => void;
}

export default function TimerCard({
  phase, remaining, fraction, running, cycle, cyclesToday, onToggle, onSkip, onReset, onLogSession,
}: TimerCardProps) {
  const meta = PHASE_META[phase];
  const dashoffset = RING_CIRC * (1 - fraction);

  return (
    <div className="card">
      <div className="timer-wrap">
        <div className="ring-box">
          <svg viewBox="0 0 220 220">
            <circle className="ring-track" cx="110" cy="110" r="100" />
            <circle
              className="ring-progress"
              cx="110" cy="110" r="100"
              stroke={meta.color}
              strokeDasharray={RING_CIRC}
              strokeDashoffset={dashoffset}
            />
          </svg>
          <div className="ring-center">
            <span className="phase-label" style={{ color: meta.color }}>{meta.label}</span>
            <span className="time">{fmtClock(remaining)}</span>
          </div>
        </div>
        <p className="phase-hint">{meta.hint}</p>
        <div className="controls">
          <button className="primary" onClick={onToggle}>{running ? 'Pause' : 'Start'}</button>
          <button className="ghost" onClick={onSkip}>Skip phase</button>
          <button className="ghost" onClick={onReset}>Reset</button>
        </div>
        {phase === 'long' && (
          <div className="log-banner show">
            <span>Long break — a good point to log this session.</span>
            <button className="small primary" onClick={onLogSession}>Log this session</button>
          </div>
        )}
        <div className="meta-row">
          <span>Cycle {cycle}</span>
          <span>{cyclesToday} {cyclesToday === 1 ? 'cycle' : 'cycles'} today</span>
        </div>
      </div>
    </div>
  );
}

interface TimingSettingsProps {
  settings: PomodoroSettings;
  onChange: (patch: Partial<PomodoroSettings>) => void;
}

export function TimingSettings({ settings, onChange }: TimingSettingsProps) {
  return (
    <details>
      <summary>Timing settings</summary>
      <div className="details-body">
        <div className="field-row">
          <span>Work session (minutes)</span>
          <input type="number" min={1} max={90} value={settings.workMin}
            onChange={(e) => onChange({ workMin: parseInt(e.target.value) || 20 })} />
        </div>
        <div className="field-row">
          <span>Look-away break (seconds)</span>
          <input type="number" min={10} max={120} value={settings.breakSec}
            onChange={(e) => onChange({ breakSec: parseInt(e.target.value) || 20 })} />
        </div>
        <div className="field-row">
          <span>Long break every (cycles)</span>
          <input type="number" min={1} max={10} value={settings.cyclesBeforeLong}
            onChange={(e) => onChange({ cyclesBeforeLong: parseInt(e.target.value) || 3 })} />
        </div>
        <div className="field-row">
          <span>Long break (minutes)</span>
          <input type="number" min={1} max={30} value={settings.longBreakMin}
            onChange={(e) => onChange({ longBreakMin: parseInt(e.target.value) || 5 })} />
        </div>
        <div className="field-row">
          <span>Sound cue</span>
          <input type="checkbox" style={{ width: 'auto' }} checked={settings.soundEnabled}
            onChange={(e) => onChange({ soundEnabled: e.target.checked })} />
        </div>
      </div>
    </details>
  );
}
