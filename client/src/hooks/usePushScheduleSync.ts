import { useEffect, useRef } from 'react';
import { schedulePush } from '../push';
import type { Phase, ReminderSettings } from '../types';

const SYNC_INTERVAL_MS = 25000;

const PHASE_PUSH_COPY: Record<Phase, { title: string; body: string }> = {
  work: { title: 'Time to look away 🐾', body: 'Focus session done — find something 20+ feet away.' },
  break: { title: 'Ready to focus? 🐾', body: "Break's over — back to your next session whenever you are." },
  long: { title: 'Ready to focus? 🐾', body: "Long break's over — back to your next session whenever you are." },
};

interface UsePushScheduleSyncOptions {
  enabled: boolean;
  pomodoroRunning: boolean;
  pomodoroPhase: Phase;
  pomodoroRemaining: number;
  reminderSettings: ReminderSettings;
  hydrationRemaining: number;
  dropsRemaining: number;
  blinkRemaining: number;
}

/**
 * Push works even with every browser tab closed, but only for whatever the
 * server was last told to expect. This hook is what keeps that up to date:
 * every ~25s (and immediately on meaningful state changes like pausing or
 * toggling a reminder), it reports the next absolute fire time for each of
 * phase/hydration/drops/blink, or clears it if that thing is currently
 * paused/disabled. Coarse granularity is fine — being off by up to ~25s
 * doesn't matter for a "did you forget to take a break" nudge.
 *
 * The "remaining" numbers are read from refs (updated every render) rather
 * than closed over directly, so the interval always sends the current
 * value instead of whatever it was when the interval was created — the
 * interval itself is only re-created when the *structural* things (enabled,
 * running, phase, which reminders are on) change, not every second.
 */
export function usePushScheduleSync({
  enabled, pomodoroRunning, pomodoroPhase, pomodoroRemaining,
  reminderSettings, hydrationRemaining, dropsRemaining, blinkRemaining,
}: UsePushScheduleSyncOptions) {
  const remainingRef = useRef({ pomodoroRemaining, hydrationRemaining, dropsRemaining, blinkRemaining });
  remainingRef.current = { pomodoroRemaining, hydrationRemaining, dropsRemaining, blinkRemaining };

  useEffect(() => {
    if (!enabled) return;

    function sync() {
      const now = Date.now();
      const r = remainingRef.current;

      if (pomodoroRunning) {
        const copy = PHASE_PUSH_COPY[pomodoroPhase];
        schedulePush('phase', now + r.pomodoroRemaining * 1000, copy.title, copy.body);
      } else {
        schedulePush('phase', null);
      }

      if (reminderSettings.hydrationEnabled) {
        schedulePush('hydration', now + r.hydrationRemaining * 1000, 'Hydration check 💧🐾', 'Time for some water.');
      } else {
        schedulePush('hydration', null);
      }

      if (reminderSettings.dropsEnabled) {
        schedulePush('drops', now + r.dropsRemaining * 1000, 'Eye drops 💧🐾', 'Time for your eye drops.');
      } else {
        schedulePush('drops', null);
      }

      if (reminderSettings.blinkEnabled) {
        schedulePush('blink', now + r.blinkRemaining * 1000, 'Blink check 🐾', 'A few slow, deliberate blinks.');
      } else {
        schedulePush('blink', null);
      }
    }

    sync();
    const id = setInterval(sync, SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [
    enabled, pomodoroRunning, pomodoroPhase,
    reminderSettings.hydrationEnabled, reminderSettings.dropsEnabled, reminderSettings.blinkEnabled,
  ]);
}
