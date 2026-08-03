import { useEffect, useRef, useState } from 'react';
import type { Feeling } from '../types';

interface LogModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { feeling: Feeling; text: string }) => void;
}

const FEELINGS: { key: Feeling; label: string }[] = [
  { key: 'great', label: '🟢 Great' },
  { key: 'okay', label: '🟡 Okay' },
  { key: 'tired', label: '🟠 Tired' },
  { key: 'strained', label: '🔴 Strained' },
];

export default function LogModal({ open, onClose, onSave }: LogModalProps) {
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [text, setText] = useState('');
  const [shake, setShake] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setFeeling(null);
      setText('');
      setTimeout(() => textareaRef.current?.focus(), 0);
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
        <h3>Log this session</h3>
        <p className="hint">How your eyes feel, and what you learned — takes 20 seconds.</p>
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
          placeholder="What did you work on or learn this session?"
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
