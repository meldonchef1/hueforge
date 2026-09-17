import type { GrayField } from './brightness';

/**
 * Turns a brightness field into printable heights: every sample is a whole
 * number of layers, because a printer cannot lay down a fraction of one.
 */

export interface BorderSettings {
  enabled: boolean;
  /** How far the flat frame reaches in from each edge, in mm. */
  width: number;
  /** Height of the frame, in mm. */
  depth: number;
}

export interface HeightMapSettings {
  /** Printed size of the model in mm. */
  widthMm: number;
  heightMm: number;
  /** Distance between samples in mm — the smallest feature the mesh can hold. */
  detailMm: number;
  /** Solid slab under the relief, in mm. */
  baseThickness: number;
  /** Height of the brightest sample, in mm. */
  maxDepth: number;
  layerHeight: number;
  firstLayerHeight: number;
  border: BorderSettings;
}

export interface HeightMap {
  cols: number;
  rows: number;
  /** Height in mm per sample, row-major. */
  data: Float32Array;
  /** Distance between samples in mm. */
  cellX: number;
  cellY: number;
  widthMm: number;
  heightMm: number;
  minHeight: number;
  maxHeight: number;
  /** Layers needed for the tallest sample. */
  layers: number;
}

/** Snaps a height to a whole number of layers, never below the first layer. */
export function quantise(height: number, layerHeight: number, firstLayerHeight: number): number {
  if (layerHeight <= 0) return height;
  if (height <= firstLayerHeight) return firstLayerHeight;
  const steps = Math.round((height - firstLayerHeight) / layerHeight);
  return Number((firstLayerHeight + steps * layerHeight).toFixed(6));
}

/** Bilinear sample of a brightness field at normalised coordinates. */
export function sampleField(field: GrayField, u: number, v: number): number {
  const { width, height, data } = field;
  if (width === 0 || height === 0) return 0;

  const x = Math.min(width - 1, Math.max(0, u * (width - 1)));
  const y = Math.min(height - 1, Math.max(0, v * (height - 1)));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const fx = x - x0;
  const fy = y - y0;

  const top = data[y0 * width + x0] * (1 - fx) + data[y0 * width + x1] * fx;
  const bottom = data[y1 * width + x0] * (1 - fx) + data[y1 * width + x1] * fx;
  return top * (1 - fy) + bottom * fy;
}

/** Sample counts for a given printed size and detail, at least 2 in each axis. */
export function gridSize(widthMm: number, heightMm: number, detailMm: number) {
  const detail = detailMm > 0 ? detailMm : 0.1;
  return {
    cols: Math.max(2, Math.round(widthMm / detail) + 1),
    rows: Math.max(2, Math.round(heightMm / detail) + 1),
  };
}

export function buildHeightMap(field: GrayField, settings: HeightMapSettings): HeightMap {
  const { widthMm, heightMm, layerHeight, firstLayerHeight, border } = settings;
  const { cols, rows } = gridSize(widthMm, heightMm, settings.detailMm);

  const base = Math.max(firstLayerHeight, settings.baseThickness);
  // The relief can never dip below the base slab it sits on.
  const top = Math.max(base, settings.maxDepth);
  const relief = top - base;

  const borderOn = border.enabled && border.width > 0;
  const borderHeight = quantise(
    Math.max(firstLayerHeight, border.depth),
    layerHeight,
    firstLayerHeight,
  );
  // Fraction of the model taken up by the frame on each side.
  const borderU = borderOn ? Math.min(0.5, border.width / widthMm) : 0;
  const borderV = borderOn ? Math.min(0.5, border.width / heightMm) : 0;

  const data = new Float32Array(cols * rows);
  let minHeight = Infinity;
  let maxHeight = -Infinity;

  for (let row = 0; row < rows; row++) {
    const v = rows > 1 ? row / (rows - 1) : 0;
    for (let col = 0; col < cols; col++) {
      const u = cols > 1 ? col / (cols - 1) : 0;

      let value: number;
      if (borderOn && (u < borderU || u > 1 - borderU || v < borderV || v > 1 - borderV)) {
        value = borderHeight;
      } else {
        // Remap the inner area back to the full image so the frame crops nothing.
        const iu = borderU > 0 ? (u - borderU) / (1 - 2 * borderU) : u;
        const iv = borderV > 0 ? (v - borderV) / (1 - 2 * borderV) : v;
        const brightness = sampleField(field, iu, iv);
        value = quantise(base + brightness * relief, layerHeight, firstLayerHeight);
      }

      data[row * cols + col] = value;
      if (value < minHeight) minHeight = value;
      if (value > maxHeight) maxHeight = value;
    }
  }

  const layers =
    maxHeight <= firstLayerHeight
      ? 1
      : 1 + Math.round((maxHeight - firstLayerHeight) / layerHeight);

  return {
    cols,
    rows,
    data,
    cellX: widthMm / (cols - 1),
    cellY: heightMm / (rows - 1),
    widthMm,
    heightMm,
    minHeight,
    maxHeight,
    layers,
  };
}
