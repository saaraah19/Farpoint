import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReminderSettings } from '../types';

export type ToastKind = 'hydration' | 'drops' | null;

function beep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 440;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // ignore
  }
}

interface UseReminderTimersOptions {
  settings: ReminderSettings;
  onHydrationDone: () => void;
  onDropsDone: () => void;
}

export function useReminderTimers({ settings, onHydrationDone, onDropsDone }: UseReminderTimersOptions) {
  const [hydrationRemaining, setHydrationRemaining] = useState(settings.hydrationMinutes * 60);
  const [dropsRemaining, setDropsRemaining] = useState(settings.dropsMinutes * 60);
  const [toastKind, setToastKind] = useState<ToastKind>(null);
  const autoHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const initedRef = useRef(false);

  // Only resync remaining time from settings once on load (or when minutes change while idle).
  useEffect(() => {
    if (!initedRef.current) {
      setHydrationRemaining(settings.hydrationMinutes * 60);
      setDropsRemaining(settings.dropsMinutes * 60);
      initedRef.current = true;
    }
  }, [settings.hydrationMinutes, settings.dropsMinutes]);

  const showToast = useCallback((kind: ToastKind) => {
    setToastKind(kind);
    beep();
    if (autoHideRef.current) clearTimeout(autoHideRef.current);
    autoHideRef.current = setTimeout(() => setToastKind(null), 30000);
  }, []);

  const hideToast = useCallback(() => {
    setToastKind(null);
    if (autoHideRef.current) clearTimeout(autoHideRef.current);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const s = settingsRef.current;
      setToastKind((currentToast) => {
        if (currentToast) return currentToast; // don't tick down while a toast is showing
        if (s.hydrationEnabled) {
          setHydrationRemaining((r) => {
            if (r <= 1) {
              showToast('hydration');
              return 0;
            }
            return r - 1;
          });
        }
        if (s.dropsEnabled) {
          setDropsRemaining((r) => {
            if (r <= 1) {
              showToast('drops');
              return 0;
            }
            return r - 1;
          });
        }
        return currentToast;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [showToast]);

  const markDone = useCallback(() => {
    if (toastKind === 'hydration') {
      setHydrationRemaining(settingsRef.current.hydrationMinutes * 60);
      onHydrationDone();
    } else if (toastKind === 'drops') {
      setDropsRemaining(settingsRef.current.dropsMinutes * 60);
      onDropsDone();
    }
    hideToast();
  }, [toastKind, onHydrationDone, onDropsDone, hideToast]);

  const snooze = useCallback(() => {
    if (toastKind === 'hydration') setHydrationRemaining(5 * 60);
    else if (toastKind === 'drops') setDropsRemaining(5 * 60);
    hideToast();
  }, [toastKind, hideToast]);

  return { hydrationRemaining, dropsRemaining, toastKind, markDone, snooze };
}
