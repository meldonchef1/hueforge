import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import styles from './CompareOverlay.module.css';

/**
 * Lays the source image over the 3D preview so the two can be judged against
 * each other — either split by a draggable line or faded on top.
 */
export function CompareOverlay() {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const pixels = useAppStore((s) => s.source.pixels);
  const compare = useAppStore((s) => s.view.compare);
  const amount = useAppStore((s) => s.view.compareAmount);
  const setView = useAppStore((s) => s.setView);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pixels) return;
    canvas.width = pixels.width;
    canvas.height = pixels.height;
    canvas.getContext('2d')?.putImageData(pixels, 0, 0);
  }, [pixels, compare]);

  useEffect(() => {
    if (compare !== 'split') return;

    const move = (event: PointerEvent) => {
      if (!dragging.current) return;
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const fraction = (event.clientX - rect.left) / rect.width;
      setView({ compareAmount: Math.min(1, Math.max(0, fraction)) });
    };
    const up = () => {
      dragging.current = false;
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [compare, setView]);

  if (compare === 'off' || !pixels) return null;

  const percent = `${amount * 100}%`;

  return (
    <div ref={rootRef} className={styles.root} data-mode={compare}>
      <div
        className={styles.imageWrap}
        style={
          compare === 'split'
            ? { clipPath: `inset(0 ${100 - amount * 100}% 0 0)` }
            : { opacity: amount }
        }
      >
        <canvas ref={canvasRef} className={styles.image} />
      </div>

      {compare === 'split' && (
        <>
          <div className={styles.divider} style={{ left: percent }} />
          <button
            type="button"
            className={styles.handle}
            style={{ left: percent }}
            aria-label={t('compare.handle')}
            onPointerDown={(event) => {
              event.preventDefault();
              dragging.current = true;
            }}
          />
          <span className={styles.tagLeft}>{t('sourceImage.label')}</span>
          <span className={styles.tagRight}>{t('preview.label')}</span>
        </>
      )}
    </div>
  );
}
