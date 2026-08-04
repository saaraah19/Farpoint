export type Phase = 'work' | 'break' | 'long';
export type Feeling = 'great' | 'okay' | 'tired' | 'strained';
export type SoundStyle = 'chime' | 'meow';

export interface DailyStats {
  date: string;
  cyclesToday: number;
  drillSessionsToday: number;
  hydrationCount: number;
  dropsCount: number;
  currentTask: string;
  targetSessions: number;
}

export interface HistoryEntry {
  id: string;
  ts: number;
  feeling: Feeling;
  text: string;
  task: string;
  cycles: number;
  drillSessions: number;
}

export interface ReminderSettings {
  hydrationEnabled: boolean;
  hydrationMinutes: number;
  dropsEnabled: boolean;
  dropsMinutes: number;
}

export interface PomodoroSettings {
  workMin: number;
  breakSec: number;
  cyclesBeforeLong: number;
  longBreakMin: number;
  soundEnabled: boolean;
  soundStyle: SoundStyle;
  notificationsEnabled: boolean;
}
