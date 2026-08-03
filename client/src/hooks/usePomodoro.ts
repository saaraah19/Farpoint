import { useCallback, useEffect, useRef, useState } from 'react';
import type { Phase, PomodoroSettings } from '../types';
import { playPhaseSound } from '../sound';

function phaseSeconds(phase: Phase, settings: PomodoroSettings): number {
  if (phase === 'work') return settings.workMin * 60;
  if (phase === 'break') return settings.breakSec;
  return settings.longBreakMin * 60;
}

interface UsePomodoroOptions {
  settings: PomodoroSettings;
  onWorkComplete: () => void;
}

export function usePomodoro({ settings, onWorkComplete }: UsePomodoroOptions) {
  const [phase, setPhase] = useState<Phase>('work');
  const [remaining, setRemaining] = useState(() => phaseSeconds('work', settings));
  const [running, setRunning] = useState(false);
  const [cycle, setCycle] = useState(1);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const onWorkCompleteRef = useRef(onWorkComplete);
  onWorkCompleteRef.current = onWorkComplete;

  // Keep remaining in sync with settings changes while paused.
  useEffect(() => {
    if (!running) setRemaining(phaseSeconds(phase, settings));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.workMin, settings.breakSec, settings.longBreakMin]);

  const advancePhase = useCallback(() => {
    setPhase((prevPhase) => {
      const s = settingsRef.current;
      if (prevPhase === 'work') {
        if (s.soundEnabled) playPhaseSound(s.soundStyle, true);
        onWorkCompleteRef.current();
        const nextPhase: Phase = cycle % s.cyclesBeforeLong === 0 ? 'long' : 'break';
        setRemaining(phaseSeconds(nextPhase, s));
        return nextPhase;
      } else {
        if (s.soundEnabled) playPhaseSound(s.soundStyle, false);
        setCycle((c) => c + 1);
        setRemaining(phaseSeconds('work', s));
        return 'work';
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          advancePhase();
          return r; // advancePhase sets the real value
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, advancePhase]);

  const toggleRunning = useCallback(() => setRunning((r) => !r), []);

  const skip = useCallback(() => advancePhase(), [advancePhase]);

  const reset = useCallback(() => {
    setRunning(false);
    setPhase('work');
    setCycle(1);
    setRemaining(phaseSeconds('work', settingsRef.current));
  }, []);

  const total = phaseSeconds(phase, settings);
  const fraction = total > 0 ? remaining / total : 0;

  return { phase, remaining, running, cycle, total, fraction, toggleRunning, skip, reset };
}
