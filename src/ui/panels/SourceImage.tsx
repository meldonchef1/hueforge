import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { meshBus } from '../../store/meshBus';
import { luminanceField, type LuminanceModel } from '../../core/brightness';
import { SegmentedControl } from '../components/SegmentedControl';
import { imageFromDataTransfer, loadImageFile } from '../loadImage';
import styles from './SourceImage.module.css';

interface Probe {
  /** Position inside the image, 0..1. */
  u: number;
  v: number;
  brightness: number;
  heightMm: number | null;
}

export function SourceImage() {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pixels = useAppStore((s) => s.source.pixels);
  const name = useAppStore((s) => s.source.name);
  const setImage = useAppStore((s) => s.setImage);
  const model = useAppStore((s) => s.doc.geometry.brightness.model);
  const srgb = useAppStore((s) => s.doc.geometry.brightness.srgb);
  const border = useAppStore((s) => s.doc.geometry.border);
  const geometry = useAppStore((s) => s.doc.geometry);
  const setGeometry = useAppStore((s) => s.setGeometry);

  const [dragging, setDragging] = useState(false);
  const [probe, setProbe] = useState<Probe | null>(null);
  const [failed, setFailed] = useState(false);

  const accept = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setFailed(false);
      try {
        const loaded = await loadImageFile(file);
        setImage(loaded.pixels, loaded.name);
        setProbe(null);
      } catch {
        setFailed(true);
      }
    },
    [setImage],
  );

  // Paste anywhere in the app drops the image here.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const file = imageFromDataTransfer(event.clipboardData);
      if (file) {
        event.preventDefault();
        void accept(file);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [accept]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pixels) return;
    canvas.width = pixels.width;
    canvas.height = pixels.height;
    canvas.getContext('2d')?.putImageData(pixels, 0, 0);
  }, [pixels]);

  const sample = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!pixels) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const u = (event.clientX - rect.left) / rect.width;
    const v = (event.clientY - rect.top) / rect.height;

    const x = Math.min(pixels.width - 1, Math.max(0, Math.round(u * (pixels.width - 1))));
    const y = Math.min(pixels.height - 1, Math.max(0, Math.round(v * (pixels.height - 1))));
    const offset = (y * pixels.width + x) * 4;
    const one = luminanceField(pixels.data.slice(offset, offset + 4), 1, 1, model, srgb);

    setProbe({ u, v, brightness: one.data[0], heightMm: heightAt(u, v) });
  };

  /** Reads the built height map, accounting for the frame the relief sits inside. */
  const heightAt = (u: number, v: number): number | null => {
    const mesh = meshBus.get();
    if (!mesh) return null;

    let mu = u;
    let mv = v;
    if (border.enabled && border.width > 0) {
      const bu = Math.min(0.5, border.width / geometry.widthMm);
      const bv = Math.min(0.5, border.width / geometry.heightMm);
      mu = bu + u * (1 - 2 * bu);
      mv = bv + v * (1 - 2 * bv);
    }

    const col = Math.min(mesh.cols - 1, Math.max(0, Math.round(mu * (mesh.cols - 1))));
    const row = Math.min(mesh.rows - 1, Math.max(0, Math.round(mv * (mesh.rows - 1))));
    return mesh.heights[row * mesh.cols + col];
  };

  const models: { value: LuminanceModel; label: string }[] = [
    { value: 'rec709', label: t('sourceImage.models.rec709') },
    { value: 'rec601', label: t('sourceImage.models.rec601') },
    { value: 'average', label: t('sourceImage.models.average') },
    { value: 'perceptual', label: t('sourceImage.models.perceptual') },
  ];

  return (
    <div className={styles.root}>
      <div
        className={styles.stage}
        data-dragging={dragging || undefined}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void accept(imageFromDataTransfer(event.dataTransfer));
        }}
      >
        {pixels ? (
          <>
            <canvas
              ref={canvasRef}
              className={styles.image}
              role="img"
              aria-label={t('sourceImage.label')}
              onClick={sample}
            />
            <span className={styles.badge}>{t('sourceImage.label')}</span>
            {probe && (
              <span
                className={styles.pin}
                style={{ left: `${probe.u * 100}%`, top: `${probe.v * 100}%` }}
                aria-hidden="true"
              />
            )}
          </>
        ) : (
          <button type="button" className={styles.dropzone} onClick={() => inputRef.current?.click()}>
            <strong>{t('sourceImage.drop.title')}</strong>
            <span>{t('sourceImage.drop.hint')}</span>
            {failed && <span className={styles.failed}>{t('sourceImage.drop.failed')}</span>}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className={styles.file}
          onChange={(event) => void accept(event.target.files?.[0] ?? null)}
        />
      </div>

      <div className={styles.controls}>
        <div className={styles.row}>
          <span className={styles.rowLabel}>{t('sourceImage.model')}</span>
          <SegmentedControl<LuminanceModel>
            ariaLabel={t('sourceImage.model')}
            value={model}
            onChange={(next) =>
              setGeometry({ brightness: { ...geometry.brightness, model: next } })
            }
            options={models}
          />
        </div>

        {pixels && (
          <div className={styles.readout}>
            <span className={styles.fileName} title={name}>
              {name} · {pixels.width}×{pixels.height}
            </span>
            {probe ? (
              <span className={styles.probe}>
                {t('sourceImage.probe.brightness')} {(probe.brightness * 100).toFixed(0)} %
                {probe.heightMm !== null && (
                  <> · {t('sourceImage.probe.height')} {probe.heightMm.toFixed(2)} mm</>
                )}
              </span>
            ) : (
              <span className={styles.hint}>{t('sourceImage.probe.hint')}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
