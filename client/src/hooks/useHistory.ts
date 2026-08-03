import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { HistoryEntry, Feeling } from '../types';

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    api.getHistory().then(setEntries).catch(() => setEntries([]));
  }, []);

  const addEntry = useCallback(async (data: { feeling: Feeling; text: string; cycles: number; drillSessions: number }) => {
    const entry = await api.addHistory(data);
    setEntries((prev) => [entry, ...prev]);
  }, []);

  const deleteEntry = useCallback(async (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    try {
      await api.deleteHistory(id);
    } catch (e) {
      console.error('Failed to delete entry', e);
    }
  }, []);

  return { entries, addEntry, deleteEntry };
}
