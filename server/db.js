import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// DB_PATH lets you point at a persistent disk in production (e.g. Render disk
// mounted at /var/data). Defaults to a local file for development.
const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'farpoint.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS daily_stats (
    date TEXT PRIMARY KEY,
    cycles_today INTEGER NOT NULL DEFAULT 0,
    drill_sessions_today INTEGER NOT NULL DEFAULT 0,
    hydration_count INTEGER NOT NULL DEFAULT 0,
    drops_count INTEGER NOT NULL DEFAULT 0,
    current_task TEXT NOT NULL DEFAULT '',
    target_sessions INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY,
    ts INTEGER NOT NULL,
    feeling TEXT NOT NULL,
    text TEXT NOT NULL DEFAULT '',
    task TEXT NOT NULL DEFAULT '',
    cycles INTEGER NOT NULL DEFAULT 0,
    drill_sessions INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS reminder_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    hydration_enabled INTEGER NOT NULL DEFAULT 1,
    hydration_minutes INTEGER NOT NULL DEFAULT 45,
    drops_enabled INTEGER NOT NULL DEFAULT 1,
    drops_minutes INTEGER NOT NULL DEFAULT 120
  );

  CREATE TABLE IF NOT EXISTS pomodoro_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    work_min INTEGER NOT NULL DEFAULT 20,
    break_sec INTEGER NOT NULL DEFAULT 20,
    cycles_before_long INTEGER NOT NULL DEFAULT 3,
    long_break_min INTEGER NOT NULL DEFAULT 5,
    sound_enabled INTEGER NOT NULL DEFAULT 1,
    sound_style TEXT NOT NULL DEFAULT 'chime',
    notifications_enabled INTEGER NOT NULL DEFAULT 0,
    purr_enabled INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS event_log (
    id TEXT PRIMARY KEY,
    ts INTEGER NOT NULL,
    kind TEXT NOT NULL
  );
`);

// Lightweight migration: add columns that older databases (created before
// these features existed) won't have yet. CREATE TABLE IF NOT EXISTS above
// only helps brand-new databases, so existing farpoint.db files on disk
// (e.g. on a Render deploy) need these ALTERs to catch up.
function ensureColumn(table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}
ensureColumn('daily_stats', 'current_task', `current_task TEXT NOT NULL DEFAULT ''`);
ensureColumn('daily_stats', 'target_sessions', `target_sessions INTEGER NOT NULL DEFAULT 0`);
ensureColumn('history', 'task', `task TEXT NOT NULL DEFAULT ''`);
ensureColumn('pomodoro_settings', 'sound_style', `sound_style TEXT NOT NULL DEFAULT 'chime'`);
ensureColumn('pomodoro_settings', 'notifications_enabled', `notifications_enabled INTEGER NOT NULL DEFAULT 0`);
ensureColumn('pomodoro_settings', 'purr_enabled', `purr_enabled INTEGER NOT NULL DEFAULT 0`);

// Seed singleton settings rows if empty.
db.prepare(`INSERT OR IGNORE INTO reminder_settings (id) VALUES (1)`).run();
db.prepare(`INSERT OR IGNORE INTO pomodoro_settings (id) VALUES (1)`).run();

export default db;
