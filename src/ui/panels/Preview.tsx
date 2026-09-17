import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Viewer } from '../../render/Viewer';
import { meshBus } from '../../store/meshBus';
import { useAppStore } from '../../store/useAppStore';
import { LIGHT_TEMPERATURES } from '../../store/types';
import { useSimulatedColumn } from '../hooks/useSimulatedColumn';
import styles from './Preview.module.css';

export function Preview() {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<Viewer | null>(null);

  const hasImage = useAppStore((s) => s.source.pixels !== null);
  const computing = useAppStore((s) => s.computed.computing);
  const error = useAppStore((s) => s.computed.error);
  const wireframe = useAppStore((s) => s.view.wireframe);
  const light = useAppStore((s) => s.view.light);
  const lightIntensity = useAppStore((s) => s.view.lightIntensity);
  const cameraResetNonce = useAppStore((s) => s.view.cameraResetNonce);
  const setStatus = useAppStore((s) => s.setStatus);
  const heights = useAppStore((s) => s.doc.heights);
  const column = useSimulatedColumn();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const viewer = new Viewer(canvas);
    viewerRef.current = viewer;
    viewer.setMesh(meshBus.get());
    viewer.resetCamera();

    let pending: number | undefined;
    viewer.onFps = (fps) => {
      // Batched into an animation frame so the status bar never drives the loop.
      cancelAnimationFrame(pending ?? 0);
      pending = requestAnimationFrame(() => setStatus({ fps }));
    };

    const unsubscribe = meshBus.subscribe((mesh) => {
      viewer.setMesh(mesh);
      if (mesh) viewer.resetCamera();
    });

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      viewer.resize(width, height);
    });
    observer.observe(canvas.parentElement ?? canvas);

    return () => {
      unsubscribe();
      observer.disconnect();
      cancelAnimationFrame(pending ?? 0);
      viewer.dispose();
      viewerRef.current = null;
    };
  }, [setStatus]);

  useEffect(() => viewerRef.current?.setWireframe(wireframe), [wireframe]);

  useEffect(() => {
    viewerRef.current?.setSimulation(
      column.length > 0 ? column : null,
      heights.layerHeight,
      heights.firstLayerHeight,
    );
  }, [column, heights]);

  useEffect(() => {
    viewerRef.current?.setLight({
      kelvin: LIGHT_TEMPERATURES[light],
      intensity: lightIntensity,
    });
  }, [light, lightIntensity]);

  useEffect(() => {
    // Skips the very first run: the viewer already framed the model on mount.
    if (cameraResetNonce === 0) return;
    viewerRef.current?.resetCamera();
  }, [cameraResetNonce]);

  return (
    <div className={styles.root}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onDoubleClick={() => viewerRef.current?.resetCamera()}
      />
      <span className={styles.badge}>{t('preview.label')}</span>
      {!hasImage && <div className={styles.empty}>{t('preview.noImage')}</div>}
      {computing && hasImage && <div className={styles.busy}>{t('preview.computing')}</div>}
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}
