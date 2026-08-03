import { useEffect, useRef, useState } from 'react';
import type { Feeling } from '../types';
import CatMascot from './CatMascot';

interface LogModalProps {
  open: boolean;
  task: string;
  onClose: () => void;
  onSave: (data: { feeling: Feeling; text: string }) => void;
}

const FEELINGS: { key: Feeling; label: string }[] = [
  { key: 'great', label: '🟢 Great' },
  { key: 'okay', label: '🟡 Okay' },
  { key: 'tired', label: '🟠 Tired' },
  { key: 'strained', label: '🔴 Strained' },
];

export default function LogModal({ open, task, onClose, onSave }: LogModalProps) {
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [text, setText] = useState('');
  const [shake, setShake] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setFeeling(null);
      setText('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function handleSave() {
    if (!feeling) {
      setShake(true);
      setTimeout(() => setShake(false), 900);
      return;
    }
    onSave({ feeling, text: text.trim() });
  }

  return (
    <div className="modal-overlay show" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-title-row">
          <CatMascot mood="happy" size={40} />
          <div>
            <h3>How are your eyes?</h3>
            <p className="hint">Takes 10 seconds — this is just about how you feel, not what you did.</p>
          </div>
        </div>

        {task && (
          <div className="modal-task-recap">
            <span className="modal-task-recap-label">You were focusing on</span>
            <span className="modal-task-recap-text">{task}</span>
          </div>
        )}

        <div className="feeling-picker" style={{ outline: shake ? '2px solid var(--near)' : 'none' }}>
          {FEELINGS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`feeling-btn ${feeling === f.key ? 'active' : ''}`}
              data-f={f.key}
              onClick={() => setFeeling(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          placeholder="Anything else on your mind? (optional)"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="modal-actions">
          <button className="ghost" onClick={onClose}>Cancel</button>
          <button className="primary" onClick={handleSave}>Save entry</button>
        </div>
      </div>
    </div>
  );
}
