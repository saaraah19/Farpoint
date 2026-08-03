import type { ToastKind } from '../hooks/useReminderTimers';

interface ToastProps {
  kind: ToastKind;
  onDone: () => void;
  onSnooze: () => void;
}

export default function Toast({ kind, onDone, onSnooze }: ToastProps) {
  const icon = kind === 'hydration' ? '💧' : '👁️';
  const text = kind === 'hydration' ? 'Time to drink some water.' : 'Time for your eye drops.';

  return (
    <div className={`toast ${kind ? 'show' : ''}`}>
      <span className="toast-icon">{icon}</span>
      <span className="toast-text">{text}</span>
      <div className="toast-actions">
        <button className="ghost small" onClick={onSnooze}>Snooze 5m</button>
        <button className="primary small" onClick={onDone}>Done</button>
      </div>
    </div>
  );
}
