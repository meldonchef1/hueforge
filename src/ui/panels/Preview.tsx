import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Viewer } from '../../render/Viewer';
import { activeViewer } from '../../render/activeViewer';
import { meshBus } from '../../store/meshBus';
import { useAppStore } from '../../store/useAppStore';
import { LIGHT_TEMPERATURES } from '../../store/types';
import { useSimulatedColumn } from '../hooks/useSimulatedColumn';
import { CompareOverlay } from './CompareOverlay';
import { appendPoint, type SpotPoint } from '../../core/spotFix';
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
  const sliceHeight = useAppStore((s) => s.view.sliceHeight);
  // Re-applies the cut when a rebuild changes how tall the model is.
  const maxHeight = useAppStore((s) => s.computed.maxHeight);
  const column = useSimulatedColumn();

  const compare = useAppStore((s) => s.view.compare);
  const brushActive = useAppStore((s) => s.view.brushActive);
  const brushRadius = useAppStore((s) => s.view.brushRadius);
  const brushStrength = useAppStore((s) => s.view.brushStrength);
  const addSpotStroke = useAppStore((s) => s.addSpotStroke);
  const stroke = useRef<SpotPoint[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const viewer = new Viewer(canvas);
    viewerRef.current = viewer;
    activeViewer.set(viewer);
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
      activeViewer.set(null);
    };
  }, [setStatus]);

  useEffect(() => viewerRef.current?.setWireframe(wireframe), [wireframe]);

  useEffect(() => viewerRef.current?.setSlice(sliceHeight), [sliceHeight, maxHeight]);

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

  // Orbiting and painting would otherwise fight over the same drag.
  useEffect(() => viewerRef.current?.setOrbitEnabled(!brushActive), [brushActive]);

  /** Adds the point under the pointer to the stroke being drawn. */
  function paint(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!brushActive || event.buttons === 0) return;
    const viewer = viewerRef.current;
    if (!viewer) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const hit = viewer.pick(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -(((event.clientY - rect.top) / rect.height) * 2 - 1),
    );
    if (!hit) return;

    // A quarter of the brush radius is close enough to look continuous.
    stroke.current = appendPoint(stroke.current, hit, brushRadius / 4);
  }

  return (
    <div className={styles.root}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        data-painting={brushActive || undefined}
        onDoubleClick={() => viewerRef.current?.resetCamera()}
        onPointerDown={(event) => {
          if (!brushActive) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          stroke.current = [];
          paint(event);
        }}
        onPointerMove={paint}
        onPointerUp={(event) => {
          if (!brushActive) return;
          event.currentTarget.releasePointerCapture(event.pointerId);
          if (stroke.current.length > 0) {
            addSpotStroke({
              points: stroke.current,
              radius: brushRadius,
              strength: brushStrength,
            });
          }
          stroke.current = [];
        }}
      />
      <CompareOverlay />
      {/* The split view labels both sides itself, so this would be a duplicate. */}
      {compare === 'off' && <span className={styles.badge}>{t('preview.label')}</span>}
      {!hasImage && <div className={styles.empty}>{t('preview.noImage')}</div>}
      {computing && hasImage && <div className={styles.busy}>{t('preview.computing')}</div>}
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}
