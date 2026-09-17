import { describe, expect, it } from 'vitest';
import { swapSteps } from './swaps';
import type { Filament } from './filament';
import type { StackEntry } from './simulation';

const filament = (id: string): Filament => ({
  id,
  brand: 'Generic',
  name: id,
  material: 'PLA',
  color: '#808080',
  td: 1,
  owned: true,
});

const entry = (id: string, startLayer: number): StackEntry => ({
  filament: filament(id),
  startLayer,
});

describe('swapSteps', () => {
  it('marks the first filament as the start, not a swap', () => {
    const [first] = swapSteps([entry('black', 0)], 0.08, 0.16);
    expect(first).toMatchObject({ layer: 1, heightMm: 0, isStart: true });
  });

  it('counts layers the way a slicer does', () => {
    const steps = swapSteps([entry('black', 0), entry('red', 5)], 0.08, 0.16);
    expect(steps[1].layer).toBe(6);
  });

  it('puts the swap at the top of the layer below it', () => {
    const steps = swapSteps([entry('black', 0), entry('red', 5)], 0.08, 0.16);
    // Layers 1..5 are 0.16 + 4 * 0.08 = 0.48 mm tall.
    expect(steps[1].heightMm).toBeCloseTo(0.48, 6);
  });

  it('keeps every filament in order', () => {
    const steps = swapSteps(
      [entry('a', 0), entry('b', 4), entry('c', 20)],
      0.08,
      0.16,
    );
    expect(steps.map((step) => step.filament.id)).toEqual(['a', 'b', 'c']);
    expect(steps.filter((step) => step.isStart)).toHaveLength(1);
  });

  it('has nothing to say about an empty stack', () => {
    expect(swapSteps([], 0.08, 0.16)).toEqual([]);
  });
});
