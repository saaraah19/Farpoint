import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { DailyStats } from '../types';

export function useDailyHistory(days = 84) {
  const [history, setHistory] = useState<DailyStats[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    api.getDailyHistory(days).then((rows) => {
      setHistory(rows);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [days]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { history, loaded, refresh };
}
