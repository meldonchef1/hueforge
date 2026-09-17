import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { NumberInput } from '../components/NumberInput';
import { Checkbox } from '../components/Checkbox';
import { Slider } from '../components/Slider';
import { useAppStore } from '../../store/useAppStore';
import { quantise } from '../../core/heightmap';
import { isMultipleOf } from '../../core/units';
import styles from './ModelGeometry.module.css';

export function ModelGeometry() {
  const { t } = useTranslation();

  const geometry = useAppStore((s) => s.doc.geometry);
  const heights = useAppStore((s) => s.doc.heights);
  const setGeometry = useAppStore((s) => s.setGeometry);
  const pixels = useAppStore((s) => s.source.pixels);
  const computed = useAppStore((s) => s.computed);

  const aspect = pixels ? pixels.width / pixels.height : geometry.widthMm / geometry.heightMm;
  const brightness = geometry.brightness;
  const setBrightness = (patch: Partial<typeof brightness>) =>
    setGeometry({ brightness: { ...brightness, ...patch } });

  const setWidth = (widthMm: number) =>
    setGeometry(
      geometry.lockAspect
        ? { widthMm, heightMm: Number((widthMm / aspect).toFixed(2)) }
        : { widthMm },
    );

  const setHeight = (heightMm: number) =>
    setGeometry(
      geometry.lockAspect
        ? { heightMm, widthMm: Number((heightMm * aspect).toFixed(2)) }
        : { heightMm },
    );

  const multipleOfLayer = (value: number) =>
    isMultipleOf(value, heights.layerHeight)
      ? null
      : t('topBar.heights.notMultiple', { layerHeight: heights.layerHeight });

  // What the mesh will actually reach once the depth is snapped to whole layers.
  const effectiveDepth = geometry.dynamicDepth
    ? quantise(geometry.maxDepth, heights.layerHeight, heights.firstLayerHeight)
    : geometry.maxDepth;

  return (
    <div className={styles.root}>
      <Section title={t('geometry.size.group')}>
        <NumberInput
          label={t('geometry.size.width')}
          tooltip={t('geometry.size.widthTip')}
          value={geometry.widthMm}
          step={1}
          precision={2}
          min={1}
          max={1000}
          unit="mm"
          onChange={setWidth}
        />
        <NumberInput
          label={t('geometry.size.height')}
          tooltip={t('geometry.size.heightTip')}
          value={geometry.heightMm}
          step={1}
          precision={2}
          min={1}
          max={1000}
          unit="mm"
          onChange={setHeight}
        />
        <Checkbox
          label={t('geometry.size.lockAspect')}
          tooltip={t('geometry.size.lockAspectTip')}
          checked={geometry.lockAspect}
          onChange={(lockAspect) => setGeometry({ lockAspect })}
        />
        <NumberInput
          label={t('geometry.size.detail')}
          tooltip={t('geometry.size.detailTip')}
          value={geometry.detailMm}
          step={0.05}
          min={0.05}
          max={5}
          unit="mm"
          onChange={(detailMm) => setGeometry({ detailMm })}
        />
      </Section>

      <Section title={t('geometry.border.group')}>
        <Checkbox
          label={t('geometry.border.none')}
          tooltip={t('geometry.border.noneTip')}
          checked={!geometry.border.enabled}
          onChange={(none) => setGeometry({ border: { ...geometry.border, enabled: !none } })}
        />
        <NumberInput
          label={t('geometry.border.width')}
          tooltip={t('geometry.border.widthTip')}
          value={geometry.border.width}
          step={0.5}
          min={0}
          max={50}
          unit="mm"
          disabled={!geometry.border.enabled}
          onChange={(width) => setGeometry({ border: { ...geometry.border, width } })}
        />
        <NumberInput
          label={t('geometry.border.depth')}
          tooltip={t('geometry.border.depthTip')}
          value={geometry.border.depth}
          step={heights.layerHeight}
          min={heights.firstLayerHeight}
          max={20}
          unit="mm"
          disabled={!geometry.border.enabled}
          validate={multipleOfLayer}
          onChange={(depth) => setGeometry({ border: { ...geometry.border, depth } })}
        />
      </Section>

      <Section title={t('geometry.depth.group')}>
        <NumberInput
          label={t('geometry.depth.base')}
          tooltip={t('geometry.depth.baseTip')}
          value={geometry.baseThickness}
          step={heights.layerHeight}
          min={heights.firstLayerHeight}
          max={10}
          unit="mm"
          validate={multipleOfLayer}
          onChange={(baseThickness) => setGeometry({ baseThickness })}
        />
        <NumberInput
          label={t('geometry.depth.max')}
          tooltip={t('geometry.depth.maxTip')}
          value={geometry.maxDepth}
          step={heights.layerHeight}
          min={heights.firstLayerHeight}
          max={50}
          unit="mm"
          onChange={(maxDepth) => setGeometry({ maxDepth })}
        />
        <Checkbox
          label={t('geometry.depth.dynamic')}
          tooltip={t('geometry.depth.dynamicTip')}
          checked={geometry.dynamicDepth}
          onChange={(dynamicDepth) => setGeometry({ dynamicDepth })}
        />
        <Readout
          label={t('geometry.depth.actual')}
          value={`${effectiveDepth.toFixed(2)} mm`}
          hint={t('geometry.depth.layers', { count: computed.layers })}
        />
      </Section>

      <Section title={t('geometry.brightness.group')}>
        <Checkbox
          label={t('geometry.brightness.srgb')}
          tooltip={t('geometry.brightness.srgbTip')}
          checked={brightness.srgb}
          onChange={(srgb) => setBrightness({ srgb })}
        />
        <Slider
          label={t('geometry.brightness.compensation')}
          tooltip={t('geometry.brightness.compensationTip')}
          value={brightness.compensation}
          min={0.2}
          max={3}
          step={0.05}
          onChange={(compensation) => setBrightness({ compensation })}
          format={(value) => value.toFixed(2)}
        />
        <Slider
          label={t('geometry.brightness.adjustment')}
          tooltip={t('geometry.brightness.adjustmentTip')}
          value={brightness.adjustment}
          min={-0.5}
          max={0.5}
          step={0.01}
          onChange={(adjustment) => setBrightness({ adjustment })}
          format={(value) => value.toFixed(2)}
        />
        <Slider
          label={t('geometry.brightness.smoothing')}
          tooltip={t('geometry.brightness.smoothingTip')}
          value={brightness.smoothing}
          min={0}
          max={10}
          step={1}
          onChange={(smoothing) => setBrightness({ smoothing })}
          format={(value) => `${value} px`}
        />
        <Checkbox
          label={t('geometry.brightness.invert')}
          tooltip={t('geometry.brightness.invertTip')}
          checked={brightness.invert}
          onChange={(invert) => setBrightness({ invert })}
        />
        <Checkbox
          label={t('geometry.brightness.fullRange')}
          tooltip={t('geometry.brightness.fullRangeTip')}
          checked={brightness.fullRange}
          onChange={(fullRange) => setBrightness({ fullRange })}
        />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section} aria-label={title}>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.body}>{children}</div>
    </section>
  );
}

function Readout({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={styles.readout}>
      <span className={styles.readoutLabel}>{label}</span>
      <span className={styles.readoutValue}>{value}</span>
      {hint && <span className={styles.readoutHint}>{hint}</span>}
    </div>
  );
}
