import { useCallback, useEffect, useState } from 'react';
import { pushSupported, isSubscribed, subscribeToPush, unsubscribeFromPush, sendTestPush } from '../push';

export function usePushNotifications() {
  const [supported] = useState(pushSupported());
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!supported) return;
    setSubscribed(await isSubscribed());
  }, [supported]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    setLoading(true);
    try {
      const ok = await subscribeToPush();
      setSubscribed(ok);
      return ok;
    } finally {
      setLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      await unsubscribeFromPush();
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendTest = useCallback(async () => {
    setTestResult(null);
    const result = await sendTestPush();
    setTestResult(result.ok ? 'Sent — check for it in a few seconds.' : (result.error || 'Failed to send.'));
  }, []);

  return { supported, subscribed, loading, testResult, subscribe, unsubscribe, sendTest };
}
