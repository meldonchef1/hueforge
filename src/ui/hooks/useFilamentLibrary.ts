import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';

/** Loads the filament library once, from IndexedDB or the bundled defaults. */
export function useFilamentLibrary() {
  const loaded = useAppStore((s) => s.libraryLoaded);
  const loadLibrary = useAppStore((s) => s.loadLibrary);

  useEffect(() => {
    if (loaded) return;
    void loadLibrary();
  }, [loaded, loadLibrary]);
}
