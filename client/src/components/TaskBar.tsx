import { useEffect, useRef, useState } from 'react';
import CatMascot from './CatMascot';

interface TaskBarProps {
  task: string;
  onChange: (task: string) => void;
}

/**
 * Lives right above the timer. Empty -> an inviting "what are you working
 * on?" field. Filled -> a little chip you can edit or clear. This is
 * deliberately separate from the end-of-session "how do your eyes feel?"
 * check-in in LogModal — one captures intent, the other captures outcome.
 */
export default function TaskBar({ task, onChange }: TaskBarProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(task);
  }, [task, editing]);

  useEffect(() => {
    if (editing) setTimeout(() => inputRef.current?.focus(), 0);
  }, [editing]);

  function commit() {
    const trimmed = draft.trim();
    onChange(trimmed);
    setEditing(false);
  }

  const showForm = editing || !task;

  return (
    <div className="card task-bar">
      <CatMascot mood={task ? 'focus' : 'idle'} size={44} className="task-bar-cat" />
      {showForm ? (
        <form
          className="task-bar-form"
          onSubmit={(e) => { e.preventDefault(); commit(); }}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="What are you focusing on right now?"
            value={draft}
            maxLength={140}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => { if (draft.trim()) commit(); else setEditing(false); }}
          />
          <button type="submit" className="small primary">Set</button>
        </form>
      ) : (
        <div className="task-bar-chip">
          <div>
            <p className="task-bar-label">Focusing on</p>
            <p className="task-bar-text">{task}</p>
          </div>
          <div className="task-bar-actions">
            <button type="button" className="ghost small" onClick={() => setEditing(true)} aria-label="Edit task">✏️</button>
            <button type="button" className="ghost small" onClick={() => onChange('')} aria-label="Clear task">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
