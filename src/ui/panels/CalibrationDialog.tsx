import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../components/Modal';
import { NumberInput } from '../components/NumberInput';
import { Slider } from '../components/Slider';
import { ColorSwatch } from '../components/ColorSwatch';
import { useAppStore } from '../../store/useAppStore';
import { TRANSMISSION_AT_TD } from '../../core/simulation';
import {
  defaultWedgeSettings,
  tdFromStep,
  wedgeHeight,
  wedgeTable,
  type WedgeSettings,
} from '../../core/calibration';
import { exportWedgeInstructions, exportWedgeStl } from '../exports';
import type { Filament } from '../../core/filament';
import styles from './CalibrationDialog.module.css';

interface CalibrationDialogProps {
  filament: Filament;
  onClose: () => void;
}

/**
 * Measuring TD, rather than guessing it. The wedge prints steps of increasing
 * thickness over a contrasting backing; the step where the backing disappears
 * is the TD, read straight off the print.
 */
export function CalibrationDialog({ filament, onClose }: CalibrationDialogProps) {
  const { t } = useTranslation();

  const library = useAppStore((s) => s.library);
  const heights = useAppStore((s) => s.doc.heights);
  const upsertFilament = useAppStore((s) => s.upsertFilament);
  const transmissionAtTd = useAppStore((s) => s.settings.transmissionAtTd);
  const setSettingsState = useAppStore((s) => s.setSettings);

  const [settings, setSettings] = useState<WedgeSettings>(() =>
    defaultWedgeSettings(heights.layerHeight, heights.firstLayerHeight),
  );
  const [backingId, setBackingId] = useState(
    () => library.find((f) => f.id !== filament.id && f.td < 1)?.id ?? library[0]?.id ?? '',
  );
  const [measuredStep, setMeasuredStep] = useState(0);

  const backing = library.find((f) => f.id === backingId);
  const table = useMemo(() => wedgeTable(settings), [settings]);
  const measuredTd = measuredStep > 0 ? tdFromStep(measuredStep, settings) : null;

  const patch = (changes: Partial<WedgeSettings>) =>
    setSettings((current) => ({ ...current, ...changes }));

  return (
    <Modal title={t('calibration.title', { name: filament.name })} onClose={onClose}>
      <p className={styles.lead}>{t('calibration.lead')}</p>

      <section className={styles.section}>
        <h3 className={styles.heading}>{t('calibration.setup')}</h3>

        <div className={styles.row}>
          <span className={styles.rowLabel}>{t('calibration.tested')}</span>
          <span className={styles.filament}>
            <ColorSwatch color={filament.color} label={filament.name} size="sm" />
            {filament.brand} {filament.name}
          </span>
        </div>

        <div className={styles.row}>
          <label className={styles.rowLabel} htmlFor="backing">
            {t('calibration.backing')}
          </label>
          <select
            id="backing"
            className={styles.select}
            value={backingId}
            onChange={(event) => setBackingId(event.target.value)}
          >
            {library
              .filter((candidate) => candidate.id !== filament.id)
              .map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.brand} {candidate.name} (TD {candidate.td})
                </option>
              ))}
          </select>
        </div>
        <p className={styles.hint}>{t('calibration.backingHint')}</p>

        <div className={styles.fields}>
          <NumberInput
            label={t('calibration.steps')}
            tooltip={t('calibration.stepsTip')}
            value={settings.steps}
            step={1}
            min={3}
            max={40}
            onChange={(steps) => patch({ steps })}
          />
          <NumberInput
            label={t('calibration.layersPerStep')}
            tooltip={t('calibration.layersPerStepTip')}
            value={settings.layersPerStep}
            step={1}
            min={1}
            max={10}
            onChange={(layersPerStep) => patch({ layersPerStep })}
          />
          <NumberInput
            label={t('calibration.baseLayers')}
            tooltip={t('calibration.baseLayersTip')}
            value={settings.baseLayers}
            step={1}
            min={1}
            max={20}
            onChange={(baseLayers) => patch({ baseLayers })}
          />
          <NumberInput
            label={t('calibration.stepWidth')}
            value={settings.stepWidthMm}
            step={1}
            min={2}
            max={30}
            unit="mm"
            onChange={(stepWidthMm) => patch({ stepWidthMm })}
          />
          <NumberInput
            label={t('calibration.depth')}
            value={settings.depthMm}
            step={1}
            min={5}
            max={100}
            unit="mm"
            onChange={(depthMm) => patch({ depthMm })}
          />
        </div>

        <p className={styles.summary}>
          {t('calibration.summary', {
            width: (settings.steps * settings.stepWidthMm).toFixed(0),
            depth: settings.depthMm.toFixed(0),
            height: wedgeHeight(settings).toFixed(2),
            max: tdFromStep(settings.steps, settings).toFixed(2),
          })}
        </p>

        <div className={styles.buttons}>
          <button
            type="button"
            className={styles.button}
            onClick={() => exportWedgeStl(settings, filament)}
          >
            {t('calibration.exportStl')}
          </button>
          <button
            type="button"
            className={styles.button}
            disabled={!backing}
            onClick={() => backing && exportWedgeInstructions(settings, filament, backing)}
          >
            {t('calibration.exportInstructions')}
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.heading}>{t('calibration.measure')}</h3>
        <p className={styles.hint}>{t('calibration.measureHint')}</p>

        <div className={styles.measureRow}>
          <NumberInput
            label={t('calibration.step')}
            value={measuredStep}
            step={1}
            min={0}
            max={settings.steps}
            onChange={setMeasuredStep}
          />
          <span className={styles.result}>
            {measuredTd === null ? (
              <span className={styles.hint}>{t('calibration.noMeasurement')}</span>
            ) : (
              <>
                <strong>TD {measuredTd.toFixed(2)} mm</strong>
                <span className={styles.hint}>
                  {t('calibration.wasTd', { td: filament.td.toFixed(2) })}
                </span>
              </>
            )}
          </span>
          <button
            type="button"
            className={styles.primary}
            disabled={measuredTd === null}
            onClick={() => {
              if (measuredTd === null) return;
              upsertFilament({ ...filament, td: measuredTd });
              onClose();
            }}
          >
            {t('calibration.save')}
          </button>
        </div>
      </section>

      <details className={styles.section}>
        <summary className={styles.heading}>{t('calibration.model')}</summary>
        <p className={styles.hint}>{t('calibration.modelHint')}</p>
        <div className={styles.measureRow}>
          <Slider
            label={t('calibration.atTd')}
            tooltip={t('calibration.atTdTip')}
            value={transmissionAtTd}
            min={0.02}
            max={0.4}
            step={0.01}
            onChange={(value) => setSettingsState({ transmissionAtTd: value })}
            format={(value) => `${(value * 100).toFixed(0)} %`}
          />
          <button
            type="button"
            className={styles.button}
            disabled={transmissionAtTd === TRANSMISSION_AT_TD}
            onClick={() => setSettingsState({ transmissionAtTd: TRANSMISSION_AT_TD })}
          >
            {t('calibration.reset')}
          </button>
        </div>
      </details>

      <details className={styles.section}>
        <summary className={styles.heading}>{t('calibration.table')}</summary>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('calibration.step')}</th>
              <th>{t('calibration.thickness')}</th>
              <th>{t('calibration.total')}</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row) => (
              <tr key={row.step}>
                <td>{row.step}</td>
                <td>{row.thicknessMm.toFixed(2)} mm</td>
                <td>{row.totalMm.toFixed(2)} mm</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </Modal>
  );
}
