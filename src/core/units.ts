/** Tolerance for comparing millimetre values that went through float arithmetic. */
const EPSILON = 1e-6;

/**
 * True when `value` is a whole number of `step`s. Layer heights are entered as
 * decimals, so a plain modulo would reject 0.24 against a 0.08 layer height.
 */
export function isMultipleOf(value: number, step: number): boolean {
  if (step <= 0) return false;
  const ratio = value / step;
  return Math.abs(ratio - Math.round(ratio)) < EPSILON;
}

/** Rounds a height to the nearest whole number of layers. */
export function snapToMultiple(value: number, step: number): number {
  if (step <= 0) return value;
  return Number((Math.round(value / step) * step).toFixed(6));
}

/**
 * Number of printed layers needed to reach `height`, given a thicker first layer.
 * Heights below the first layer still cost one layer — you cannot print half of it.
 */
export function layerCount(height: number, layerHeight: number, firstLayerHeight: number): number {
  if (height <= 0 || layerHeight <= 0) return 0;
  if (height <= firstLayerHeight + EPSILON) return 1;
  return 1 + Math.ceil((height - firstLayerHeight) / layerHeight - EPSILON);
}

/** Height of the top of layer `index` (0-based), in millimetres. */
export function layerTop(index: number, layerHeight: number, firstLayerHeight: number): number {
  if (index < 0) return 0;
  return Number((firstLayerHeight + index * layerHeight).toFixed(6));
}

const MM_PER_INCH = 25.4;

export const mmToInch = (mm: number) => mm / MM_PER_INCH;
export const inchToMm = (inch: number) => inch * MM_PER_INCH;
