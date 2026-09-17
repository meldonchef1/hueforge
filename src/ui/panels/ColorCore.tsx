import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { useSimulatedColumn } from '../hooks/useSimulatedColumn';
import { rgbToCss } from '../../core/color';
import { resolveStack } from '../../core/stack';
import { filamentAtLayer } from '../../core/simulation';
import { layerTop } from '../../core/units';
import styles from './ColorCore.module.css';

interface Hover {
  layer: number;
  x: number;
  y: number;
}

export function ColorCore() {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const column = useSimulatedColumn();
  const stack = useAppStore((s) => s.doc.stack);
  const library = useAppStore((s) => s.library);
  const heights = useAppStore((s) => s.doc.heights);
  const setStackSlotStart = useAppStore((s) => s.setStackSlotStart);
  const addToStack = useAppStore((s) => s.addToStack);

  const [showTd, setShowTd] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [hover, setHover] = useState<Hover | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const entries = resolveStack(stack, library);
  const layers = column.length;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const { clientWidth, clientHeight } = canvas;
      if (clientWidth === 0 || clientHeight === 0) return;

      const ratio = Math.min(2, window.devicePixelRatio);
      canvas.width = clientWidth * ratio;
      canvas.height = clientHeight * ratio;

      const context = canvas.getContext('2d');
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, clientWidth, clientHeight);

      if (layers === 0) return;
      const bandHeight = clientHeight / layers;

      for (let index = 0; index < layers; index++) {
        // Layer 0 is the bottom of the print, so it belongs at the bottom.
        const y = clientHeight - (index + 1) * bandHeight;

        if (showTd) {
          const filament = filamentAtLayer(entries, index);
          // Opaque filaments read dark, translucent ones light.
          const shade = filament ? Math.min(1, filament.td / 6) : 0;
          const level = Math.round(shade * 255);
          context.fillStyle = `rgb(${level}, ${level}, ${level})`;
        } else {
          context.fillStyle = rgbToCss(column[index]);
        }

        context.fillRect(0, y, clientWidth, Math.ceil(bandHeight) + 0.5);
      }
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [column, entries, layers, showTd]);

  /** Layer under a pointer position inside the track. */
  const layerAt = (clientY: number): number => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || layers === 0) return 0;
    const fraction = 1 - (clientY - rect.top) / rect.height;
    return Math.min(layers - 1, Math.max(0, Math.floor(fraction * layers)));
  };

  useEffect(() => {
    if (dragging === null) return;

    const onMove = (event: PointerEvent) => setStackSlotStart(dragging, layerAt(event.clientY));
    const onUp = () => setDragging(null);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // layerAt reads refs only, so it does not need to be a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, layers, setStackSlotStart]);

  const hovered = hover ? column[hover.layer] : null;
  const hoveredFilament = hover ? filamentAtLayer(entries, hover.layer) : null;

  return (
    <div className={styles.root}>
      <div
        ref={trackRef}
        className={styles.track}
        data-add-mode={addMode || undefined}
        onPointerMove={(event) =>
          setHover({ layer: layerAt(event.clientY), x: event.clientX, y: event.clientY })
        }
        onPointerLeave={() => setHover(null)}
        onClick={(event) => {
          if (!addMode) return;
          // Repeat the filament below the new swap; the user picks the colour after.
          const layer = layerAt(event.clientY);
          const below = filamentAtLayer(entries, layer);
          if (below) addToStack(below.id, layer);
          setAddMode(false);
        }}
      >
        <canvas ref={canvasRef} className={styles.canvas} />

        {layers === 0 && <span className={styles.empty}>{t('colorCore.empty')}</span>}

        {entries.map((entry, index) =>
          index === 0 ? null : (
            <button
              key={`${entry.filament.id}-${index}`}
              type="button"
              className={styles.marker}
              style={{
                bottom: `${(entry.startLayer / Math.max(1, layers)) * 100}%`,
                borderColor: entry.filament.color,
              }}
              title={t('colorCore.marker', { layer: entry.startLayer + 1, name: entry.filament.name })}
              aria-label={t('colorCore.marker', {
                layer: entry.startLayer + 1,
                name: entry.filament.name,
              })}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setDragging(index);
              }}
            >
              {entry.startLayer + 1}
            </button>
          ),
        )}
      </div>

      <div className={styles.buttons}>
        <button
          type="button"
          className={styles.button}
          data-active={showTd || undefined}
          title={t('colorCore.showTdTip')}
          onClick={() => setShowTd((current) => !current)}
        >
          TD
        </button>
        <button
          type="button"
          className={styles.button}
          data-active={addMode || undefined}
          title={t('colorCore.addSwapTip')}
          disabled={entries.length === 0}
          onClick={() => setAddMode((current) => !current)}
        >
          +
        </button>
      </div>

      {hover && hovered && (
        <div className={styles.tooltip} style={{ left: hover.x + 12, top: hover.y }}>
          <strong>
            {t('colorCore.layer')} {hover.layer + 1}
          </strong>
          <span>{layerTop(hover.layer, heights.layerHeight, heights.firstLayerHeight).toFixed(2)} mm</span>
          {hoveredFilament && <span>{hoveredFilament.name}</span>}
          <span className={styles.hex}>
            <span className={styles.chip} style={{ background: rgbToCss(hovered) }} />
            {rgbToCss(hovered)}
          </span>
        </div>
      )}
    </div>
  );
}
