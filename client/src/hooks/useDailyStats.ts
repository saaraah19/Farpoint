import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { DailyStats } from '../types';

const EMPTY: DailyStats = {
  date: '',
  cyclesToday: 0,
  drillSessionsToday: 0,
  hydrationCount: 0,
  dropsCount: 0,
  currentTask: '',
  targetSessions: 0,
  blinkCount: 0,
};

export function useDailyStats() {
  const [stats, setStats] = useState<DailyStats>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.getDaily().then((d) => {
      setStats(d);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const update = useCallback((patch: Partial<DailyStats>) => {
    setStats((prev) => {
      const next = { ...prev, ...patch };
      api.saveDaily(next).catch((e) => console.error('Failed to save daily stats', e));
      return next;
    });
  }, []);

  return { stats, update, loaded };
}
