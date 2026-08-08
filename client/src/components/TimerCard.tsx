import type { Phase, PomodoroSettings } from '../types';
import { fmtClock } from '../utils';
import CatMascot from './CatMascot';
import type { CatMood } from './CatMascot';
import { useNotificationPermission } from '../hooks/useNotificationPermission';

const RING_CIRC = 628;

const PHASE_META: Record<Phase, { label: string; color: string; mood: CatMood }> = {
  work: { label: 'Focus', color: 'var(--near)', mood: 'focus' },
  break: { label: 'Look away', color: 'var(--far)', mood: 'rest' },
  long: { label: 'Long break', color: 'var(--amber)', mood: 'sleepy' },
};

const WORK_HINT = 'Work session running. When it ends, look at something 20+ feet away.';

// A few different break prompts so it doesn't feel like the same dead-air
// message every time — rotates by cycle number, deterministic (no extra
// state needed) so it stays stable while the phase is shown.
const BREAK_HINTS = [
  'Look at something 20+ feet away. Let your eyes relax fully — no screen.',
  "Whiskers suggests: roll your shoulders back a few times. 🐾",
  'Blink slowly a few times — screen focus cuts your blink rate way down.',
  'Stand up if you can, even just for these seconds.',
  'Find the farthest point you can see and hold your gaze there.',
];
const LONG_BREAK_HINTS = [
  'Longer break. Stand up, walk around, get your eyes off near focus entirely.',
  'Good time for water, a stretch, or a lap around the room. 🐾',
  'Step away from the desk if you can — let your whole body reset, not just your eyes.',
  'A proper break: hydrate, stretch, and give your eyes a real rest from near focus.',
];

function hintFor(phase: Phase, cycle: number): string {
  if (phase === 'work') return WORK_HINT;
  const pool = phase === 'break' ? BREAK_HINTS : LONG_BREAK_HINTS;
  return pool[cycle % pool.length];
}

// The last stretch of any phase gets a gentle pulse as a heads-up before the
// transition, scaled to the phase length so a 20s break doesn't spend its
// entire duration pulsing.
function warningThreshold(totalSeconds: number): number {
  return Math.min(15, Math.max(3, Math.floor(totalSeconds * 0.15)));
}

interface TimerCardProps {
  phase: Phase;
  remaining: number;
  total: number;
  fraction: number;
  running: boolean;
  cycle: number;
  cyclesToday: number;
  targetSessions: number;
  zenMode: boolean;
  onToggle: () => void;
  onSkip: () => void;
  onReset: () => void;
  onLogSession: () => void;
  onToggleZen: () => void;
}

export default function TimerCard({
  phase, remaining, total, fraction, running, cycle, cyclesToday, targetSessions, zenMode,
  onToggle, onSkip, onReset, onLogSession, onToggleZen,
}: TimerCardProps) {
  const meta = PHASE_META[phase];
  const dashoffset = RING_CIRC * (1 - fraction);
  const mood: CatMood = running ? meta.mood : 'idle';
  const isWarning = running && remaining > 0 && remaining <= warningThreshold(total);

  return (
    <div className="card timer-card">
      <button type="button" className="ghost small zen-toggle" onClick={onToggleZen}>
        {zenMode ? '✕ Exit zen' : '🧘 Zen mode'}
      </button>
      <div className="timer-wrap">
        {!zenMode && <CatMascot mood={mood} size={56} className="timer-cat" />}
        <div className={`ring-box ${isWarning ? 'ring-warning' : ''}`}>
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
        {!zenMode && <p className="phase-hint">{hintFor(phase, cycle)}</p>}
        <div className="controls">
          <button className="primary" onClick={onToggle}>{running ? 'Pause' : 'Start'}</button>
          <button className="ghost" onClick={onSkip}>Skip phase</button>
          <button className="ghost" onClick={onReset}>Reset</button>
        </div>
        {!zenMode && phase === 'long' && (
          <div className="log-banner show">
            <span>Long break — a good point to log this session.</span>
            <button className="small primary" onClick={onLogSession}>Log this session</button>
          </div>
        )}
        {!zenMode && (
          <div className="meta-row">
            <span>Cycle {cycle}</span>
            <span>
              {cyclesToday} {cyclesToday === 1 ? 'session' : 'sessions'} today
              {targetSessions > 0 ? ` · goal ${Math.min(cyclesToday, targetSessions)}/${targetSessions}` : ''}
            </span>
          </div>
        )}
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
        <div className="field-row">
          <span>Sound style</span>
          <div className="sound-style-picker">
            <button
              type="button"
              className={`chip ${settings.soundStyle === 'chime' ? 'active' : ''}`}
              onClick={() => onChange({ soundStyle: 'chime' })}
            >
              🔔 Chime
            </button>
            <button
              type="button"
              className={`chip ${settings.soundStyle === 'meow' ? 'active' : ''}`}
              onClick={() => onChange({ soundStyle: 'meow' })}
            >
              🐱 Meow
            </button>
          </div>
        </div>
        <div className="field-row">
          <span>Purr while focusing</span>
          <input type="checkbox" style={{ width: 'auto' }} checked={settings.purrEnabled}
            onChange={(e) => onChange({ purrEnabled: e.target.checked })} />
        </div>
        <p className="hint">A very soft looping purr plays in the background during work sessions only.</p>
        <NotificationSettingsRow settings={settings} onChange={onChange} />
      </div>
    </details>
  );
}

function NotificationSettingsRow({ settings, onChange }: TimingSettingsProps) {
  const { supported, permission, request } = useNotificationPermission();

  async function handleToggle(checked: boolean) {
    onChange({ notificationsEnabled: checked });
    if (checked && permission === 'default') await request();
  }

  return (
    <>
      <div className="field-row">
        <span>Browser notifications</span>
        <input
          type="checkbox" style={{ width: 'auto' }}
          checked={settings.notificationsEnabled}
          disabled={!supported}
          onChange={(e) => handleToggle(e.target.checked)}
        />
      </div>
      {!supported && (
        <p className="hint">Your browser doesn't support notifications.</p>
      )}
      {supported && settings.notificationsEnabled && permission === 'default' && (
        <p className="hint">
          Farpoint needs permission to notify you. <button type="button" className="small chip" onClick={() => request()}>Allow notifications</button>
        </p>
      )}
      {supported && settings.notificationsEnabled && permission === 'denied' && (
        <p className="hint">Blocked by your browser — enable notifications for this site in your browser's site settings.</p>
      )}
      {supported && settings.notificationsEnabled && permission === 'granted' && (
        <p className="hint">On — you'll get a system notification for phase changes and reminders when this tab isn't in view. 🐾</p>
      )}
    </>
  );
}
