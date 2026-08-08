import { usePushNotifications } from '../hooks/usePushNotifications';

export default function PushSettingsCard() {
  const { supported, subscribed, loading, testResult, subscribe, unsubscribe, sendTest } = usePushNotifications();

  return (
    <details>
      <summary>📱 Push notifications (even when closed)</summary>
      <div className="details-body">
        <p className="hint">
          Different from the "Browser notifications" setting above — those only work while some Farpoint tab or
          window is open somewhere. This uses real push, so it can reach you after you've closed everything, as
          long as this device has been online. See the note at the bottom for the honest limits of this.
        </p>

        {!supported ? (
          <p className="hint">Your browser doesn't support push notifications.</p>
        ) : (
          <>
            <div className="field-row">
              <span>Push notifications</span>
              {subscribed ? (
                <button type="button" className="small chip active" disabled={loading} onClick={unsubscribe}>
                  {loading ? 'Working…' : 'On — tap to disable'}
                </button>
              ) : (
                <button type="button" className="small primary" disabled={loading} onClick={subscribe}>
                  {loading ? 'Working…' : 'Enable'}
                </button>
              )}
            </div>
            {subscribed && (
              <div className="field-row">
                <span>Test it</span>
                <button type="button" className="small chip" onClick={sendTest}>Send test push</button>
              </div>
            )}
            {testResult && <p className="hint">{testResult}</p>}
          </>
        )}

        <p className="disclaimer">
          Honest limits: this only fires for whatever was scheduled the last time a Farpoint tab was open (synced
          every ~25s while open) — so it covers "I started a session and closed the tab," but if the browser stays
          closed through several cycles in a row, only the one that was pending when you left will arrive. It also
          depends on this app's server being awake; on Render's free tier the server can spin down after inactivity,
          which would delay or skip a scheduled push.
        </p>
      </div>
    </details>
  );
}
