import { describe, expect, it } from 'vitest';
import {
  filamentAtLayer,
  layerThickness,
  simulateColumn,
  simulateLayers,
  transmission,
  TRANSMISSION_AT_TD,
  type SimulationOptions,
  type StackEntry,
} from './simulation';
import type { Filament } from './filament';

const filament = (overrides: Partial<Filament> = {}): Filament => ({
  id: overrides.id ?? 'f',
  brand: 'Generic',
  name: 'Test',
  material: 'PLA',
  color: '#ffffff',
  td: 2,
  owned: true,
  ...overrides,
});

const options = (overrides: Partial<SimulationOptions> = {}): SimulationOptions => ({
  layerHeight: 0.08,
  firstLayerHeight: 0.16,
  light: { r: 1, g: 1, b: 1 },
  intensity: 1,
  lithophane: false,
  ...overrides,
});

const stackOf = (...entries: [Filament, number][]): StackEntry[] =>
  entries.map(([f, startLayer]) => ({ filament: f, startLayer }));

describe('transmission', () => {
  it('passes everything through nothing', () => {
    expect(transmission(0, 2)).toBe(1);
  });

  it('hits the named constant at exactly TD', () => {
    expect(transmission(2, 2)).toBeCloseTo(TRANSMISSION_AT_TD, 6);
    expect(transmission(0.5, 0.5)).toBeCloseTo(TRANSMISSION_AT_TD, 6);
  });

  it('blocks everything when TD is zero', () => {
    expect(transmission(0.08, 0)).toBe(0);
  });

  it('falls as the layer gets thicker', () => {
    expect(transmission(0.5, 2)).toBeGreaterThan(transmission(1, 2));
  });

  it('rises as the filament gets more translucent', () => {
    expect(transmission(0.5, 4)).toBeGreaterThan(transmission(0.5, 1));
  });
});

describe('layerThickness', () => {
  it('gives the first layer its own thickness', () => {
    expect(layerThickness(0, 0.08, 0.16)).toBe(0.16);
    expect(layerThickness(1, 0.08, 0.16)).toBe(0.08);
  });
});

describe('filamentAtLayer', () => {
  const black = filament({ id: 'black', color: '#000000' });
  const red = filament({ id: 'red', color: '#ff0000' });
  const white = filament({ id: 'white', color: '#ffffff' });
  const stack = stackOf([black, 0], [red, 5], [white, 10]);

  it('picks the filament in force at that layer', () => {
    expect(filamentAtLayer(stack, 0)?.id).toBe('black');
    expect(filamentAtLayer(stack, 4)?.id).toBe('black');
    expect(filamentAtLayer(stack, 5)?.id).toBe('red');
    expect(filamentAtLayer(stack, 9)?.id).toBe('red');
    expect(filamentAtLayer(stack, 10)?.id).toBe('white');
    expect(filamentAtLayer(stack, 99)?.id).toBe('white');
  });

  it('falls back to the first entry below the stack', () => {
    expect(filamentAtLayer(stackOf([red, 3]), 0)?.id).toBe('red');
  });

  it('has nothing to return for an empty stack', () => {
    expect(filamentAtLayer([], 0)).toBeNull();
  });
});

describe('simulateLayers', () => {
  const opaqueRed = filament({ id: 'r', color: '#ff0000', td: 0.01 });
  const opaqueBlue = filament({ id: 'b', color: '#0000ff', td: 0.01 });
  const clearWhite = filament({ id: 'w', color: '#ffffff', td: 100 });

  it('is black with nothing printed', () => {
    expect(simulateLayers(0, stackOf([opaqueRed, 0]), options())).toEqual({ r: 0, g: 0, b: 0 });
    expect(simulateLayers(5, [], options())).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('shows an opaque filament as its own colour', () => {
    const result = simulateLayers(10, stackOf([opaqueRed, 0]), options());
    expect(result.r).toBeCloseTo(1, 3);
    expect(result.g).toBeCloseTo(0, 3);
    expect(result.b).toBeCloseTo(0, 3);
  });

  it('hides what is underneath once an opaque swap is printed over it', () => {
    const stack = stackOf([opaqueRed, 0], [opaqueBlue, 3]);
    const result = simulateLayers(10, stack, options());
    expect(result.b).toBeGreaterThan(0.9);
    expect(result.r).toBeLessThan(0.1);
  });

  it('still shows the layer below through a translucent one', () => {
    const stack = stackOf([opaqueRed, 0], [clearWhite, 3]);
    const result = simulateLayers(4, stack, options());
    expect(result.r).toBeGreaterThan(0.5);
  });

  it('buries the lower colour as more translucent layers pile up', () => {
    const translucentBlue = filament({ id: 'tb', color: '#0000ff', td: 1 });
    const stack = stackOf([opaqueRed, 0], [translucentBlue, 1]);
    const thin = simulateLayers(3, stack, options());
    const thick = simulateLayers(20, stack, options());
    expect(thick.r).toBeLessThan(thin.r);
    expect(thick.b).toBeGreaterThan(thin.b);
  });

  it('tints the result with the light colour', () => {
    const white = filament({ id: 'w', color: '#ffffff', td: 0.01 });
    const warm = simulateLayers(5, stackOf([white, 0]), options({ light: { r: 1, g: 0.7, b: 0.4 } }));
    expect(warm.r).toBeCloseTo(1, 3);
    expect(warm.g).toBeCloseTo(0.7, 3);
    expect(warm.b).toBeCloseTo(0.4, 3);
  });

  it('keeps every channel inside 0..1 even at high intensity', () => {
    const white = filament({ id: 'w', color: '#ffffff', td: 0.01 });
    const result = simulateLayers(5, stackOf([white, 0]), options({ intensity: 5 }));
    for (const channel of [result.r, result.g, result.b]) {
      expect(channel).toBeLessThanOrEqual(1);
      expect(channel).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('simulateLayers in lithophane mode', () => {
  const litho = options({ lithophane: true });

  it('gets darker as the print gets thicker', () => {
    const stack = stackOf([filament({ td: 2 }), 0]);
    const thin = simulateLayers(2, stack, litho);
    const thick = simulateLayers(20, stack, litho);
    expect(thick.r).toBeLessThan(thin.r);
  });

  it('blocks all light through an opaque filament', () => {
    const stack = stackOf([filament({ td: 0.01 }), 0]);
    const result = simulateLayers(3, stack, litho);
    expect(result.r).toBeLessThan(0.01);
  });

  it('lets a clear filament through almost untouched', () => {
    const stack = stackOf([filament({ color: '#ffffff', td: 500 }), 0]);
    const result = simulateLayers(2, stack, litho);
    expect(result.r).toBeGreaterThan(0.9);
  });

  it('tints the light with the filament colour', () => {
    const stack = stackOf([filament({ color: '#ff0000', td: 1 }), 0]);
    const result = simulateLayers(4, stack, litho);
    expect(result.r).toBeGreaterThan(result.g);
    expect(result.r).toBeGreaterThan(result.b);
  });
});

describe('simulateColumn', () => {
  it('returns one colour per layer height', () => {
    const column = simulateColumn(12, stackOf([filament(), 0]), options());
    expect(column).toHaveLength(12);
  });

  it('matches simulateLayers at each height', () => {
    const stack = stackOf([filament({ color: '#203040', td: 1 }), 0], [filament({ id: 'x', color: '#ffcc00', td: 1.5 }), 4]);
    const column = simulateColumn(8, stack, options());
    for (let layers = 1; layers <= 8; layers++) {
      expect(column[layers - 1]).toEqual(simulateLayers(layers, stack, options()));
    }
  });

  it('is empty when there is nothing to build', () => {
    expect(simulateColumn(0, stackOf([filament(), 0]), options())).toEqual([]);
  });
});
