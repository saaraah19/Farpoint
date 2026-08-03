import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

function todayKey() {
  // YYYY-MM-DD in server local time
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function rowToDaily(row, date) {
  return {
    date,
    cyclesToday: row?.cycles_today ?? 0,
    drillSessionsToday: row?.drill_sessions_today ?? 0,
    hydrationCount: row?.hydration_count ?? 0,
    dropsCount: row?.drops_count ?? 0,
    currentTask: row?.current_task ?? '',
    targetSessions: row?.target_sessions ?? 0,
  };
}

// ---- Daily stats ----
app.get('/api/daily', (req, res) => {
  const date = todayKey();
  const row = db.prepare('SELECT * FROM daily_stats WHERE date = ?').get(date);
  res.json(rowToDaily(row, date));
});

app.put('/api/daily', (req, res) => {
  const date = todayKey();
  const existing = db.prepare('SELECT * FROM daily_stats WHERE date = ?').get(date);
  const current = rowToDaily(existing, date);
  const next = {
    cyclesToday: req.body.cyclesToday ?? current.cyclesToday,
    drillSessionsToday: req.body.drillSessionsToday ?? current.drillSessionsToday,
    hydrationCount: req.body.hydrationCount ?? current.hydrationCount,
    dropsCount: req.body.dropsCount ?? current.dropsCount,
    currentTask: req.body.currentTask ?? current.currentTask,
    targetSessions: req.body.targetSessions ?? current.targetSessions,
  };
  db.prepare(`
    INSERT INTO daily_stats (date, cycles_today, drill_sessions_today, hydration_count, drops_count, current_task, target_sessions)
    VALUES (@date, @cyclesToday, @drillSessionsToday, @hydrationCount, @dropsCount, @currentTask, @targetSessions)
    ON CONFLICT(date) DO UPDATE SET
      cycles_today = @cyclesToday,
      drill_sessions_today = @drillSessionsToday,
      hydration_count = @hydrationCount,
      drops_count = @dropsCount,
      current_task = @currentTask,
      target_sessions = @targetSessions
  `).run({ date, ...next });
  res.json({ date, ...next });
});

// ---- History / session log ----
app.get('/api/history', (req, res) => {
  const rows = db.prepare('SELECT * FROM history ORDER BY ts DESC').all();
  res.json(rows.map(r => ({
    id: r.id, ts: r.ts, feeling: r.feeling, text: r.text, task: r.task,
    cycles: r.cycles, drillSessions: r.drill_sessions,
  })));
});

app.post('/api/history', (req, res) => {
  const { feeling, text, task, cycles, drillSessions } = req.body;
  if (!feeling) return res.status(400).json({ error: 'feeling is required' });
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    ts: Date.now(),
    feeling,
    text: text || '',
    task: task || '',
    cycles: cycles || 0,
    drillSessions: drillSessions || 0,
  };
  db.prepare(`
    INSERT INTO history (id, ts, feeling, text, task, cycles, drill_sessions)
    VALUES (@id, @ts, @feeling, @text, @task, @cycles, @drillSessions)
  `).run(entry);
  res.status(201).json(entry);
});

app.delete('/api/history/:id', (req, res) => {
  db.prepare('DELETE FROM history WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// ---- Reminder settings ----
app.get('/api/reminder-settings', (req, res) => {
  const row = db.prepare('SELECT * FROM reminder_settings WHERE id = 1').get();
  res.json({
    hydrationEnabled: !!row.hydration_enabled,
    hydrationMinutes: row.hydration_minutes,
    dropsEnabled: !!row.drops_enabled,
    dropsMinutes: row.drops_minutes,
  });
});

app.put('/api/reminder-settings', (req, res) => {
  const { hydrationEnabled, hydrationMinutes, dropsEnabled, dropsMinutes } = req.body;
  db.prepare(`
    UPDATE reminder_settings SET
      hydration_enabled = @hydrationEnabled,
      hydration_minutes = @hydrationMinutes,
      drops_enabled = @dropsEnabled,
      drops_minutes = @dropsMinutes
    WHERE id = 1
  `).run({
    hydrationEnabled: hydrationEnabled ? 1 : 0,
    hydrationMinutes: hydrationMinutes || 45,
    dropsEnabled: dropsEnabled ? 1 : 0,
    dropsMinutes: dropsMinutes || 120,
  });
  res.json(req.body);
});

// ---- Pomodoro settings ----
app.get('/api/pomodoro-settings', (req, res) => {
  const row = db.prepare('SELECT * FROM pomodoro_settings WHERE id = 1').get();
  res.json({
    workMin: row.work_min,
    breakSec: row.break_sec,
    cyclesBeforeLong: row.cycles_before_long,
    longBreakMin: row.long_break_min,
    soundEnabled: !!row.sound_enabled,
    soundStyle: row.sound_style || 'chime',
  });
});

app.put('/api/pomodoro-settings', (req, res) => {
  const { workMin, breakSec, cyclesBeforeLong, longBreakMin, soundEnabled, soundStyle } = req.body;
  db.prepare(`
    UPDATE pomodoro_settings SET
      work_min = @workMin,
      break_sec = @breakSec,
      cycles_before_long = @cyclesBeforeLong,
      long_break_min = @longBreakMin,
      sound_enabled = @soundEnabled,
      sound_style = @soundStyle
    WHERE id = 1
  `).run({
    workMin: workMin || 20,
    breakSec: breakSec || 20,
    cyclesBeforeLong: cyclesBeforeLong || 3,
    longBreakMin: longBreakMin || 5,
    soundEnabled: soundEnabled ? 1 : 0,
    soundStyle: soundStyle === 'meow' ? 'meow' : 'chime',
  });
  res.json(req.body);
});

// ---- Serve built frontend in production ----
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Farpoint server running on port ${PORT}`);
});
