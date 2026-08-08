import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import webpush from 'web-push';
import db from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ---- Push notifications (web-push / VAPID) ----
// Keys are generated once and persisted, so subscriptions from browsers
// stay valid across server restarts/redeploys.
function ensureVapidKeys() {
  let row = db.prepare('SELECT * FROM vapid_keys WHERE id = 1').get();
  if (!row) {
    const keys = webpush.generateVAPIDKeys();
    db.prepare('INSERT INTO vapid_keys (id, public_key, private_key) VALUES (1, ?, ?)').run(keys.publicKey, keys.privateKey);
    row = { public_key: keys.publicKey, private_key: keys.privateKey };
  }
  return row;
}
const vapidKeys = ensureVapidKeys();
webpush.setVapidDetails('mailto:farpoint@example.com', vapidKeys.public_key, vapidKeys.private_key);

async function sendPushToAll(title, body) {
  const subs = db.prepare('SELECT * FROM push_subscriptions').all();
  const payload = JSON.stringify({ title, body });
  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
    } catch (err) {
      // 404/410 means the browser dropped the subscription (uninstalled,
      // cleared data, etc.) — clean it up so we stop trying.
      if (err && (err.statusCode === 404 || err.statusCode === 410)) {
        db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(sub.endpoint);
      } else {
        console.error('Push send failed:', err && err.message);
      }
    }
  }));
}

// Checks for any schedule that's come due and fires it. Runs regardless of
// whether any browser tab is open — this is what lets a notification arrive
// after you've closed everything, as long as this server process is alive.
setInterval(async () => {
  const now = Date.now();
  const due = db.prepare('SELECT * FROM scheduled_push WHERE fire_at <= ?').all(now);
  for (const row of due) {
    db.prepare('DELETE FROM scheduled_push WHERE kind = ?').run(row.kind);
    await sendPushToAll(row.title, row.body);
  }
}, 20000);

function todayKey() {
  // YYYY-MM-DD in server local time
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function dateKeyFor(ts) {
  // Same YYYY-MM-DD-in-local-time logic as todayKey(), for an arbitrary timestamp.
  const d = new Date(ts);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
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
    blinkCount: row?.blink_count ?? 0,
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
    blinkCount: req.body.blinkCount ?? current.blinkCount,
  };
  db.prepare(`
    INSERT INTO daily_stats (date, cycles_today, drill_sessions_today, hydration_count, drops_count, current_task, target_sessions, blink_count)
    VALUES (@date, @cyclesToday, @drillSessionsToday, @hydrationCount, @dropsCount, @currentTask, @targetSessions, @blinkCount)
    ON CONFLICT(date) DO UPDATE SET
      cycles_today = @cyclesToday,
      drill_sessions_today = @drillSessionsToday,
      hydration_count = @hydrationCount,
      drops_count = @dropsCount,
      current_task = @currentTask,
      target_sessions = @targetSessions,
      blink_count = @blinkCount
  `).run({ date, ...next });
  res.json({ date, ...next });
});

// ---- Event log (e.g. eye-drop / hydration timestamps during the day) ----
app.get('/api/events', (req, res) => {
  const date = req.query.date || todayKey();
  const kind = req.query.kind;
  const rows = db.prepare('SELECT * FROM event_log ORDER BY ts ASC').all();
  const filtered = rows.filter(r => dateKeyFor(r.ts) === date && (!kind || r.kind === kind));
  res.json(filtered.map(r => ({ id: r.id, ts: r.ts, kind: r.kind })));
});

app.post('/api/events', (req, res) => {
  const { kind } = req.body;
  if (!kind) return res.status(400).json({ error: 'kind is required' });
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    ts: Date.now(),
    kind,
  };
  db.prepare('INSERT INTO event_log (id, ts, kind) VALUES (@id, @ts, @kind)').run(entry);
  res.status(201).json(entry);
});

app.delete('/api/events/:id', (req, res) => {
  db.prepare('DELETE FROM event_log WHERE id = ?').run(req.params.id);
  res.status(204).end();
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
    blinkEnabled: row.blink_enabled === undefined ? true : !!row.blink_enabled,
    blinkMinutes: row.blink_minutes ?? 10,
  });
});

app.put('/api/reminder-settings', (req, res) => {
  const { hydrationEnabled, hydrationMinutes, dropsEnabled, dropsMinutes, blinkEnabled, blinkMinutes } = req.body;
  db.prepare(`
    UPDATE reminder_settings SET
      hydration_enabled = @hydrationEnabled,
      hydration_minutes = @hydrationMinutes,
      drops_enabled = @dropsEnabled,
      drops_minutes = @dropsMinutes,
      blink_enabled = @blinkEnabled,
      blink_minutes = @blinkMinutes
    WHERE id = 1
  `).run({
    hydrationEnabled: hydrationEnabled ? 1 : 0,
    hydrationMinutes: hydrationMinutes || 45,
    dropsEnabled: dropsEnabled ? 1 : 0,
    dropsMinutes: dropsMinutes || 120,
    blinkEnabled: blinkEnabled === false ? 0 : 1,
    blinkMinutes: blinkMinutes || 10,
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
    notificationsEnabled: !!row.notifications_enabled,
    purrEnabled: !!row.purr_enabled,
    afkPauseEnabled: row.afk_pause_enabled === undefined ? true : !!row.afk_pause_enabled,
  });
});

app.put('/api/pomodoro-settings', (req, res) => {
  const { workMin, breakSec, cyclesBeforeLong, longBreakMin, soundEnabled, soundStyle, notificationsEnabled, purrEnabled, afkPauseEnabled } = req.body;
  db.prepare(`
    UPDATE pomodoro_settings SET
      work_min = @workMin,
      break_sec = @breakSec,
      cycles_before_long = @cyclesBeforeLong,
      long_break_min = @longBreakMin,
      sound_enabled = @soundEnabled,
      sound_style = @soundStyle,
      notifications_enabled = @notificationsEnabled,
      purr_enabled = @purrEnabled,
      afk_pause_enabled = @afkPauseEnabled
    WHERE id = 1
  `).run({
    workMin: workMin || 20,
    breakSec: breakSec || 20,
    cyclesBeforeLong: cyclesBeforeLong || 3,
    longBreakMin: longBreakMin || 5,
    soundEnabled: soundEnabled ? 1 : 0,
    soundStyle: soundStyle === 'meow' ? 'meow' : 'chime',
    notificationsEnabled: notificationsEnabled ? 1 : 0,
    purrEnabled: purrEnabled ? 1 : 0,
    afkPauseEnabled: afkPauseEnabled === false ? 0 : 1,
  });
  res.json(req.body);
});

// ---- Daily history (for the compliance heatmap) ----
app.get('/api/daily-history', (req, res) => {
  const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 84));
  const rows = db.prepare('SELECT * FROM daily_stats ORDER BY date DESC LIMIT ?').all(days);
  res.json(rows.reverse().map(r => rowToDaily(r, r.date)));
});

// ---- Spreadsheet export ----
app.get('/api/export.csv', (req, res) => {
  const dailyRows = db.prepare('SELECT * FROM daily_stats ORDER BY date ASC').all();
  const historyRows = db.prepare('SELECT * FROM history ORDER BY ts ASC').all();
  const dropRows = db.prepare("SELECT * FROM event_log WHERE kind = 'drops' ORDER BY ts ASC").all();
  const settingsRow = db.prepare('SELECT * FROM pomodoro_settings WHERE id = 1').get();
  const workMin = settingsRow?.work_min || 20;

  const feelingsByDate = {};
  const tasksByDate = {};
  for (const h of historyRows) {
    const d = dateKeyFor(h.ts);
    if (!feelingsByDate[d]) feelingsByDate[d] = [];
    feelingsByDate[d].push(h.feeling);
    if (h.task) {
      if (!tasksByDate[d]) tasksByDate[d] = [];
      tasksByDate[d].push(h.task);
    }
  }
  const dropsByDate = {};
  for (const e of dropRows) {
    const d = dateKeyFor(e.ts);
    if (!dropsByDate[d]) dropsByDate[d] = [];
    dropsByDate[d].push(new Date(e.ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
  }

  const header = [
    'Date', 'Focus Sessions', 'Target Sessions', 'Hours Focused (approx)',
    'Eye-Pushup Sessions (of 2)', 'Hydration Count', 'Drops Count',
    'Drop Times', 'Feelings Logged', 'Tasks Logged',
  ];
  const lines = [header.map(csvEscape).join(',')];

  for (const row of dailyRows) {
    const date = row.date;
    const hours = (((row.cycles_today || 0) * workMin) / 60).toFixed(1);
    lines.push([
      date,
      row.cycles_today || 0,
      row.target_sessions || 0,
      hours,
      row.drill_sessions_today || 0,
      row.hydration_count || 0,
      row.drops_count || 0,
      (dropsByDate[date] || []).join('; '),
      (feelingsByDate[date] || []).join('; '),
      (tasksByDate[date] || []).join('; '),
    ].map(csvEscape).join(','));
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="farpoint-export-${todayKey()}.csv"`);
  res.status(200).send(lines.join('\r\n'));
});

// ---- Push subscription management ----
app.get('/api/push/public-key', (req, res) => {
  res.json({ publicKey: vapidKeys.public_key });
});

app.post('/api/push/subscribe', (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
    return res.status(400).json({ error: 'invalid subscription' });
  }
  db.prepare(`
    INSERT INTO push_subscriptions (endpoint, p256dh, auth, created_at)
    VALUES (@endpoint, @p256dh, @auth, @createdAt)
    ON CONFLICT(endpoint) DO UPDATE SET p256dh = @p256dh, auth = @auth
  `).run({ endpoint, p256dh: keys.p256dh, auth: keys.auth, createdAt: Date.now() });
  res.status(201).json({ ok: true });
});

app.post('/api/push/unsubscribe', (req, res) => {
  const { endpoint } = req.body;
  if (endpoint) db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
  res.status(204).end();
});

app.post('/api/push/test', async (req, res) => {
  const count = db.prepare('SELECT COUNT(*) AS n FROM push_subscriptions').get().n;
  if (count === 0) return res.status(400).json({ error: 'no subscriptions registered' });
  await sendPushToAll('Farpoint 🐾', 'Push notifications are working.');
  res.json({ ok: true, sentTo: count });
});

// ---- Push scheduling ----
// The client tells us the next time something should notify (a phase
// ending, a reminder coming due) and we hold onto just that one upcoming
// moment per kind. When the browser is open, the in-page notification/sound
// already covers it and this is mostly redundant; the point is that this
// still fires via the server even if every browser window gets closed.
// Passing fireAt: null cancels that kind's pending schedule (e.g. on pause).
app.put('/api/push/schedule', (req, res) => {
  const { kind, fireAt, title, body } = req.body;
  if (!kind) return res.status(400).json({ error: 'kind is required' });
  if (fireAt == null) {
    db.prepare('DELETE FROM scheduled_push WHERE kind = ?').run(kind);
    return res.json({ kind, cleared: true });
  }
  db.prepare(`
    INSERT INTO scheduled_push (kind, fire_at, title, body)
    VALUES (@kind, @fireAt, @title, @body)
    ON CONFLICT(kind) DO UPDATE SET fire_at = @fireAt, title = @title, body = @body
  `).run({ kind, fireAt, title: title || 'Farpoint 🐾', body: body || '' });
  res.json({ kind, fireAt, title, body });
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
