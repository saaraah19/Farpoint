import type { DailyStats, HistoryEntry, ReminderSettings, PomodoroSettings, EventEntry, EventKind } from './types';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status} ${url}`);
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  getDaily: () => request<DailyStats>('/api/daily'),
  saveDaily: (patch: Partial<DailyStats>) =>
    request<DailyStats>('/api/daily', { method: 'PUT', body: JSON.stringify(patch) }),

  getDailyHistory: (days = 84) => request<DailyStats[]>(`/api/daily-history?days=${days}`),

  getHistory: () => request<HistoryEntry[]>('/api/history'),
  addHistory: (entry: Pick<HistoryEntry, 'feeling' | 'text' | 'task' | 'cycles' | 'drillSessions'>) =>
    request<HistoryEntry>('/api/history', { method: 'POST', body: JSON.stringify(entry) }),
  deleteHistory: (id: string) =>
    request<void>(`/api/history/${id}`, { method: 'DELETE' }),

  getReminderSettings: () => request<ReminderSettings>('/api/reminder-settings'),
  saveReminderSettings: (settings: ReminderSettings) =>
    request<ReminderSettings>('/api/reminder-settings', { method: 'PUT', body: JSON.stringify(settings) }),

  getPomodoroSettings: () => request<PomodoroSettings>('/api/pomodoro-settings'),
  savePomodoroSettings: (settings: PomodoroSettings) =>
    request<PomodoroSettings>('/api/pomodoro-settings', { method: 'PUT', body: JSON.stringify(settings) }),

  getEvents: (kind?: EventKind, date?: string) => {
    const params = new URLSearchParams();
    if (kind) params.set('kind', kind);
    if (date) params.set('date', date);
    const qs = params.toString();
    return request<EventEntry[]>(`/api/events${qs ? `?${qs}` : ''}`);
  },
  addEvent: (kind: EventKind) =>
    request<EventEntry>('/api/events', { method: 'POST', body: JSON.stringify({ kind }) }),
  deleteEvent: (id: string) =>
    request<void>(`/api/events/${id}`, { method: 'DELETE' }),
};

export const EXPORT_CSV_URL = '/api/export.csv';
