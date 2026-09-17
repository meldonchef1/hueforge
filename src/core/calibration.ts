import type { HeightMap } from './heightmap';
import { layerTop } from './units';

/**
 * Generates the step wedge used to measure a filament's TD.
 *
 * The wedge is a slab of a contrasting backing filament with steps of the
 * tested filament on top, each one thicker than the last. Printed, it shows the
 * exact thickness at which the backing stops showing through — which is what TD
 * means. No model fits that number for you; the print does.
 */

export interface WedgeSettings {
  /** How many steps the wedge has. */
  steps: number;
  /** Layers of the tested filament added per step. */
  layersPerStep: number;
  /** Layers of backing filament under the whole wedge. */
  baseLayers: number;
  /** Width of one step in mm. */
  stepWidthMm: number;
  /** Depth of the wedge in mm. */
  depthMm: number;
  layerHeight: number;
  firstLayerHeight: number;
}

export const defaultWedgeSettings = (
  layerHeight: number,
  firstLayerHeight: number,
): WedgeSettings => ({
  steps: 12,
  layersPerStep: 2,
  baseLayers: 4,
  stepWidthMm: 8,
  depthMm: 20,
  layerHeight,
  firstLayerHeight,
});

/** Thickness of tested filament on a given step, 1-based, in mm. */
export function stepThickness(step: number, settings: WedgeSettings): number {
  if (step < 1) return 0;
  return Number((step * settings.layersPerStep * settings.layerHeight).toFixed(6));
}

/**
 * TD measured from the wedge: the thickness of the step where the backing
 * stopped showing through.
 */
export const tdFromStep = stepThickness;

/** First layer printed in the tested filament, 0-based. */
export const swapLayer = (settings: WedgeSettings) => settings.baseLayers;

/** Height of the backing slab, in mm. */
export function baseHeight(settings: WedgeSettings): number {
  return layerTop(settings.baseLayers - 1, settings.layerHeight, settings.firstLayerHeight);
}

/** Total height of the tallest step, in mm. */
export function wedgeHeight(settings: WedgeSettings): number {
  return Number((baseHeight(settings) + stepThickness(settings.steps, settings)).toFixed(6));
}

export function buildWedgeHeightMap(settings: WedgeSettings): HeightMap {
  const { steps, stepWidthMm, depthMm } = settings;
  // Two samples per step is enough: the top of a step is flat, and the riser
  // between steps is one cell wide either way.
  const samplesPerStep = 2;
  const cols = steps * samplesPerStep + 1;
  const rows = 3;

  const widthMm = steps * stepWidthMm;
  const base = baseHeight(settings);
  const data = new Float32Array(cols * rows);

  for (let col = 0; col < cols; col++) {
    // The last column belongs to the final step, not to a step past the end.
    const step = Math.min(steps - 1, Math.floor(col / samplesPerStep));
    const height = base + stepThickness(step + 1, settings);
    for (let row = 0; row < rows; row++) data[row * cols + col] = height;
  }

  return {
    cols,
    rows,
    data,
    cellX: widthMm / (cols - 1),
    cellY: depthMm / (rows - 1),
    widthMm,
    heightMm: depthMm,
    minHeight: base + stepThickness(1, settings),
    maxHeight: wedgeHeight(settings),
    layers: Math.round((wedgeHeight(settings) - settings.firstLayerHeight) / settings.layerHeight) + 1,
    solid: new Uint8Array(cols * rows).fill(1),
    fullySolid: true,
  };
}

export interface WedgeRow {
  step: number;
  /** Thickness of the tested filament on this step, in mm. */
  thicknessMm: number;
  /** Total height of the step including the backing, in mm. */
  totalMm: number;
  /** Layer the step's top surface sits on, 1-based. */
  topLayer: number;
}

/** The table that turns a counted step into a TD value. */
export function wedgeTable(settings: WedgeSettings): WedgeRow[] {
  const rows: WedgeRow[] = [];
  for (let step = 1; step <= settings.steps; step++) {
    const thicknessMm = stepThickness(step, settings);
    rows.push({
      step,
      thicknessMm,
      totalMm: Number((baseHeight(settings) + thicknessMm).toFixed(6)),
      topLayer: settings.baseLayers + step * settings.layersPerStep,
    });
  }
  return rows;
}
