import { describe, expect, it } from 'vitest';
import { kelvinToRgb, parseHex, rgbToCss, rgbToHex } from './color';

describe('kelvinToRgb', () => {
  it('makes low temperatures warm', () => {
    const warm = kelvinToRgb(2700);
    expect(warm.r).toBeGreaterThan(warm.g);
    expect(warm.g).toBeGreaterThan(warm.b);
  });

  it('is close to neutral at daylight', () => {
    const daylight = kelvinToRgb(6500);
    expect(Math.abs(daylight.r - daylight.b)).toBeLessThan(0.15);
  });

  it('makes high temperatures cool', () => {
    const cold = kelvinToRgb(15000);
    expect(cold.b).toBeGreaterThan(cold.r);
  });

  it('keeps every channel inside 0..1', () => {
    for (const kelvin of [500, 1000, 2700, 4000, 6500, 40000, 99000]) {
      const { r, g, b } = kelvinToRgb(kelvin);
      for (const channel of [r, g, b]) {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(1);
      }
    }
  });

  it('gets warmer as the temperature drops', () => {
    const ratio = (k: number) => {
      const { r, b } = kelvinToRgb(k);
      return r / Math.max(b, 1e-6);
    };
    expect(ratio(2700)).toBeGreaterThan(ratio(4000));
    expect(ratio(4000)).toBeGreaterThan(ratio(6500));
  });
});

describe('hex conversion', () => {
  it('round-trips a colour', () => {
    const parsed = parseHex('#4b9fd5');
    expect(parsed).not.toBeNull();
    expect(rgbToCss(parsed!)).toBe('#4b9fd5');
  });

  it('expands shorthand', () => {
    expect(rgbToCss(parseHex('#f00')!)).toBe('#ff0000');
  });

  it('accepts a missing hash', () => {
    expect(parseHex('00ff00')).not.toBeNull();
  });

  it('rejects anything that is not a colour', () => {
    expect(parseHex('nope')).toBeNull();
    expect(parseHex('#12345')).toBeNull();
    expect(parseHex('')).toBeNull();
  });

  it('packs channels into an integer', () => {
    expect(rgbToHex({ r: 1, g: 0, b: 0 })).toBe(0xff0000);
    expect(rgbToHex({ r: 0, g: 1, b: 0 })).toBe(0x00ff00);
  });

  it('clamps out-of-range channels', () => {
    expect(rgbToHex({ r: 2, g: -1, b: 0.5 })).toBe(0xff0080);
  });
});
