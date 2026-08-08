import { EXPORT_CSV_URL } from '../api';

export default function ExportCard() {
  return (
    <details>
      <summary>🐾 Export as spreadsheet</summary>
      <div className="details-body">
        <p className="hint">
          Downloads a CSV — one row per day — with focus sessions, hours focused, eye-pushup sessions, hydration
          count, eye-drop times, and the feelings/tasks you logged. Opens right up in Excel, Numbers, or Google
          Sheets.
        </p>
        <a className="chip export-link" href={EXPORT_CSV_URL} download>
          ⬇️ Download CSV
        </a>
      </div>
    </details>
  );
}
