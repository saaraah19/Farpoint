export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getPermission(): NotificationPermission {
  if (!notificationsSupported()) return 'denied';
  return Notification.permission;
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/**
 * Fire a browser notification. Only actually shows one when the tab is
 * hidden/backgrounded — while the tab is visible, the in-app toast / ring
 * already covers it, and a duplicate system notification is just noise.
 */
export function notify(title: string, options?: NotificationOptions) {
  if (!notificationsSupported()) return;
  if (Notification.permission !== 'granted') return;
  if (!document.hidden) return;
  try {
    const n = new Notification(title, { icon: '/paw-icon.svg', ...options });
    n.onclick = () => {
      window.focus();
      n.close();
    };
    setTimeout(() => n.close(), 20000);
  } catch {
    // Some browsers (mostly mobile) throw on `new Notification`; ignore.
  }
}
