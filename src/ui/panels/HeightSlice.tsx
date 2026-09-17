import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { VerticalSlider } from '../components/VerticalSlider';
import { layerTop } from '../../core/units';
import styles from './HeightSlice.module.css';

/**
 * Cuts the preview off at a chosen height, so you can see what the print looks
 * like after each swap rather than only when it is finished.
 */
export function HeightSlice() {
  const { t } = useTranslation();

  const slice = useAppStore((s) => s.view.sliceHeight);
  const setView = useAppStore((s) => s.setView);
  const layers = useAppStore((s) => s.computed.layers);
  const maxHeight = useAppStore((s) => s.computed.maxHeight);
  const heights = useAppStore((s) => s.doc.heights);

  // Which layer the cut currently sits on, so the readout speaks in layers.
  const layer = layers > 0 ? Math.max(1, Math.round(slice * layers)) : 0;
  const heightMm =
    layers > 0 ? layerTop(layer - 1, heights.layerHeight, heights.firstLayerHeight) : 0;
  const full = slice >= 1;

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.reset}
        title={t('slice.reset')}
        disabled={full}
        onClick={() => setView({ sliceHeight: 1 })}
      >
        {t('slice.full')}
      </button>

      <div className={styles.track}>
        <VerticalSlider
          label={t('slice.label')}
          value={slice}
          min={0}
          max={1}
          step={0.005}
          disabled={layers === 0}
          onChange={(sliceHeight) => setView({ sliceHeight })}
        />
      </div>

      <div className={styles.readout}>
        {layers === 0 ? (
          <span className={styles.muted}>—</span>
        ) : (
          <>
            <span className={styles.layer}>{full ? layers : layer}</span>
            <span className={styles.height}>{(full ? maxHeight : heightMm).toFixed(2)}</span>
            <span className={styles.unit}>mm</span>
          </>
        )}
      </div>
    </div>
  );
}
