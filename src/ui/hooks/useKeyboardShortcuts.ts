import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { exportStl } from '../exports';
import { saveProject } from '../projectFile';

/** True while the user is typing, so shortcuts never steal keys from an input. */
function isEditing(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  const tag = element.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || element.isContentEditable;
}

/** Keyboard shortcuts, listed for the user in Help → Keyboard shortcuts. */
export const SHORTCUTS = [
  { keys: 'Ctrl+S', id: 'save' },
  { keys: 'Ctrl+E', id: 'exportStl' },
  { keys: 'Ctrl+Z', id: 'undo' },
  { keys: 'Ctrl+Y', id: 'redo' },
  { keys: 'Ctrl+0', id: 'resetCamera' },
  { keys: 'Ctrl+V', id: 'pasteImage' },
  { keys: 'C', id: 'compare' },
  { keys: 'B', id: 'brush' },
] as const;

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditing(event.target)) return;

      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      const store = useAppStore.getState();

      // Single letters, which must not fire while a modifier is held.
      if (!mod && !event.altKey) {
        if (key === 'c') {
          event.preventDefault();
          // Cycles off → split → overlay → off.
          const next =
            store.view.compare === 'off' ? 'split' : store.view.compare === 'split' ? 'overlay' : 'off';
          store.setView({ compare: next });
          return;
        }
        if (key === 'b') {
          event.preventDefault();
          store.setView({ brushActive: !store.view.brushActive });
          return;
        }
        return;
      }

      if (!mod) return;

      if (key === 's') {
        event.preventDefault();
        saveProject();
      } else if (key === 'e') {
        event.preventDefault();
        exportStl();
      } else if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        store.undo();
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault();
        store.redo();
      } else if (key === '0') {
        event.preventDefault();
        store.resetCamera();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
