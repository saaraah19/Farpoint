import { useState } from 'react';
import TimerCard, { TimingSettings } from './components/TimerCard';
import DrillCard from './components/DrillCard';
import RemindersCard from './components/RemindersCard';
import HistoryCard from './components/HistoryCard';
import LogModal from './components/LogModal';
import Toast from './components/Toast';
import { usePomodoro } from './hooks/usePomodoro';
import { useDailyStats } from './hooks/useDailyStats';
import { useHistory } from './hooks/useHistory';
import { useReminderSettings, usePomodoroSettings } from './hooks/useSettings';
import { useReminderTimers } from './hooks/useReminderTimers';
import type { Feeling } from './types';

export default function App() {
  const { stats, update: updateStats } = useDailyStats();
  const { entries, addEntry, deleteEntry } = useHistory();
  const { settings: reminderSettings, update: updateReminderSettings } = useReminderSettings();
  const { settings: pomodoroSettings, update: updatePomodoroSettings } = usePomodoroSettings();
  const [modalOpen, setModalOpen] = useState(false);

  const pomodoro = usePomodoro({
    settings: pomodoroSettings,
    onWorkComplete: () => updateStats({ cyclesToday: stats.cyclesToday + 1 }),
  });

  const reminders = useReminderTimers({
    settings: reminderSettings,
    onHydrationDone: () => updateStats({ hydrationCount: stats.hydrationCount + 1 }),
    onDropsDone: () => updateStats({ dropsCount: stats.dropsCount + 1 }),
  });

  function handleDrillSessionComplete() {
    updateStats({ drillSessionsToday: stats.drillSessionsToday + 1 });
  }

  function handleSaveLog(data: { feeling: Feeling; text: string }) {
    addEntry({
      feeling: data.feeling,
      text: data.text,
      cycles: stats.cyclesToday,
      drillSessions: stats.drillSessionsToday,
    });
    setModalOpen(false);
  }

  return (
    <div className="app">
      <header>
        <p className="eyebrow">For screen-heavy days</p>
        <h1>Farpoint</h1>
        <p className="sub">
          20-20-20 pacing, a guided convergence drill, hydration &amp; eye-drop reminders, and a session log —
          built for exophoria + high myopia during long ML sessions.
        </p>
      </header>

      <TimerCard
        phase={pomodoro.phase}
        remaining={pomodoro.remaining}
        fraction={pomodoro.fraction}
        running={pomodoro.running}
        cycle={pomodoro.cycle}
        cyclesToday={stats.cyclesToday}
        onToggle={pomodoro.toggleRunning}
        onSkip={pomodoro.skip}
        onReset={pomodoro.reset}
        onLogSession={() => setModalOpen(true)}
      />

      <TimingSettings settings={pomodoroSettings} onChange={updatePomodoroSettings} />

      <DrillCard
        drillSessionsToday={stats.drillSessionsToday}
        onSessionComplete={handleDrillSessionComplete}
      />

      <RemindersCard
        settings={reminderSettings}
        onChange={updateReminderSettings}
        hydrationRemaining={reminders.hydrationRemaining}
        dropsRemaining={reminders.dropsRemaining}
        hydrationCount={stats.hydrationCount}
        dropsCount={stats.dropsCount}
      />

      <HistoryCard
        entries={entries}
        onNewEntry={() => setModalOpen(true)}
        onDelete={deleteEntry}
      />

      <details>
        <summary>Quick reference</summary>
        <div className="details-body">
          <ul className="tips-list">
            <li>Screen at arm's length (50–70cm) — zoom text up rather than leaning in.</li>
            <li>Top of screen at or just below eye level, to reduce how wide your eyes open.</li>
            <li>Blink fully and deliberately every so often — screen focus cuts blink rate by more than half.</li>
            <li>Keep room light close to screen brightness; avoid a dark room with only the screen lit.</li>
            <li>Do the drill before long sessions, not just when your eyes already feel tired.</li>
          </ul>
          <p className="disclaimer">
            This is a pacing tool, not a medical device. Keep following your eye doctor's specific exercise
            prescription — if discomfort persists despite consistent breaks, that's worth a follow-up appointment.
          </p>
        </div>
      </details>

      <Toast kind={reminders.toastKind} onDone={reminders.markDone} onSnooze={reminders.snooze} />

      <LogModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSaveLog} />
    </div>
  );
}
