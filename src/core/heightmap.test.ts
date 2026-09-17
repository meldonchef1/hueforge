import { describe, expect, it } from 'vitest';
import type { GrayField } from './brightness';
import { buildHeightMap, gridSize, quantise, sampleField, type HeightMapSettings } from './heightmap';

const field = (width: number, height: number, values: number[]): GrayField => ({
  width,
  height,
  data: Float32Array.from(values),
});

const settings = (overrides: Partial<HeightMapSettings> = {}): HeightMapSettings => ({
  widthMm: 100,
  heightMm: 100,
  detailMm: 25,
  baseThickness: 0.16,
  maxDepth: 2.56,
  layerHeight: 0.08,
  firstLayerHeight: 0.16,
  border: { enabled: false, width: 0, depth: 0 },
  ...overrides,
});

describe('quantise', () => {
  it('snaps to whole layers above the first one', () => {
    expect(quantise(0.3, 0.08, 0.16)).toBeCloseTo(0.32, 6);
    expect(quantise(0.25, 0.08, 0.16)).toBeCloseTo(0.24, 6);
  });

  it('never returns less than the first layer', () => {
    expect(quantise(0, 0.08, 0.16)).toBeCloseTo(0.16, 6);
    expect(quantise(0.05, 0.08, 0.16)).toBeCloseTo(0.16, 6);
  });

  it('leaves the height alone when the layer height is unusable', () => {
    expect(quantise(1.23, 0, 0.16)).toBe(1.23);
  });
});

describe('sampleField', () => {
  const gradient = field(2, 1, [0, 1]);

  it('reads the corners exactly', () => {
    expect(sampleField(gradient, 0, 0)).toBeCloseTo(0, 6);
    expect(sampleField(gradient, 1, 0)).toBeCloseTo(1, 6);
  });

  it('interpolates between samples', () => {
    expect(sampleField(gradient, 0.5, 0)).toBeCloseTo(0.5, 6);
  });

  it('clamps coordinates outside the field', () => {
    expect(sampleField(gradient, -1, 0)).toBeCloseTo(0, 6);
    expect(sampleField(gradient, 2, 0)).toBeCloseTo(1, 6);
  });
});

describe('gridSize', () => {
  it('derives sample counts from the printed size and detail', () => {
    expect(gridSize(100, 50, 1)).toEqual({ cols: 101, rows: 51 });
  });

  it('keeps at least two samples per axis', () => {
    expect(gridSize(1, 1, 100)).toEqual({ cols: 2, rows: 2 });
  });

  it('falls back to a usable detail when given zero', () => {
    expect(gridSize(10, 10, 0).cols).toBeGreaterThan(2);
  });
});

describe('buildHeightMap', () => {
  it('maps black to the base and white to the top', () => {
    const map = buildHeightMap(field(2, 1, [0, 1]), settings());
    expect(map.data[0]).toBeCloseTo(0.16, 6);
    expect(map.data[map.cols - 1]).toBeCloseTo(2.56, 6);
  });

  it('puts every sample on a layer boundary', () => {
    const map = buildHeightMap(field(4, 1, [0, 0.33, 0.66, 1]), settings());
    for (const height of map.data) {
      const steps = (height - 0.16) / 0.08;
      expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-6);
    }
  });

  it('reports the layer count of the tallest sample', () => {
    const map = buildHeightMap(field(2, 1, [0, 1]), settings());
    // 0.16 first layer, then (2.56 - 0.16) / 0.08 = 30 more.
    expect(map.layers).toBe(31);
    expect(map.maxHeight).toBeCloseTo(2.56, 6);
    expect(map.minHeight).toBeCloseTo(0.16, 6);
  });

  it('keeps the relief above the base when max depth is below it', () => {
    const map = buildHeightMap(field(2, 1, [0, 1]), settings({ baseThickness: 1, maxDepth: 0.5 }));
    for (const height of map.data) expect(height).toBeGreaterThanOrEqual(1 - 1e-6);
  });

  it('measures cells from the printed size', () => {
    const map = buildHeightMap(field(2, 2, [0, 1, 1, 0]), settings({ widthMm: 80, heightMm: 40 }));
    expect(map.cellX * (map.cols - 1)).toBeCloseTo(80, 6);
    expect(map.cellY * (map.rows - 1)).toBeCloseTo(40, 6);
  });

  it('flattens the edge to the border height when a border is on', () => {
    const map = buildHeightMap(
      field(2, 2, [1, 1, 1, 1]),
      settings({ detailMm: 5, border: { enabled: true, width: 10, depth: 0.4 } }),
    );
    // Corner sits in the frame, centre is relief.
    expect(map.data[0]).toBeCloseTo(0.4, 6);
    const centre = Math.floor(map.rows / 2) * map.cols + Math.floor(map.cols / 2);
    expect(map.data[centre]).toBeCloseTo(2.56, 6);
  });

  it('still shows the whole image inside the border', () => {
    const map = buildHeightMap(
      field(2, 1, [0, 1]),
      settings({ detailMm: 5, border: { enabled: true, width: 10, depth: 0.16 } }),
    );
    // The bright end of the gradient survives the inward remap.
    expect(map.maxHeight).toBeCloseTo(2.56, 6);
  });
});
