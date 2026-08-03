import { useCallback, useEffect, useRef, useState } from 'react';

export const DRILL_GOAL_REPS = 20;
export const DRILL_GOAL_SESSIONS = 2;

type DotState = 'near' | 'far';

interface UseDrillOptions {
  onSessionComplete: () => void;
}

export function useDrill({ onSessionComplete }: UseDrillOptions) {
  const [running, setRunning] = useState(false);
  const [reps, setReps] = useState(0);
  const [dotAt, setDotAt] = useState<DotState>('near');
  const [justCompleted, setJustCompleted] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCompleteRef = useRef(onSessionComplete);
  onCompleteRef.current = onSessionComplete;

  const stop = useCallback(() => {
    setRunning(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const start = useCallback(() => {
    setReps(0);
    setJustCompleted(false);
    setDotAt('far');
    setRunning(true);
  }, []);

  useEffect(() => {
    if (!running) return;
    timeoutRef.current = setTimeout(() => {
      setDotAt((prev) => {
        const next: DotState = prev === 'near' ? 'far' : 'near';
        if (next === 'near') {
          setReps((r) => {
            const nextReps = r + 1;
            if (nextReps >= DRILL_GOAL_REPS) {
              setRunning(false);
              setJustCompleted(true);
              onCompleteRef.current();
            }
            return nextReps;
          });
        }
        return next;
      });
    }, 3400);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [running, dotAt]);

  return { running, reps, dotAt, justCompleted, start, stop };
}
