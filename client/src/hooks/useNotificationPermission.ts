import { useCallback, useEffect, useState } from 'react';
import { getPermission, notificationsSupported, requestPermission } from '../notifications';

export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>(getPermission());

  // Some browsers let permission change externally (site settings UI); poll
  // lightly whenever the tab regains focus so the toggle stays accurate.
  useEffect(() => {
    function refresh() { setPermission(getPermission()); }
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, []);

  const request = useCallback(async () => {
    const result = await requestPermission();
    setPermission(result);
    return result;
  }, []);

  return { supported: notificationsSupported(), permission, request };
}
