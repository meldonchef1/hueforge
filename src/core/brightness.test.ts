import { describe, expect, it } from 'vitest';
import {
  applyBrightness,
  blur,
  defaultBrightnessSettings,
  luminanceField,
  normalise,
  type GrayField,
} from './brightness';

/** Builds RGBA bytes from [r,g,b] triples. */
function rgba(triples: [number, number, number][]): Uint8ClampedArray {
  const out = new Uint8ClampedArray(triples.length * 4);
  triples.forEach(([r, g, b], i) => {
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = 255;
  });
  return out;
}

const field = (width: number, height: number, values: number[]): GrayField => ({
  width,
  height,
  data: Float32Array.from(values),
});

describe('luminanceField', () => {
  it('maps black and white to the ends of the range', () => {
    const pixels = rgba([
      [0, 0, 0],
      [255, 255, 255],
    ]);
    const result = luminanceField(pixels, 2, 1, 'rec709', true);
    expect(result.data[0]).toBeCloseTo(0, 6);
    expect(result.data[1]).toBeCloseTo(1, 6);
  });

  it('weights green highest under rec709', () => {
    const pixels = rgba([
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
    ]);
    const [r, g, b] = luminanceField(pixels, 3, 1, 'rec709', false).data;
    expect(g).toBeGreaterThan(r);
    expect(r).toBeGreaterThan(b);
  });

  it('treats the channels equally under average', () => {
    const pixels = rgba([
      [255, 0, 0],
      [0, 255, 0],
    ]);
    const [r, g] = luminanceField(pixels, 2, 1, 'average', false).data;
    expect(r).toBeCloseTo(g, 6);
  });

  it('lifts mid grey when using perceptual lightness', () => {
    const pixels = rgba([[128, 128, 128]]);
    const linear = luminanceField(pixels, 1, 1, 'rec709', true).data[0];
    const perceptual = luminanceField(pixels, 1, 1, 'perceptual', true).data[0];
    expect(perceptual).toBeGreaterThan(linear);
    expect(perceptual).toBeCloseTo(0.53, 1);
  });

  it('reads mid grey as darker once sRGB is linearised', () => {
    const pixels = rgba([[128, 128, 128]]);
    const raw = luminanceField(pixels, 1, 1, 'rec709', false).data[0];
    const linear = luminanceField(pixels, 1, 1, 'rec709', true).data[0];
    expect(linear).toBeLessThan(raw);
  });
});

describe('blur', () => {
  it('spreads a single bright pixel into its neighbours', () => {
    const f = field(3, 3, [0, 0, 0, 0, 1, 0, 0, 0, 0]);
    blur(f, 1);
    expect(f.data[4]).toBeGreaterThan(0);
    expect(f.data[4]).toBeLessThan(1);
    expect(f.data[0]).toBeGreaterThan(0);
  });

  it('leaves a flat field untouched', () => {
    const f = field(3, 3, Array(9).fill(0.5));
    blur(f, 1);
    for (const value of f.data) expect(value).toBeCloseTo(0.5, 6);
  });

  it('does nothing for a radius below one pixel', () => {
    const f = field(2, 1, [0, 1]);
    blur(f, 0);
    expect([...f.data]).toEqual([0, 1]);
  });
});

describe('normalise', () => {
  it('stretches the range to 0..1', () => {
    const f = field(3, 1, [0.25, 0.5, 0.75]);
    normalise(f);
    expect(f.data[0]).toBeCloseTo(0, 6);
    expect(f.data[1]).toBeCloseTo(0.5, 6);
    expect(f.data[2]).toBeCloseTo(1, 6);
  });

  it('leaves a flat field alone instead of dividing by zero', () => {
    const f = field(2, 1, [0.4, 0.4]);
    normalise(f);
    expect(f.data[0]).toBeCloseTo(0.4, 6);
    expect(f.data[1]).toBeCloseTo(0.4, 6);
  });
});

describe('applyBrightness', () => {
  const pixels = rgba([
    [0, 0, 0],
    [128, 128, 128],
    [255, 255, 255],
  ]);

  it('passes values through untouched with default settings', () => {
    const result = applyBrightness(pixels, 3, 1, defaultBrightnessSettings());
    expect(result.data[0]).toBeCloseTo(0, 6);
    expect(result.data[2]).toBeCloseTo(1, 6);
  });

  it('flips the field when inverted', () => {
    const plain = applyBrightness(pixels, 3, 1, defaultBrightnessSettings());
    const inverted = applyBrightness(pixels, 3, 1, {
      ...defaultBrightnessSettings(),
      invert: true,
    });
    for (let i = 0; i < 3; i++) {
      expect(inverted.data[i]).toBeCloseTo(1 - plain.data[i], 5);
    }
  });

  it('darkens mid-tones as compensation rises', () => {
    const low = applyBrightness(pixels, 3, 1, {
      ...defaultBrightnessSettings(),
      compensation: 0.5,
    });
    const high = applyBrightness(pixels, 3, 1, {
      ...defaultBrightnessSettings(),
      compensation: 2,
    });
    expect(high.data[1]).toBeLessThan(low.data[1]);
  });

  it('keeps the adjustment inside the range', () => {
    const result = applyBrightness(pixels, 3, 1, {
      ...defaultBrightnessSettings(),
      adjustment: 0.8,
    });
    for (const value of result.data) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
    expect(result.data[2]).toBeCloseTo(1, 6);
  });

  it('stretches a low-contrast image when full range is on', () => {
    const flat = rgba([
      [100, 100, 100],
      [120, 120, 120],
      [140, 140, 140],
    ]);
    const result = applyBrightness(flat, 3, 1, {
      ...defaultBrightnessSettings(),
      fullRange: true,
    });
    expect(result.data[0]).toBeCloseTo(0, 5);
    expect(result.data[2]).toBeCloseTo(1, 5);
  });
});
