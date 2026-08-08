import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReminderSettings } from '../types';
import { notify } from '../notifications';

export type ToastKind = 'hydration' | 'drops' | 'blink' | null;

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
  notificationsEnabled: boolean;
  onHydrationDone: () => void;
  onDropsDone: () => void;
  onBlinkDone: () => void;
}

export function useReminderTimers({
  settings, notificationsEnabled, onHydrationDone, onDropsDone, onBlinkDone,
}: UseReminderTimersOptions) {
  const [hydrationRemaining, setHydrationRemaining] = useState(settings.hydrationMinutes * 60);
  const [dropsRemaining, setDropsRemaining] = useState(settings.dropsMinutes * 60);
  const [blinkRemaining, setBlinkRemaining] = useState(settings.blinkMinutes * 60);
  const [toastKind, setToastKind] = useState<ToastKind>(null);
  const autoHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const notificationsEnabledRef = useRef(notificationsEnabled);
  notificationsEnabledRef.current = notificationsEnabled;
  const toastKindRef = useRef(toastKind);
  toastKindRef.current = toastKind;
  const initedRef = useRef(false);

  // Only resync remaining time from settings once on load (or when minutes change while idle).
  useEffect(() => {
    if (!initedRef.current) {
      setHydrationRemaining(settings.hydrationMinutes * 60);
      setDropsRemaining(settings.dropsMinutes * 60);
      setBlinkRemaining(settings.blinkMinutes * 60);
      initedRef.current = true;
    }
  }, [settings.hydrationMinutes, settings.dropsMinutes, settings.blinkMinutes]);

  const showToast = useCallback((kind: ToastKind) => {
    setToastKind(kind);
    beep();
    if (notificationsEnabledRef.current) {
      if (kind === 'hydration') notify('Hydration check 💧🐾', { body: 'Time for some water.', tag: 'farpoint-hydration' });
      else if (kind === 'drops') notify('Eye drops 💧🐾', { body: 'Time for your eye drops.', tag: 'farpoint-drops' });
      else if (kind === 'blink') notify('Blink check 🐾', { body: 'A few slow, deliberate blinks.', tag: 'farpoint-blink' });
    }
    if (autoHideRef.current) clearTimeout(autoHideRef.current);
    autoHideRef.current = setTimeout(() => setToastKind(null), 30000);
  }, []);

  const hideToast = useCallback(() => {
    setToastKind(null);
    if (autoHideRef.current) clearTimeout(autoHideRef.current);
  }, []);

  // Plain, pure countdown — one decrement per second, no side effects here.
  // Paused (all timers) while a toast is currently showing, same as before.
  useEffect(() => {
    const id = setInterval(() => {
      if (toastKindRef.current) return;
      const s = settingsRef.current;
      if (s.hydrationEnabled) setHydrationRemaining((r) => Math.max(0, r - 1));
      if (s.dropsEnabled) setDropsRemaining((r) => Math.max(0, r - 1));
      if (s.blinkEnabled) setBlinkRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Side effects: fire exactly once, when a timer actually reaches zero.
  useEffect(() => {
    if (hydrationRemaining <= 0 && !toastKindRef.current) showToast('hydration');
  }, [hydrationRemaining, showToast]);

  useEffect(() => {
    if (dropsRemaining <= 0 && !toastKindRef.current) showToast('drops');
  }, [dropsRemaining, showToast]);

  useEffect(() => {
    if (blinkRemaining <= 0 && !toastKindRef.current) showToast('blink');
  }, [blinkRemaining, showToast]);

  const markDone = useCallback(() => {
    if (toastKind === 'hydration') {
      setHydrationRemaining(settingsRef.current.hydrationMinutes * 60);
      onHydrationDone();
    } else if (toastKind === 'drops') {
      setDropsRemaining(settingsRef.current.dropsMinutes * 60);
      onDropsDone();
    } else if (toastKind === 'blink') {
      setBlinkRemaining(settingsRef.current.blinkMinutes * 60);
      onBlinkDone();
    }
    hideToast();
  }, [toastKind, onHydrationDone, onDropsDone, onBlinkDone, hideToast]);

  const snooze = useCallback(() => {
    if (toastKind === 'hydration') setHydrationRemaining(5 * 60);
    else if (toastKind === 'drops') setDropsRemaining(5 * 60);
    else if (toastKind === 'blink') setBlinkRemaining(2 * 60);
    hideToast();
  }, [toastKind, hideToast]);

  return { hydrationRemaining, dropsRemaining, blinkRemaining, toastKind, markDone, snooze };
}
