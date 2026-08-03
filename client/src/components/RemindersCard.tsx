import type { ReminderSettings } from '../types';
import { fmtLongClock } from '../utils';

interface RemindersCardProps {
  settings: ReminderSettings;
  onChange: (patch: Partial<ReminderSettings>) => void;
  hydrationRemaining: number;
  dropsRemaining: number;
  hydrationCount: number;
  dropsCount: number;
}

export default function RemindersCard({
  settings, onChange, hydrationRemaining, dropsRemaining, hydrationCount, dropsCount,
}: RemindersCardProps) {
  return (
    <div className="card">
      <div className="reminders-header"><h2>Reminders</h2></div>

      <div className="reminder-row">
        <span className="reminder-icon">💧</span>
        <div className="reminder-info">
          <p className="title">Hydration</p>
          <p className="status">
            {settings.hydrationEnabled ? `Next in ${fmtLongClock(hydrationRemaining)}` : 'Paused'} · {hydrationCount} today
          </p>
        </div>
        <div className="reminder-controls">
          <input
            type="number" min={5} max={180} value={settings.hydrationMinutes}
            onChange={(e) => onChange({ hydrationMinutes: parseInt(e.target.value) || 45 })}
          />
          <span className="unit">min</span>
          <label className="switch">
            <input
              type="checkbox" checked={settings.hydrationEnabled}
              onChange={(e) => onChange({ hydrationEnabled: e.target.checked })}
            />
            <span className="switch-track" />
          </label>
        </div>
      </div>

      <div className="reminder-row">
        <span className="reminder-icon">👁️</span>
        <div className="reminder-info">
          <p className="title">Eye drops</p>
          <p className="status">
            {settings.dropsEnabled ? `Next in ${fmtLongClock(dropsRemaining)}` : 'Paused'} · {dropsCount} today
          </p>
        </div>
        <div className="reminder-controls">
          <input
            type="number" min={15} max={360} value={settings.dropsMinutes}
            onChange={(e) => onChange({ dropsMinutes: parseInt(e.target.value) || 120 })}
          />
          <span className="unit">min</span>
          <label className="switch">
            <input
              type="checkbox" checked={settings.dropsEnabled}
              onChange={(e) => onChange({ dropsEnabled: e.target.checked })}
            />
            <span className="switch-track" />
          </label>
        </div>
      </div>
    </div>
  );
}
