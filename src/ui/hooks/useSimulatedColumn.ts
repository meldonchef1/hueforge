import { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { LIGHT_TEMPERATURES } from '../../store/types';
import { kelvinToRgb, type Rgb } from '../../core/color';
import { resolveStack } from '../../core/stack';
import { simulateColumn } from '../../core/simulation';

/**
 * Simulated colour for every layer height, bottom to top. Feeds both the 3D
 * preview's lookup texture and the colour core, so the two cannot disagree.
 * Empty when there is no stack yet — the preview then stays plain grey.
 */
export function useSimulatedColumn(): Rgb[] {
  const stack = useAppStore((s) => s.doc.stack);
  const library = useAppStore((s) => s.library);
  const heights = useAppStore((s) => s.doc.heights);
  const mode = useAppStore((s) => s.doc.mode);
  const light = useAppStore((s) => s.view.light);
  const intensity = useAppStore((s) => s.view.lightIntensity);
  const layers = useAppStore((s) => s.computed.layers);

  return useMemo(() => {
    const entries = resolveStack(stack, library);
    if (entries.length === 0 || layers <= 0) return [];

    return simulateColumn(layers, entries, {
      layerHeight: heights.layerHeight,
      firstLayerHeight: heights.firstLayerHeight,
      light: kelvinToRgb(LIGHT_TEMPERATURES[light]),
      intensity,
      lithophane: mode === 'lithophane',
    });
  }, [stack, library, heights, mode, light, intensity, layers]);
}
