import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';

/** True while the user is typing, so shortcuts never steal keys from an input. */
function isEditing(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  const tag = element.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || element.isContentEditable;
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (!mod || isEditing(event.target)) return;

      const key = event.key.toLowerCase();
      const { undo, redo, resetCamera } = useAppStore.getState();

      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault();
        redo();
      } else if (key === '0') {
        event.preventDefault();
        resetCamera();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
