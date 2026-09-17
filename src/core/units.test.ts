import { describe, expect, it } from 'vitest';
import { inchToMm, isMultipleOf, layerCount, layerTop, mmToInch, snapToMultiple } from './units';

describe('isMultipleOf', () => {
  it('accepts values that float arithmetic makes inexact', () => {
    expect(isMultipleOf(0.24, 0.08)).toBe(true);
    expect(isMultipleOf(0.3, 0.1)).toBe(true);
    expect(isMultipleOf(2.4, 0.08)).toBe(true);
  });

  it('rejects values between steps', () => {
    expect(isMultipleOf(0.25, 0.08)).toBe(false);
    expect(isMultipleOf(0.1, 0.08)).toBe(false);
  });

  it('treats zero as a multiple and a non-positive step as invalid', () => {
    expect(isMultipleOf(0, 0.08)).toBe(true);
    expect(isMultipleOf(1, 0)).toBe(false);
    expect(isMultipleOf(1, -0.08)).toBe(false);
  });
});

describe('snapToMultiple', () => {
  it('rounds to the nearest whole step', () => {
    expect(snapToMultiple(0.25, 0.08)).toBeCloseTo(0.24, 6);
    expect(snapToMultiple(0.29, 0.08)).toBeCloseTo(0.32, 6);
  });

  it('leaves the value alone when the step is not usable', () => {
    expect(snapToMultiple(0.25, 0)).toBe(0.25);
  });
});

describe('layerCount', () => {
  it('counts the thicker first layer as one layer', () => {
    expect(layerCount(0.16, 0.08, 0.16)).toBe(1);
    expect(layerCount(0.1, 0.08, 0.16)).toBe(1);
  });

  it('adds one layer per layer height above the first', () => {
    expect(layerCount(0.24, 0.08, 0.16)).toBe(2);
    expect(layerCount(0.32, 0.08, 0.16)).toBe(3);
    expect(layerCount(2.16, 0.08, 0.16)).toBe(26);
  });

  it('is zero for a model with no height', () => {
    expect(layerCount(0, 0.08, 0.16)).toBe(0);
  });
});

describe('layerTop', () => {
  it('returns the top of each layer', () => {
    expect(layerTop(0, 0.08, 0.16)).toBeCloseTo(0.16, 6);
    expect(layerTop(1, 0.08, 0.16)).toBeCloseTo(0.24, 6);
    expect(layerTop(10, 0.08, 0.16)).toBeCloseTo(0.96, 6);
  });
});

describe('unit conversion', () => {
  it('round-trips millimetres through inches', () => {
    expect(mmToInch(25.4)).toBeCloseTo(1, 10);
    expect(inchToMm(mmToInch(123.45))).toBeCloseTo(123.45, 10);
  });
});
