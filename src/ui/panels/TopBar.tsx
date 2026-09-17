import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NumberInput } from '../components/NumberInput';
import { SegmentedControl } from '../components/SegmentedControl';
import { Slider } from '../components/Slider';
import { useAppStore } from '../../store/useAppStore';
import { isMultipleOf } from '../../core/units';
import { copyDescription } from '../describe';
import type { CompareMode, LightKind, PrintMode } from '../../store/types';
import styles from './TopBar.module.css';

export function TopBar() {
  const { t } = useTranslation();

  const mode = useAppStore((s) => s.doc.mode);
  const heights = useAppStore((s) => s.doc.heights);
  const commit = useAppStore((s) => s.commit);

  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const resetCamera = useAppStore((s) => s.resetCamera);
  const clearSpotFix = useAppStore((s) => s.clearSpotFix);
  const hasSpotFix = useAppStore((s) => s.doc.spotFix.length > 0);
  const hasStack = useAppStore((s) => s.doc.stack.length > 0);
  const [copied, setCopied] = useState(false);

  // The "copied" label is a flash of feedback, not a state to stay in.
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

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
        <button
          type="button"
          className={styles.button}
          disabled={!hasStack}
          title={t('topBar.view.describeTip')}
          onClick={() => void copyDescription().then(setCopied)}
        >
          {copied ? t('topBar.view.describeDone') : t('topBar.view.describe')}
        </button>
      </Group>

      <Group label={t('spotFix.group')}>
        <button
          type="button"
          className={styles.button}
          data-active={view.brushActive || undefined}
          aria-pressed={view.brushActive}
          title={t('spotFix.brushTip')}
          onClick={() => setView({ brushActive: !view.brushActive })}
        >
          {t('spotFix.brush')}
        </button>
        {view.brushActive && (
          <>
            <Slider
              label={t('spotFix.size')}
              value={view.brushRadius}
              min={0.01}
              max={0.3}
              step={0.005}
              onChange={(brushRadius) => setView({ brushRadius })}
              format={(value) => `${Math.round(value * 100)} %`}
            />
            <Slider
              label={t('spotFix.strength')}
              tooltip={t('spotFix.strengthTip')}
              value={view.brushStrength}
              min={-0.5}
              max={0.5}
              step={0.01}
              onChange={(brushStrength) => setView({ brushStrength })}
              format={(value) => value.toFixed(2)}
            />
          </>
        )}
        <button
          type="button"
          className={styles.button}
          disabled={!hasSpotFix}
          onClick={clearSpotFix}
        >
          {t('spotFix.clear')}
        </button>
      </Group>

      <Group label={t('compare.group')}>
        <SegmentedControl<CompareMode>
          ariaLabel={t('compare.group')}
          value={view.compare}
          onChange={(compare) => setView({ compare })}
          options={[
            { value: 'off', label: t('compare.off') },
            { value: 'split', label: t('compare.split'), tooltip: t('compare.splitTip') },
            { value: 'overlay', label: t('compare.overlay'), tooltip: t('compare.overlayTip') },
          ]}
        />
        {view.compare === 'overlay' && (
          <Slider
            label={t('compare.amount')}
            value={view.compareAmount}
            min={0}
            max={1}
            step={0.01}
            onChange={(compareAmount) => setView({ compareAmount })}
            format={(value) => `${Math.round(value * 100)} %`}
          />
        )}
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
