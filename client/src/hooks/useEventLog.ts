import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { EventEntry, EventKind } from '../types';

export function useEventLog(kind: EventKind) {
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const rows = await api.getEvents(kind);
      setEvents(rows);
    } finally {
      setLoaded(true);
    }
  }, [kind]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(async () => {
    const entry = await api.addEvent(kind);
    setEvents((prev) => [...prev, entry]);
  }, [kind]);

  const remove = useCallback(async (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    await api.deleteEvent(id);
  }, []);

  return { events, loaded, add, remove, refresh };
}
