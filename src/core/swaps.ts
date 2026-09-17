import type { Filament } from './filament';
import type { StackEntry } from './simulation';
import { layerTop } from './units';

/**
 * Where the printer has to stop and have a filament changed.
 *
 * Only the structure lives here; the wording belongs to the interface, which
 * has the translations. That also keeps the exported file in the user's
 * language without core knowing anything about i18n.
 */
export interface SwapStep {
  /** Layer the new filament starts on, 1-based, as a slicer counts them. */
  layer: number;
  /** Height at which the swap happens, in mm. */
  heightMm: number;
  filament: Filament;
  /** True for the filament the print starts with, which is not a swap. */
  isStart: boolean;
}

export function swapSteps(
  entries: StackEntry[],
  layerHeight: number,
  firstLayerHeight: number,
): SwapStep[] {
  return entries.map((entry, index) => ({
    layer: entry.startLayer + 1,
    // The swap happens once the layer below is finished.
    heightMm:
      entry.startLayer === 0 ? 0 : layerTop(entry.startLayer - 1, layerHeight, firstLayerHeight),
    filament: entry.filament,
    isStart: index === 0,
  }));
}
