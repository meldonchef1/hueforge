/**
 * Turns pixels into a 0..1 brightness field — the input every height map is
 * derived from. Nothing here touches the DOM, so it runs in a worker unchanged.
 */

export type LuminanceModel = 'rec709' | 'rec601' | 'average' | 'perceptual';

export interface BrightnessSettings {
  model: LuminanceModel;
  /** Linearise sRGB before weighting. Physically correct, but flatter mid-tones. */
  srgb: boolean;
  /** Gamma on the result: below 1 lifts shadows, above 1 deepens them. */
  compensation: number;
  /** Added to every sample after gamma, -1..1. */
  adjustment: number;
  /** Box blur radius in pixels; 0 disables it. */
  smoothing: number;
  invert: boolean;
  /** Stretch the darkest and brightest sample to 0 and 1. */
  fullRange: boolean;
}

export interface GrayField {
  width: number;
  height: number;
  /** One sample per pixel, 0..1, row-major. */
  data: Float32Array;
}

export const defaultBrightnessSettings = (): BrightnessSettings => ({
  model: 'rec709',
  srgb: true,
  compensation: 1,
  adjustment: 0,
  smoothing: 0,
  invert: false,
  fullRange: false,
});

const srgbToLinear = (c: number): number =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

/** CIE L*, normalised to 0..1. Spaces samples the way the eye does. */
function lightness(y: number): number {
  const l = y <= 0.008856 ? 903.3 * y : 116 * Math.cbrt(y) - 16;
  return l / 100;
}

function weighted(r: number, g: number, b: number, model: LuminanceModel): number {
  switch (model) {
    case 'rec601':
      return 0.299 * r + 0.587 * g + 0.114 * b;
    case 'average':
      return (r + g + b) / 3;
    case 'rec709':
    case 'perceptual':
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
}

/** RGBA bytes to a raw luminance field, before any of the tone controls. */
export function luminanceField(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  model: LuminanceModel,
  srgb: boolean,
): GrayField {
  const data = new Float32Array(width * height);
  for (let i = 0, p = 0; i < data.length; i++, p += 4) {
    let r = pixels[p] / 255;
    let g = pixels[p + 1] / 255;
    let b = pixels[p + 2] / 255;
    if (srgb) {
      r = srgbToLinear(r);
      g = srgbToLinear(g);
      b = srgbToLinear(b);
    }
    const y = weighted(r, g, b, model);
    data[i] = model === 'perceptual' ? lightness(y) : y;
  }
  return { width, height, data };
}

/** Separable box blur, run in place. Radius is in pixels. */
export function blur(field: GrayField, radius: number): void {
  if (radius < 1) return;
  const { width, height, data } = field;
  const scratch = new Float32Array(data.length);
  const window = radius * 2 + 1;

  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) {
        // Clamping at the edge keeps the border from darkening into the blur.
        const sx = Math.min(width - 1, Math.max(0, x + k));
        sum += data[row + sx];
      }
      scratch[row + x] = sum / window;
    }
  }

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) {
        const sy = Math.min(height - 1, Math.max(0, y + k));
        sum += scratch[sy * width + x];
      }
      data[y * width + x] = sum / window;
    }
  }
}

/** Stretches the field so its darkest sample lands on 0 and its brightest on 1. */
export function normalise(field: GrayField): void {
  const { data } = field;
  let min = Infinity;
  let max = -Infinity;
  for (const value of data) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  const span = max - min;
  // A flat image has nothing to stretch; leaving it alone beats dividing by zero.
  if (span < 1e-6) return;
  for (let i = 0; i < data.length; i++) data[i] = (data[i] - min) / span;
}

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

/**
 * Applies the tone controls in the order the panel lists them: smooth, stretch,
 * gamma, offset, invert. Order matters — stretching after gamma would undo it.
 */
export function applyBrightness(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  settings: BrightnessSettings,
): GrayField {
  const field = luminanceField(pixels, width, height, settings.model, settings.srgb);

  blur(field, Math.round(settings.smoothing));
  if (settings.fullRange) normalise(field);

  const { data } = field;
  const gamma = settings.compensation > 0 ? settings.compensation : 1;
  const needsGamma = Math.abs(gamma - 1) > 1e-6;

  for (let i = 0; i < data.length; i++) {
    let value = clamp01(data[i]);
    if (needsGamma) value = Math.pow(value, gamma);
    value = clamp01(value + settings.adjustment);
    data[i] = settings.invert ? 1 - value : value;
  }

  return field;
}
