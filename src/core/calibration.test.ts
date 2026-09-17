import { describe, expect, it } from 'vitest';
import {
  baseHeight,
  buildWedgeHeightMap,
  defaultWedgeSettings,
  stepThickness,
  swapLayer,
  tdFromStep,
  wedgeHeight,
  wedgeTable,
  type WedgeSettings,
} from './calibration';
import { buildMesh, signedVolume } from './mesh';

const settings = (overrides: Partial<WedgeSettings> = {}): WedgeSettings => ({
  ...defaultWedgeSettings(0.08, 0.16),
  ...overrides,
});

describe('stepThickness', () => {
  it('grows one step at a time', () => {
    const s = settings({ layersPerStep: 2, layerHeight: 0.08 });
    expect(stepThickness(1, s)).toBeCloseTo(0.16, 6);
    expect(stepThickness(2, s)).toBeCloseTo(0.32, 6);
    expect(stepThickness(12, s)).toBeCloseTo(1.92, 6);
  });

  it('is zero below the first step', () => {
    expect(stepThickness(0, settings())).toBe(0);
    expect(stepThickness(-3, settings())).toBe(0);
  });

  it('follows the layer height', () => {
    expect(stepThickness(3, settings({ layerHeight: 0.2, layersPerStep: 1 }))).toBeCloseTo(0.6, 6);
  });
});

describe('tdFromStep', () => {
  it('reads TD straight off the step that hid the backing', () => {
    const s = settings({ layersPerStep: 2, layerHeight: 0.08 });
    // Counting 9 steps before the backing disappeared means 1.44 mm of filament.
    expect(tdFromStep(9, s)).toBeCloseTo(1.44, 6);
  });
});

describe('baseHeight and swapLayer', () => {
  it('measures the backing slab through the thicker first layer', () => {
    const s = settings({ baseLayers: 4, layerHeight: 0.08, firstLayerHeight: 0.16 });
    // 0.16 for layer one, then three more at 0.08.
    expect(baseHeight(s)).toBeCloseTo(0.4, 6);
  });

  it('swaps filament on the layer right after the backing', () => {
    expect(swapLayer(settings({ baseLayers: 4 }))).toBe(4);
  });
});

describe('wedgeHeight', () => {
  it('adds the tallest step to the backing', () => {
    const s = settings({ baseLayers: 4, steps: 12, layersPerStep: 2 });
    expect(wedgeHeight(s)).toBeCloseTo(0.4 + 1.92, 6);
  });
});

describe('buildWedgeHeightMap', () => {
  it('steps up from the first step to the last', () => {
    const s = settings({ steps: 4 });
    const map = buildWedgeHeightMap(s);
    expect(map.minHeight).toBeCloseTo(baseHeight(s) + stepThickness(1, s), 6);
    expect(map.maxHeight).toBeCloseTo(wedgeHeight(s), 6);
  });

  it('rises from left to right and never dips', () => {
    const map = buildWedgeHeightMap(settings({ steps: 6 }));
    for (let col = 1; col < map.cols; col++) {
      expect(map.data[col]).toBeGreaterThanOrEqual(map.data[col - 1]);
    }
  });

  it('is as wide as its steps make it', () => {
    const map = buildWedgeHeightMap(settings({ steps: 10, stepWidthMm: 8, depthMm: 20 }));
    expect(map.widthMm).toBe(80);
    expect(map.heightMm).toBe(20);
  });

  it('builds a solid that holds water', () => {
    const mesh = buildMesh(buildWedgeHeightMap(settings({ steps: 5 })));
    expect(signedVolume(mesh)).toBeGreaterThan(0);
  });

  it('gives every step the same width', () => {
    const s = settings({ steps: 4, stepWidthMm: 10 });
    const map = buildWedgeHeightMap(s);
    const heights = new Set(Array.from(map.data.slice(0, map.cols)).map((h) => h.toFixed(4)));
    expect(heights.size).toBe(4);
  });
});

describe('wedgeTable', () => {
  it('lists one row per step', () => {
    expect(wedgeTable(settings({ steps: 12 }))).toHaveLength(12);
  });

  it('numbers steps from one and grows the thickness', () => {
    const rows = wedgeTable(settings({ steps: 3, layersPerStep: 2, layerHeight: 0.08 }));
    expect(rows[0]).toMatchObject({ step: 1, thicknessMm: 0.16 });
    expect(rows[2].thicknessMm).toBeCloseTo(0.48, 6);
  });

  it('counts the top layer of each step from the backing up', () => {
    const rows = wedgeTable(settings({ steps: 3, baseLayers: 4, layersPerStep: 2 }));
    expect(rows.map((row) => row.topLayer)).toEqual([6, 8, 10]);
  });
});
