import { useTranslation } from 'react-i18next';
import { NumberInput } from '../components/NumberInput';
import { SegmentedControl } from '../components/SegmentedControl';
import { Slider } from '../components/Slider';
import { useAppStore } from '../../store/useAppStore';
import { isMultipleOf } from '../../core/units';
import type { LightKind, PrintMode } from '../../store/types';
import styles from './TopBar.module.css';

export function TopBar() {
  const { t } = useTranslation();

  const mode = useAppStore((s) => s.doc.mode);
  const heights = useAppStore((s) => s.doc.heights);
  const commit = useAppStore((s) => s.commit);

  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const resetCamera = useAppStore((s) => s.resetCamera);

  const multipleOfLayer = (value: number) =>
    isMultipleOf(value, heights.layerHeight)
      ? null
      : t('topBar.heights.notMultiple', { layerHeight: heights.layerHeight });

  return (
    <div className={styles.bar}>
      <Group label={t('topBar.light.group')}>
        <SegmentedControl<LightKind>
          ariaLabel={t('topBar.light.kind')}
          value={view.light}
          onChange={(light) => setView({ light })}
          options={[
            { value: 'warm', label: t('topBar.light.warm') },
            { value: 'neutral', label: t('topBar.light.neutral') },
            { value: 'daylight', label: t('topBar.light.daylight') },
          ]}
        />
        <Slider
          label={t('topBar.light.intensity')}
          tooltip={t('topBar.light.intensityTip')}
          value={view.lightIntensity}
          min={0}
          max={2}
          step={0.05}
          onChange={(lightIntensity) => setView({ lightIntensity })}
          format={(value) => value.toFixed(2)}
        />
      </Group>

      <Group label={t('topBar.view.group')}>
        <button type="button" className={styles.button} onClick={resetCamera}>
          {t('topBar.view.resetCamera')}
        </button>
        <button
          type="button"
          className={styles.button}
          data-active={view.wireframe || undefined}
          aria-pressed={view.wireframe}
          onClick={() => setView({ wireframe: !view.wireframe })}
        >
          {t('topBar.view.wireframe')}
        </button>
        <button type="button" className={styles.button} disabled>
          {t('topBar.view.regenerateMesh')}
        </button>
        <button type="button" className={styles.button} disabled>
          {t('topBar.view.describe')}
        </button>
      </Group>

      <Group label={t('topBar.mode.group')}>
        <SegmentedControl<PrintMode>
          ariaLabel={t('topBar.mode.group')}
          value={mode}
          onChange={(next) => commit((doc) => ({ ...doc, mode: next }))}
          options={[
            { value: 'filament', label: t('topBar.mode.filament'), tooltip: t('topBar.mode.tip') },
            { value: 'lithophane', label: t('topBar.mode.lithophane'), tooltip: t('topBar.mode.tip') },
          ]}
        />
      </Group>

      <Group label={t('topBar.heights.group')}>
        <NumberInput
          label={t('topBar.heights.layerHeight')}
          tooltip={t('topBar.heights.layerHeightTip')}
          value={heights.layerHeight}
          step={0.01}
          min={0.01}
          max={1}
          unit="mm"
          onChange={(layerHeight) =>
            commit((doc) => ({ ...doc, heights: { ...doc.heights, layerHeight } }))
          }
        />
        <NumberInput
          label={t('topBar.heights.firstLayerHeight')}
          tooltip={t('topBar.heights.firstLayerHeightTip')}
          value={heights.firstLayerHeight}
          step={heights.layerHeight}
          min={heights.layerHeight}
          max={1}
          unit="mm"
          validate={multipleOfLayer}
          onChange={(firstLayerHeight) =>
            commit((doc) => ({ ...doc, heights: { ...doc.heights, firstLayerHeight } }))
          }
        />
        <NumberInput
          label={t('topBar.heights.heightStep')}
          tooltip={t('topBar.heights.heightStepTip')}
          value={heights.heightStep}
          step={heights.layerHeight}
          min={heights.layerHeight}
          max={5}
          unit="mm"
          validate={multipleOfLayer}
          onChange={(heightStep) =>
            commit((doc) => ({ ...doc, heights: { ...doc.heights, heightStep } }))
          }
        />
      </Group>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className={styles.group} aria-label={label}>
      <span className={styles.groupLabel}>{label}</span>
      <div className={styles.groupBody}>{children}</div>
    </section>
  );
}
