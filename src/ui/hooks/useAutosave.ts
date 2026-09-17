import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';

const AUTOSAVE_DELAY = 2000;

/**
 * The store already persists every change to localStorage; this only settles the
 * status-bar indicator back to "saved" so the user sees the autosave happen.
 */
export function useAutosave() {
  const saveState = useAppStore((s) => s.status.saveState);
  const setSaveState = useAppStore((s) => s.setSaveState);

  useEffect(() => {
    if (saveState !== 'dirty') return;
    const timer = setTimeout(() => setSaveState('saved'), AUTOSAVE_DELAY);
    return () => clearTimeout(timer);
  }, [saveState, setSaveState]);
}
