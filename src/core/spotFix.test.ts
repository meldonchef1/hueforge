import { describe, expect, it } from 'vitest';
import { appendPoint, applyStrokes, type SpotStroke } from './spotFix';
import type { GrayField } from './brightness';

const field = (width: number, height: number, fill = 0.5): GrayField => ({
  width,
  height,
  data: new Float32Array(width * height).fill(fill),
});

const stroke = (overrides: Partial<SpotStroke> = {}): SpotStroke => ({
  points: [{ u: 0.5, v: 0.5 }],
  radius: 0.2,
  strength: 0.3,
  ...overrides,
});

describe('applyStrokes', () => {
  it('leaves the field alone when there is nothing to apply', () => {
    const f = field(9, 9);
    applyStrokes(f, []);
    expect([...f.data].every((value) => value === 0.5)).toBe(true);
  });

  it('lifts the centre most and the edge least', () => {
    const f = field(21, 21);
    applyStrokes(f, [stroke()]);

    const centre = f.data[10 * 21 + 10];
    const nearEdge = f.data[10 * 21 + 13];
    expect(centre).toBeGreaterThan(nearEdge);
    expect(nearEdge).toBeGreaterThan(0.5);
  });

  it('leaves everything outside the brush untouched', () => {
    const f = field(21, 21);
    applyStrokes(f, [stroke({ radius: 0.1 })]);
    expect(f.data[0]).toBeCloseTo(0.5, 6);
    expect(f.data[f.data.length - 1]).toBeCloseTo(0.5, 6);
  });

  it('lowers the surface with a negative strength', () => {
    const f = field(21, 21);
    applyStrokes(f, [stroke({ strength: -0.3 })]);
    expect(f.data[10 * 21 + 10]).toBeLessThan(0.5);
  });

  it('keeps values inside 0..1 however hard the brush pushes', () => {
    const f = field(11, 11);
    applyStrokes(f, [stroke({ strength: 5 }), stroke({ strength: 5 })]);
    for (const value of f.data) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('builds up when strokes overlap', () => {
    const once = field(21, 21);
    applyStrokes(once, [stroke({ strength: 0.2 })]);

    const twice = field(21, 21);
    applyStrokes(twice, [stroke({ strength: 0.2 }), stroke({ strength: 0.2 })]);

    expect(twice.data[10 * 21 + 10]).toBeGreaterThan(once.data[10 * 21 + 10]);
  });

  it('follows every point of a drag', () => {
    const f = field(21, 21);
    applyStrokes(f, [stroke({ points: [{ u: 0.2, v: 0.5 }, { u: 0.8, v: 0.5 }], radius: 0.1 })]);
    expect(f.data[10 * 21 + 4]).toBeGreaterThan(0.5);
    expect(f.data[10 * 21 + 16]).toBeGreaterThan(0.5);
    // The gap between the two dabs stays untouched.
    expect(f.data[10 * 21 + 10]).toBeCloseTo(0.5, 6);
  });

  it('measures the radius against the shorter side', () => {
    // A wide image and a square one get the same brush size in pixels.
    const wide = field(41, 21);
    applyStrokes(wide, [stroke({ radius: 0.25 })]);
    const square = field(21, 21);
    applyStrokes(square, [stroke({ radius: 0.25 })]);
    expect(wide.data[10 * 41 + 20]).toBeCloseTo(square.data[10 * 21 + 10], 5);
  });

  it('copes with a brush centred on the very edge', () => {
    const f = field(11, 11);
    applyStrokes(f, [stroke({ points: [{ u: 0, v: 0 }] })]);
    expect(f.data[0]).toBeGreaterThan(0.5);
  });
});

describe('appendPoint', () => {
  it('takes the first point whatever happens', () => {
    expect(appendPoint([], { u: 0.5, v: 0.5 }, 0.01)).toHaveLength(1);
  });

  it('skips a point too close to the last one', () => {
    const points = [{ u: 0.5, v: 0.5 }];
    expect(appendPoint(points, { u: 0.502, v: 0.5 }, 0.01)).toBe(points);
  });

  it('takes a point once the drag has moved far enough', () => {
    const points = [{ u: 0.5, v: 0.5 }];
    expect(appendPoint(points, { u: 0.6, v: 0.5 }, 0.01)).toHaveLength(2);
  });
});
