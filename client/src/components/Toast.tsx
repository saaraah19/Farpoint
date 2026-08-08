import type { ToastKind } from '../hooks/useReminderTimers';

interface ToastProps {
  kind: ToastKind;
  onDone: () => void;
  onSnooze: () => void;
}

const META: Record<Exclude<ToastKind, null>, { icon: string; text: string; snoozeLabel: string }> = {
  hydration: { icon: '💧', text: 'Time to drink some water.', snoozeLabel: 'Snooze 5m' },
  drops: { icon: '👁️', text: 'Time for your eye drops.', snoozeLabel: 'Snooze 5m' },
  blink: { icon: '😌', text: 'A few slow, deliberate blinks. 🐾', snoozeLabel: 'Snooze 2m' },
};

export default function Toast({ kind, onDone, onSnooze }: ToastProps) {
  const meta = kind ? META[kind] : null;

  return (
    <div className={`toast ${kind ? 'show' : ''}`}>
      <span className="toast-icon">{meta?.icon}</span>
      <span className="toast-text">{meta?.text}</span>
      <div className="toast-actions">
        <button className="ghost small" onClick={onSnooze}>{meta?.snoozeLabel ?? 'Snooze'}</button>
        <button className="primary small" onClick={onDone}>Done</button>
      </div>
    </div>
  );
}
