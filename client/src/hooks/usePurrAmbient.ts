import { useEffect } from 'react';
import { startPurr, stopPurr } from '../sound';

/** Runs the purr loop exactly while `active` is true, and guarantees cleanup on unmount. */
export function usePurrAmbient(active: boolean) {
  useEffect(() => {
    if (active) {
      startPurr();
      return () => stopPurr();
    }
    return undefined;
  }, [active]);
}
