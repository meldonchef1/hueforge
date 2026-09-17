import i18n from '../i18n';
import { resolveStack } from '../core/stack';
import { swapSteps } from '../core/swaps';
import { useAppStore } from '../store/useAppStore';

/**
 * A short text summary of the stack, for pasting into a forum post or a message
 * — the thing people actually swap when they share a HueForge result.
 */
export function describeSettings(): string {
  const { doc, library, computed } = useAppStore.getState();
  const entries = resolveStack(doc.stack, library);
  const { layerHeight, firstLayerHeight } = doc.heights;
  const t = i18n.t;

  const lines = [
    t('describe.heading', {
      width: doc.geometry.widthMm.toFixed(0),
      height: doc.geometry.heightMm.toFixed(0),
      depth: computed.maxHeight.toFixed(2),
    }),
    t('describe.layers', {
      layer: layerHeight.toFixed(2),
      first: firstLayerHeight.toFixed(2),
      count: computed.layers,
    }),
  ];

  for (const step of swapSteps(entries, layerHeight, firstLayerHeight)) {
    lines.push(
      t('describe.step', {
        layer: step.layer,
        filament: `${step.filament.brand} ${step.filament.name}`.trim(),
        td: step.filament.td.toFixed(2),
      }),
    );
  }

  return lines.join('\n');
}

/** Puts the summary on the clipboard. Returns false when the browser refuses. */
export async function copyDescription(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(describeSettings());
    return true;
  } catch {
    return false;
  }
}
