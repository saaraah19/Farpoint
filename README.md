# Farpoint 🐾

A cat-themed 20-20-20 pomodoro timer, guided convergence (pencil pushup)
drill, hydration and eye-drop reminders, an hours→sessions planner, and a
session journal — built for long screen sessions with exophoria and high
myopia.

- **Set your intention, not just your mood** — a task chip above the timer
  captures what you're working on when you start; the end-of-session
  check-in only asks how your eyes feel, so the two never get mixed up.
- **Plan today's sessions** — tell it how many hours you have and it splits
  them into focus sessions of your chosen length (or set the session count
  directly).
- **Eye pushups** — the convergence drill tracks 20 reps × 2 sessions/day
  with a paw-print progress trail.
- **Sound cues** — a soft chime or a synthesized meow (your choice) on every
  phase change, plus a little paw-print celebration when you hit a goal.

- **Frontend:** React + TypeScript + Vite (no UI framework — hand-written CSS)
- **Backend:** Node.js + Express + SQLite (`better-sqlite3`), single user, no auth
- **Deploy target:** Render (one service, backend serves the built frontend)

## Project structure

```
farpoint/
  client/     React app (Vite)
  server/     Express API + SQLite database
  render.yaml Render deploy config
```

## Local development

You'll run the client and server separately, with Vite proxying `/api` calls
to the backend.

```bash
npm run install:all      # installs both client and server deps

# in one terminal
npm run dev:server        # http://localhost:3001

# in another terminal
npm run dev:client        # http://localhost:5173
```

Open http://localhost:5173 — the app will talk to the backend automatically.

## Production build (what Render runs)

```bash
npm run build   # builds client/dist, installs server deps
npm start        # serves the built frontend + API from one Node process on $PORT
```

## Deploying to Render

1. Push this repo to GitHub (see below).
2. In Render: **New → Blueprint**, point it at your repo. Render will read
   `render.yaml` and set everything up automatically — build command, start
   command, and a small persistent disk for the SQLite database.
3. Alternatively, set it up manually as a **Web Service**:
   - Build command: `npm run build`
   - Start command: `npm start`
   - Add a disk mounted at `/var/data` (Render dashboard → Disks) if you want
     your history to survive deploys — see the note below.
   - Env var `DB_PATH` = `/var/data/farpoint.db`

### About data persistence on Render's free tier

Render's **free** web services don't include a persistent disk — the
filesystem resets on every deploy and after periods of inactivity, so your
SQLite file (and with it, your history) would reset too. Two ways to handle
this:

- **Add a Render Disk** (~$0.25/GB/month, no separate paid plan needed on
  newer Render pricing) mounted at `/var/data`. This is what `render.yaml`
  already sets up — your data will survive restarts and deploys.
- **Skip it for now** if you just want to try it out — the app still works
  fully, it just won't remember history across a redeploy or a long idle
  period. You can add the disk later at any time without changing code,
  since the server already reads `DB_PATH` from an environment variable.

Free-tier services also spin down after ~15 minutes of inactivity and take a
few seconds to wake up on the next request — expected on Render's free plan,
not a bug.

## Pushing to GitHub

```bash
cd farpoint
git init
git add .
git commit -m "Initial commit: Farpoint"
git branch -M main
git remote add origin https://github.com/<your-username>/farpoint.git
git push -u origin main
```

## API reference

All endpoints are under `/api` and operate on a single user (no accounts).

| Method | Path                      | Description                          |
|--------|---------------------------|---------------------------------------|
| GET    | `/api/daily`               | Today's cycle/drill/hydration/drops counts |
| PUT    | `/api/daily`                | Update today's counts                |
| GET    | `/api/history`              | All session log entries, newest first |
| POST   | `/api/history`              | Add a session log entry              |
| DELETE | `/api/history/:id`          | Remove an entry                      |
| GET    | `/api/reminder-settings`    | Hydration/eye-drop reminder settings |
| PUT    | `/api/reminder-settings`    | Update reminder settings             |
| GET    | `/api/pomodoro-settings`    | Timer settings (incl. `soundStyle`: chime/meow) |
| PUT    | `/api/pomodoro-settings`    | Update timer settings                |

`GET/PUT /api/daily` also carries `currentTask` (the task chip above the
timer) and `targetSessions` (today's planned session count from the planner
card) alongside the existing counts. `POST /api/history` accepts an optional
`task` field so each log entry can show what you were focused on.

Existing SQLite databases from before these fields existed are migrated
automatically the next time the server starts (see `ensureColumn` in
`server/db.js`) — no manual migration step needed.

## Notes

- This is a pacing tool, not a medical device. Keep following your eye
  doctor's specific exercise prescription.
- The convergence drill is a visual pacing guide (a dot alternating near/far
  on a timer) — it doesn't replace or verify the physical pencil pushup
  motion itself.
