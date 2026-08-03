import type { HistoryEntry } from '../types';

const FEELING_LABEL: Record<string, string> = {
  great: '🟢 Great',
  okay: '🟡 Okay',
  tired: '🟠 Tired',
  strained: '🔴 Strained',
};

interface HistoryCardProps {
  entries: HistoryEntry[];
  onNewEntry: () => void;
  onDelete: (id: string) => void;
}

export default function HistoryCard({ entries, onNewEntry, onDelete }: HistoryCardProps) {
  return (
    <div className="card">
      <div className="history-header">
        <h2>Session log</h2>
        <button className="small primary" onClick={onNewEntry}>New entry</button>
      </div>
      {entries.length === 0 ? (
        <p className="history-empty">No entries yet. Log a session after a focus block to start your history.</p>
      ) : (
        <div className="history-list">
          {entries.map((entry) => {
            const d = new Date(entry.ts);
            const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
              ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            return (
              <div className="history-item" key={entry.id}>
                <div className="history-item-top">
                  <span className="history-date">{dateStr}</span>
                  <span className={`feeling-chip feeling-${entry.feeling}`}>{FEELING_LABEL[entry.feeling]}</span>
                </div>
                {entry.text && <p className="history-text">{entry.text}</p>}
                <div className="history-meta">
                  <span>{entry.cycles} cycles · {entry.drillSessions} drill sessions that day</span>
                  <button className="history-delete" onClick={() => onDelete(entry.id)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
