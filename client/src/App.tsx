import { useEffect, useRef, useState } from 'react';
import TimerCard, { TimingSettings } from './components/TimerCard';
import DrillCard from './components/DrillCard';
import RemindersCard from './components/RemindersCard';
import HistoryCard from './components/HistoryCard';
import LogModal from './components/LogModal';
import Toast from './components/Toast';
import TaskBar from './components/TaskBar';
import PlanCard from './components/PlanCard';
import PawBurst from './components/PawBurst';
import CatMascot from './components/CatMascot';
import ExportCard from './components/ExportCard';
import ComplianceHeatmap from './components/ComplianceHeatmap';
import AdaptiveSuggestion from './components/AdaptiveSuggestion';
import PushSettingsCard from './components/PushSettingsCard';
import { usePomodoro } from './hooks/usePomodoro';
import { useDailyStats } from './hooks/useDailyStats';
import { useHistory } from './hooks/useHistory';
import { useReminderSettings, usePomodoroSettings } from './hooks/useSettings';
import { useReminderTimers } from './hooks/useReminderTimers';
import { useEventLog } from './hooks/useEventLog';
import { useDailyHistory } from './hooks/useDailyHistory';
import { usePurrAmbient } from './hooks/usePurrAmbient';
import { usePushNotifications } from './hooks/usePushNotifications';
import { usePushScheduleSync } from './hooks/usePushScheduleSync';
import { playCelebration } from './sound';
import { notify } from './notifications';
import { DRILL_GOAL_SESSIONS } from './hooks/useDrill';
import type { Feeling } from './types';

const STRAINED_FEELINGS: Feeling[] = ['tired', 'strained'];

export default function App() {
  const { stats, update: updateStats } = useDailyStats();
  const { entries, addEntry, deleteEntry } = useHistory();
  const { settings: reminderSettings, update: updateReminderSettings } = useReminderSettings();
  const { settings: pomodoroSettings, update: updatePomodoroSettings } = usePomodoroSettings();
  const dropsLog = useEventLog('drops');
  const dailyHistory = useDailyHistory(84);
  const [modalOpen, setModalOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [dismissedSuggestionFor, setDismissedSuggestionFor] = useState<string | null>(null);

  const prevDrillSessions = useRef(stats.drillSessionsToday);
  const prevCycles = useRef(stats.cyclesToday);

  const pomodoro = usePomodoro({
    settings: pomodoroSettings,
    onWorkComplete: () => updateStats({ cyclesToday: stats.cyclesToday + 1 }),
  });

  usePurrAmbient(pomodoroSettings.purrEnabled && pomodoro.running && pomodoro.phase === 'work');

  const push = usePushNotifications();

  const reminders = useReminderTimers({
    settings: reminderSettings,
    notificationsEnabled: pomodoroSettings.notificationsEnabled,
    onHydrationDone: () => updateStats({ hydrationCount: stats.hydrationCount + 1 }),
    onDropsDone: () => {
      updateStats({ dropsCount: stats.dropsCount + 1 });
      dropsLog.add();
    },
    onBlinkDone: () => updateStats({ blinkCount: stats.blinkCount + 1 }),
  });

  usePushScheduleSync({
    enabled: push.subscribed,
    pomodoroRunning: pomodoro.running,
    pomodoroPhase: pomodoro.phase,
    pomodoroRemaining: pomodoro.remaining,
    reminderSettings,
    hydrationRemaining: reminders.hydrationRemaining,
    dropsRemaining: reminders.dropsRemaining,
    blinkRemaining: reminders.blinkRemaining,
  });

  function fireCelebration(title: string, body: string) {
    if (pomodoroSettings.soundEnabled) playCelebration(pomodoroSettings.soundStyle);
    if (pomodoroSettings.notificationsEnabled) notify(title, { body, tag: 'farpoint-celebration' });
    setCelebrating(true);
    setTimeout(() => setCelebrating(false), 1800);
  }

  // Celebrate when the daily drill goal (both sessions) is freshly hit.
  useEffect(() => {
    if (stats.drillSessionsToday >= DRILL_GOAL_SESSIONS && prevDrillSessions.current < DRILL_GOAL_SESSIONS) {
      fireCelebration('Eye pushups done for today! 🐾', 'Both drill sessions complete — nice work.');
    }
    prevDrillSessions.current = stats.drillSessionsToday;
    dailyHistory.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.drillSessionsToday]);

  // Celebrate when the planned session target is freshly hit.
  useEffect(() => {
    if (stats.targetSessions > 0 && stats.cyclesToday >= stats.targetSessions && prevCycles.current < stats.targetSessions) {
      fireCelebration('Today\'s goal reached! 🐾', `You hit your target of ${stats.targetSessions} sessions.`);
    }
    prevCycles.current = stats.cyclesToday;
    dailyHistory.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.cyclesToday, stats.targetSessions]);

  function handleDrillSessionComplete() {
    updateStats({ drillSessionsToday: stats.drillSessionsToday + 1 });
  }

  function handleLogDropNow() {
    updateStats({ dropsCount: stats.dropsCount + 1 });
    dropsLog.add();
  }

  function handleSaveLog(data: { feeling: Feeling; text: string }) {
    addEntry({
      feeling: data.feeling,
      text: data.text,
      task: stats.currentTask,
      cycles: stats.cyclesToday,
      drillSessions: stats.drillSessionsToday,
    });
    updateStats({ currentTask: '' });
    setModalOpen(false);
  }

  // Adaptive pacing: if 2 of your last 3 logged sessions felt tired/strained,
  // gently suggest shorter sessions. Re-appears only when a *new* entry
  // changes that 3-entry window, not every render after being dismissed.
  const recentThree = entries.slice(0, 3);
  const strainedCount = recentThree.filter((e) => STRAINED_FEELINGS.includes(e.feeling)).length;
  const recentSignature = recentThree.map((e) => e.id).join(',');
  const suggestShorterSessions =
    recentThree.length >= 2 &&
    strainedCount >= 2 &&
    pomodoroSettings.workMin > 15 &&
    dismissedSuggestionFor !== recentSignature;

  function handleShortenSessions() {
    updatePomodoroSettings({ workMin: 15 });
    setDismissedSuggestionFor(recentSignature);
  }

  return (
    <div className={`app ${zenMode ? 'zen' : ''}`}>
      {!zenMode && (
        <header>
          <div className="header-top">
            <div>
              <p className="eyebrow">For screen-heavy days</p>
              <h1>Farpoint</h1>
              <p className="sub">
                20-20-20 pacing, a guided convergence drill, hydration &amp; eye-drop reminders, and a session log —
                built for exophoria + high myopia during long focus sessions.
              </p>
            </div>
            <CatMascot mood="idle" size={72} className="header-cat" />
          </div>
        </header>
      )}

      {!zenMode && <TaskBar task={stats.currentTask} onChange={(task) => updateStats({ currentTask: task })} />}

      {!zenMode && suggestShorterSessions && (
        <AdaptiveSuggestion
          onShorten={handleShortenSessions}
          onDismiss={() => setDismissedSuggestionFor(recentSignature)}
        />
      )}

      <TimerCard
        phase={pomodoro.phase}
        remaining={pomodoro.remaining}
        total={pomodoro.total}
        fraction={pomodoro.fraction}
        running={pomodoro.running}
        cycle={pomodoro.cycle}
        cyclesToday={stats.cyclesToday}
        targetSessions={stats.targetSessions}
        zenMode={zenMode}
        awayMinutes={pomodoro.awayMinutes}
        onToggle={pomodoro.toggleRunning}
        onSkip={pomodoro.skip}
        onReset={pomodoro.reset}
        onLogSession={() => setModalOpen(true)}
        onToggleZen={() => setZenMode((z) => !z)}
        onDismissAway={pomodoro.dismissAwayNotice}
      />

      {!zenMode && (
        <>
          <PlanCard
            workMin={pomodoroSettings.workMin}
            targetSessions={stats.targetSessions}
            cyclesToday={stats.cyclesToday}
            onChangeTarget={(target) => updateStats({ targetSessions: target })}
          />

          <TimingSettings settings={pomodoroSettings} onChange={updatePomodoroSettings} />

          <PushSettingsCard />

          <DrillCard
            drillSessionsToday={stats.drillSessionsToday}
            onSessionComplete={handleDrillSessionComplete}
          />

          <RemindersCard
            settings={reminderSettings}
            onChange={updateReminderSettings}
            hydrationRemaining={reminders.hydrationRemaining}
            dropsRemaining={reminders.dropsRemaining}
            blinkRemaining={reminders.blinkRemaining}
            hydrationCount={stats.hydrationCount}
            dropsCount={stats.dropsCount}
            blinkCount={stats.blinkCount}
            dropEvents={dropsLog.events}
            onLogDrop={handleLogDropNow}
            onRemoveDrop={dropsLog.remove}
          />

          <HistoryCard
            entries={entries}
            onNewEntry={() => setModalOpen(true)}
            onDelete={deleteEntry}
          />

          <ComplianceHeatmap history={dailyHistory.history} />

          <ExportCard />

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
        </>
      )}

      <Toast kind={reminders.toastKind} onDone={reminders.markDone} onSnooze={reminders.snooze} />

      <LogModal open={modalOpen} task={stats.currentTask} onClose={() => setModalOpen(false)} onSave={handleSaveLog} />

      <PawBurst active={celebrating} />
    </div>
  );
}
