import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { ReminderSettings, PomodoroSettings } from '../types';

const DEFAULT_REMINDERS: ReminderSettings = {
  hydrationEnabled: true,
  hydrationMinutes: 45,
  dropsEnabled: true,
  dropsMinutes: 120,
};

const DEFAULT_POMODORO: PomodoroSettings = {
  workMin: 20,
  breakSec: 20,
  cyclesBeforeLong: 3,
  longBreakMin: 5,
  soundEnabled: true,
  soundStyle: 'chime',
  notificationsEnabled: false,
  purrEnabled: false,
};

export function useReminderSettings() {
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_REMINDERS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.getReminderSettings().then((s) => { setSettings(s); setLoaded(true); }).catch(() => setLoaded(true));
  }, []);

  const update = useCallback((patch: Partial<ReminderSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      api.saveReminderSettings(next).catch((e) => console.error('Failed to save reminder settings', e));
      return next;
    });
  }, []);

  return { settings, update, loaded };
}

export function usePomodoroSettings() {
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_POMODORO);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.getPomodoroSettings().then((s) => { setSettings(s); setLoaded(true); }).catch(() => setLoaded(true));
  }, []);

  const update = useCallback((patch: Partial<PomodoroSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      api.savePomodoroSettings(next).catch((e) => console.error('Failed to save pomodoro settings', e));
      return next;
    });
  }, []);

  return { settings, update, loaded };
}
