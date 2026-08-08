import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { Phase, PomodoroSettings } from '../types';
import { playPhaseSound } from '../sound';
import { notify } from '../notifications';

function phaseSeconds(phase: Phase, settings: PomodoroSettings): number {
  if (phase === 'work') return settings.workMin * 60;
  if (phase === 'break') return settings.breakSec;
  return settings.longBreakMin * 60;
}

interface CoreState {
  phase: Phase;
  cycle: number;
}

// Pure — one phase step forward. No side effects live here.
function advanceCore(core: CoreState, settings: PomodoroSettings): CoreState {
  if (core.phase === 'work') {
    const nextPhase: Phase = core.cycle % settings.cyclesBeforeLong === 0 ? 'long' : 'break';
    return { phase: nextPhase, cycle: core.cycle };
  }
  return { phase: 'work', cycle: core.cycle + 1 };
}

interface State extends CoreState {
  running: boolean;
  remaining: number; // seconds left in the current phase, for display
  endAt: number | null; // epoch ms the current phase ends at, set while running
  // Work-phase completions counted since the last flush. Usually 0 or 1, but
  // can be >1 if the tab was backgrounded/throttled long enough that real
  // wall-clock time crossed more than one phase boundary before we next got
  // a chance to check — see TICK below.
  pendingWorkCompletions: number;
}

type Action =
  | { type: 'TICK'; settings: PomodoroSettings; now: number }
  | { type: 'SKIP'; settings: PomodoroSettings; now: number }
  | { type: 'TOGGLE'; now: number }
  | { type: 'RESET'; settings: PomodoroSettings }
  | { type: 'SYNC_REMAINING'; settings: PomodoroSettings }
  | { type: 'FLUSH_COMPLETIONS' };

// Recomputes remaining/phase/cycle from real elapsed time rather than from
// "one tick = one second". Background tabs get their timers throttled by the
// browser (Chrome can drop to ~1 firing/minute after ~5 min backgrounded) —
// counting ticks under-counts elapsed time; comparing against a fixed end
// timestamp doesn't, no matter how delayed the tick that notices it was.
function syncToNow(state: State, settings: PomodoroSettings, now: number): State {
  if (!state.running || state.endAt === null) return state;

  if (now < state.endAt) {
    const remaining = Math.max(0, Math.ceil((state.endAt - now) / 1000));
    return remaining === state.remaining ? state : { ...state, remaining };
  }

  // One or more whole phases elapsed while we weren't watching. Walk forward
  // through them using their real durations so cycle/phase land correctly,
  // capped generously so it can't spin forever on a pathological setting.
  let core: CoreState = { phase: state.phase, cycle: state.cycle };
  let endAt = state.endAt;
  let pending = state.pendingWorkCompletions;
  let iterations = 0;
  while (endAt <= now && iterations < 500) {
    if (core.phase === 'work') pending += 1;
    core = advanceCore(core, settings);
    endAt += phaseSeconds(core.phase, settings) * 1000;
    iterations++;
  }
  const remaining = Math.max(0, Math.ceil((endAt - now) / 1000));
  return { ...state, phase: core.phase, cycle: core.cycle, endAt, remaining, pendingWorkCompletions: pending };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'TICK':
      return syncToNow(state, action.settings, action.now);

    case 'SKIP': {
      const wasWork = state.phase === 'work';
      const core = advanceCore({ phase: state.phase, cycle: state.cycle }, action.settings);
      const durationMs = phaseSeconds(core.phase, action.settings) * 1000;
      return {
        ...state,
        phase: core.phase,
        cycle: core.cycle,
        remaining: Math.ceil(durationMs / 1000),
        endAt: state.running ? action.now + durationMs : null,
        pendingWorkCompletions: state.pendingWorkCompletions + (wasWork ? 1 : 0),
      };
    }

    case 'TOGGLE': {
      if (state.running) {
        // Pausing: freeze remaining as a plain number, drop the end timestamp.
        const remaining = state.endAt !== null ? Math.max(0, Math.ceil((state.endAt - action.now) / 1000)) : state.remaining;
        return { ...state, running: false, remaining, endAt: null };
      }
      // Resuming: anchor a fresh end timestamp to *now* based on remaining.
      return { ...state, running: true, endAt: action.now + state.remaining * 1000 };
    }

    case 'RESET':
      return {
        phase: 'work',
        cycle: 1,
        running: false,
        remaining: phaseSeconds('work', action.settings),
        endAt: null,
        pendingWorkCompletions: 0,
      };

    case 'SYNC_REMAINING':
      return state.running ? state : { ...state, remaining: phaseSeconds(state.phase, action.settings) };

    case 'FLUSH_COMPLETIONS':
      return state.pendingWorkCompletions === 0 ? state : { ...state, pendingWorkCompletions: 0 };

    default:
      return state;
  }
}

function initState(settings: PomodoroSettings): State {
  return { phase: 'work', cycle: 1, running: false, remaining: phaseSeconds('work', settings), endAt: null, pendingWorkCompletions: 0 };
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

  const tick = useCallback(() => {
    dispatch({ type: 'TICK', settings: settingsRef.current, now: Date.now() });
  }, []);

  // Keep remaining in sync with settings changes while paused.
  useEffect(() => {
    dispatch({ type: 'SYNC_REMAINING', settings: settingsRef.current });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.workMin, settings.breakSec, settings.longBreakMin]);

  // The ticker: while the tab is foregrounded this fires every second as
  // before, purely for a smooth display. While backgrounded the browser may
  // throttle it heavily — that's fine now, since every tick (however late)
  // recomputes from real elapsed time rather than assuming 1s passed.
  useEffect(() => {
    if (!state.running) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state.running, tick]);

  // Resync the instant the tab becomes visible/focused again, so returning
  // from another tab shows the correct remaining time immediately instead of
  // waiting for the next (possibly throttled) interval tick.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') tick();
    }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', tick);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', tick);
    };
  }, [tick]);

  // Side effects (sound/notification) live here, keyed off the phase that's
  // actually displayed — fires once per commit where it changed. If a
  // backgrounded tab jumped through several phases at once, this represents
  // "welcome back, here's where you are now" rather than replaying every
  // skipped transition, which would just be notification spam.
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
    } else {
      if (s.soundEnabled) playPhaseSound(s.soundStyle, false);
      if (s.notificationsEnabled) {
        notify('Ready to focus? 🐾', { body: "Break's over — back to your next session whenever you are.", tag: 'farpoint-phase' });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  // Crediting completed work sessions is handled separately from the sound
  // effect above so it stays correct even across a multi-phase catch-up
  // jump (e.g. a long background stretch) — every real work completion gets
  // counted exactly once, regardless of how many phases landed in one sync.
  useEffect(() => {
    if (state.pendingWorkCompletions === 0) return;
    for (let i = 0; i < state.pendingWorkCompletions; i++) onWorkCompleteRef.current();
    dispatch({ type: 'FLUSH_COMPLETIONS' });
  }, [state.pendingWorkCompletions]);

  const toggleRunning = useCallback(() => dispatch({ type: 'TOGGLE', now: Date.now() }), []);
  const skip = useCallback(() => dispatch({ type: 'SKIP', settings: settingsRef.current, now: Date.now() }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET', settings: settingsRef.current }), []);

  const total = phaseSeconds(state.phase, settings);
  const fraction = total > 0 ? state.remaining / total : 0;

  return { phase: state.phase, remaining: state.remaining, running: state.running, cycle: state.cycle, total, fraction, toggleRunning, skip, reset };
}
