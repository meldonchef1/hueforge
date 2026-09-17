import { useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { meshBus } from '../../store/meshBus';
import { quantise } from '../../core/heightmap';
import type { BuildMessage, WorkerResponse } from '../../workers/meshWorker';

/** Slider drags fire continuously; this waits for a pause before rebuilding. */
const REBUILD_DELAY = 140;

/**
 * Keeps the mesh in step with the image and the geometry. Every rebuild runs in
 * the worker, so dragging a slider never blocks the interface.
 */
export function useMeshPipeline() {
  const pixels = useAppStore((s) => s.source.pixels);
  const geometry = useAppStore((s) => s.doc.geometry);
  const heights = useAppStore((s) => s.doc.heights);
  const setComputed = useAppStore((s) => s.setComputed);

  const worker = useRef<Worker | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(0);

  useEffect(() => {
    const instance = new Worker(new URL('../../workers/meshWorker.ts', import.meta.url), {
      type: 'module',
    });

    instance.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      // A reply from a run that has already been superseded is worthless.
      if (message.id !== latest.current) return;

      if (message.type === 'error') {
        meshBus.set(null);
        setComputed({ computing: false, error: message.message });
        return;
      }

      const { type: _type, id: _id, ...mesh } = message;
      meshBus.set(mesh);
      setComputed({
        computing: false,
        error: null,
        triangles: mesh.triangleCount,
        maxHeight: mesh.maxHeight,
        layers: mesh.layers,
      });
    };

    worker.current = instance;
    return () => {
      instance.terminate();
      worker.current = null;
    };
  }, [setComputed]);

  // Hand the pixels over once per image, not once per parameter change.
  useEffect(() => {
    if (!worker.current || !pixels) return;
    worker.current.postMessage({
      type: 'image',
      pixels: pixels.data.buffer.slice(0),
      width: pixels.width,
      height: pixels.height,
    });
  }, [pixels]);

  useEffect(() => {
    if (!pixels) {
      meshBus.set(null);
      return;
    }

    setComputed({ computing: true });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const instance = worker.current;
      if (!instance) return;

      const maxDepth = geometry.dynamicDepth
        ? quantise(geometry.maxDepth, heights.layerHeight, heights.firstLayerHeight)
        : geometry.maxDepth;

      const message: BuildMessage = {
        type: 'build',
        id: ++latest.current,
        widthMm: geometry.widthMm,
        heightMm: geometry.heightMm,
        detailMm: geometry.detailMm,
        baseThickness: geometry.baseThickness,
        maxDepth,
        layerHeight: heights.layerHeight,
        firstLayerHeight: heights.firstLayerHeight,
        border: geometry.border,
        brightness: geometry.brightness,
        cropToAlpha: geometry.cropToAlpha,
      };
      instance.postMessage(message);
    }, REBUILD_DELAY);

    return () => clearTimeout(timer.current);
  }, [pixels, geometry, heights, setComputed]);
}
