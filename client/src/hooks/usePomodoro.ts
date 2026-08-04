import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { Phase, PomodoroSettings } from '../types';
import { playPhaseSound } from '../sound';
import { notify } from '../notifications';

function phaseSeconds(phase: Phase, settings: PomodoroSettings): number {
  if (phase === 'work') return settings.workMin * 60;
  if (phase === 'break') return settings.breakSec;
  return settings.longBreakMin * 60;
}

interface State {
  phase: Phase;
  remaining: number;
  running: boolean;
  cycle: number;
}

type Action =
  | { type: 'TICK'; settings: PomodoroSettings }
  | { type: 'ADVANCE'; settings: PomodoroSettings }
  | { type: 'TOGGLE' }
  | { type: 'RESET'; settings: PomodoroSettings }
  | { type: 'SYNC_REMAINING'; settings: PomodoroSettings };

// Pure — computes what phase/cycle come next. No side effects (sound,
// notifications, stats updates) live here; those belong in an effect that
// reacts to the resulting state, since reducers/updaters can be invoked more
// than once per action (e.g. React.StrictMode's dev double-invoke check).
function advance(state: State, settings: PomodoroSettings): State {
  if (state.phase === 'work') {
    const nextPhase: Phase = state.cycle % settings.cyclesBeforeLong === 0 ? 'long' : 'break';
    return { ...state, phase: nextPhase, remaining: phaseSeconds(nextPhase, settings) };
  }
  return { ...state, phase: 'work', remaining: phaseSeconds('work', settings), cycle: state.cycle + 1 };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'TICK': {
      if (!state.running) return state;
      if (state.remaining > 1) return { ...state, remaining: state.remaining - 1 };
      return advance(state, action.settings);
    }
    case 'ADVANCE':
      return advance(state, action.settings);
    case 'TOGGLE':
      return { ...state, running: !state.running };
    case 'RESET':
      return { phase: 'work', remaining: phaseSeconds('work', action.settings), running: false, cycle: 1 };
    case 'SYNC_REMAINING':
      return state.running ? state : { ...state, remaining: phaseSeconds(state.phase, action.settings) };
    default:
      return state;
  }
}

function initState(settings: PomodoroSettings): State {
  return { phase: 'work', remaining: phaseSeconds('work', settings), running: false, cycle: 1 };
}

interface UsePomodoroOptions {
  settings: PomodoroSettings;
  onWorkComplete: () => void;
}

export function usePomodoro({ settings, onWorkComplete }: UsePomodoroOptions) {
  const [state, dispatch] = useReducer(reducer, settings, initState);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const onWorkCompleteRef = useRef(onWorkComplete);
  onWorkCompleteRef.current = onWorkComplete;

  // Keep remaining in sync with settings changes while paused.
  useEffect(() => {
    dispatch({ type: 'SYNC_REMAINING', settings: settingsRef.current });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.workMin, settings.breakSec, settings.longBreakMin]);

  // The one-second ticker: purely dispatches, no side effects here.
  useEffect(() => {
    if (!state.running) return;
    const id = setInterval(() => dispatch({ type: 'TICK', settings: settingsRef.current }), 1000);
    return () => clearInterval(id);
  }, [state.running]);

  // Side effects live here, keyed off actual phase transitions — this runs
  // exactly once per real transition, regardless of how many times the
  // reducer itself gets invoked for a given action.
  const prevPhaseRef = useRef(state.phase);
  useEffect(() => {
    if (prevPhaseRef.current === state.phase) return;
    const endedPhase = prevPhaseRef.current;
    prevPhaseRef.current = state.phase;
    const s = settingsRef.current;

    if (endedPhase === 'work') {
      if (s.soundEnabled) playPhaseSound(s.soundStyle, true);
      if (s.notificationsEnabled) {
        notify('Time to look away 🐾', { body: 'Focus session done — find something 20+ feet away.', tag: 'farpoint-phase' });
      }
      onWorkCompleteRef.current();
    } else {
      if (s.soundEnabled) playPhaseSound(s.soundStyle, false);
      if (s.notificationsEnabled) {
        notify('Ready to focus? 🐾', { body: "Break's over — back to your next session whenever you are.", tag: 'farpoint-phase' });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  const toggleRunning = useCallback(() => dispatch({ type: 'TOGGLE' }), []);
  const skip = useCallback(() => dispatch({ type: 'ADVANCE', settings: settingsRef.current }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET', settings: settingsRef.current }), []);

  const total = phaseSeconds(state.phase, settings);
  const fraction = total > 0 ? state.remaining / total : 0;

  return { ...state, total, fraction, toggleRunning, skip, reset };
}
