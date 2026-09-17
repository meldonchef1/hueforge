import { useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { clearAutosavedImage, loadAutosavedImage, saveAutosavedImage } from '../../store/projectDb';
import { dataUrlToImageData, imageDataToDataUrl } from '../projectFile';

/**
 * Keeps the loaded image across reloads. The settings ride along in
 * localStorage already; without this the picture they describe would be gone
 * every time the tab is closed.
 */
export function useImageAutosave() {
  const pixels = useAppStore((s) => s.source.pixels);
  const name = useAppStore((s) => s.source.name);
  const setImage = useAppStore((s) => s.setImage);

  /** Skips saving the very image we just restored. */
  const restoring = useRef(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const saved = await loadAutosavedImage();
        if (!saved || cancelled) return;
        // Nothing to restore over if the user was faster than the database.
        if (useAppStore.getState().source.pixels) return;
        setImage(await dataUrlToImageData(saved.dataUrl), saved.name);
      } catch {
        // Blocked storage or an unreadable image: start empty.
      } finally {
        if (!cancelled) restoring.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setImage]);

  useEffect(() => {
    if (restoring.current) return;

    if (!pixels) {
      void clearAutosavedImage().catch(() => {});
      return;
    }

    // Encoding a large image is slow, so let the interface settle first.
    const timer = setTimeout(() => {
      void saveAutosavedImage({ name, dataUrl: imageDataToDataUrl(pixels) }).catch(() => {});
    }, 800);

    return () => clearTimeout(timer);
  }, [pixels, name]);
}
