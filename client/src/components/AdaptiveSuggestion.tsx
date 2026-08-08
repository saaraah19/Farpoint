import CatMascot from './CatMascot';

interface AdaptiveSuggestionProps {
  onShorten: () => void;
  onDismiss: () => void;
}

export default function AdaptiveSuggestion({ onShorten, onDismiss }: AdaptiveSuggestionProps) {
  return (
    <div className="card adaptive-suggestion">
      <CatMascot mood="sleepy" size={40} className="adaptive-suggestion-cat" />
      <div className="adaptive-suggestion-body">
        <p className="adaptive-suggestion-title">Your last few sessions sounded tough on your eyes 🐾</p>
        <p className="hint">
          You've logged tired or strained a couple times in a row. Want to try shorter 15-minute sessions for a while?
        </p>
        <div className="adaptive-suggestion-actions">
          <button type="button" className="small primary" onClick={onShorten}>Try 15-min sessions</button>
          <button type="button" className="small ghost" onClick={onDismiss}>No thanks</button>
        </div>
      </div>
    </div>
  );
}
