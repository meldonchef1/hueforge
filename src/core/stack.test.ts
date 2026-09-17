import { describe, expect, it } from 'vitest';
import { addSlot, moveSlot, normaliseStack, removeSlot, resolveStack, setSlotStart } from './stack';
import type { Filament } from './filament';

const slot = (filamentId: string, startLayer: number) => ({ filamentId, startLayer });

const filament = (id: string): Filament => ({
  id,
  brand: 'Generic',
  name: id,
  material: 'PLA',
  color: '#808080',
  td: 1,
  owned: true,
});

describe('normaliseStack', () => {
  it('sorts by height', () => {
    const result = normaliseStack([slot('c', 8), slot('a', 0), slot('b', 4)]);
    expect(result.map((s) => s.filamentId)).toEqual(['a', 'b', 'c']);
  });

  it('pins the bottom slot to layer zero', () => {
    expect(normaliseStack([slot('a', 7)])[0].startLayer).toBe(0);
  });

  it('pushes apart swaps that land on the same layer', () => {
    const result = normaliseStack([slot('a', 0), slot('b', 3), slot('c', 3)]);
    expect(result.map((s) => s.startLayer)).toEqual([0, 3, 4]);
  });

  it('leaves an already valid stack alone', () => {
    const stack = [slot('a', 0), slot('b', 5), slot('c', 12)];
    expect(normaliseStack(stack)).toEqual(stack);
  });

  it('handles an empty stack', () => {
    expect(normaliseStack([])).toEqual([]);
  });
});

describe('addSlot', () => {
  it('puts the first filament at the bottom', () => {
    expect(addSlot([], 'a')).toEqual([slot('a', 0)]);
  });

  it('stacks the next one above the current top', () => {
    const result = addSlot([slot('a', 0)], 'b');
    expect(result).toEqual([slot('a', 0), slot('b', 1)]);
  });

  it('accepts an explicit height', () => {
    const result = addSlot([slot('a', 0)], 'b', 10);
    expect(result[1].startLayer).toBe(10);
  });

  it('keeps the stack ordered when inserted low', () => {
    const result = addSlot([slot('a', 0), slot('c', 10)], 'b', 5);
    expect(result.map((s) => s.filamentId)).toEqual(['a', 'b', 'c']);
  });
});

describe('removeSlot', () => {
  it('takes a slot out and re-pins the bottom', () => {
    const result = removeSlot([slot('a', 0), slot('b', 5)], 0);
    expect(result).toEqual([slot('b', 0)]);
  });

  it('ignores an index that is not there', () => {
    const stack = [slot('a', 0)];
    expect(removeSlot(stack, 5)).toBe(stack);
    expect(removeSlot(stack, -1)).toBe(stack);
  });
});

describe('moveSlot', () => {
  const stack = [slot('a', 0), slot('b', 4), slot('c', 9)];

  it('swaps which filament sits at each height', () => {
    const result = moveSlot(stack, 0, 2);
    expect(result.map((s) => s.filamentId)).toEqual(['b', 'c', 'a']);
    // The swap heights must not move with the drag.
    expect(result.map((s) => s.startLayer)).toEqual([0, 4, 9]);
  });

  it('moves a filament down the stack', () => {
    expect(moveSlot(stack, 2, 0).map((s) => s.filamentId)).toEqual(['c', 'a', 'b']);
  });

  it('does nothing for a no-op or an out-of-range move', () => {
    expect(moveSlot(stack, 1, 1)).toBe(stack);
    expect(moveSlot(stack, 0, 9)).toBe(stack);
  });
});

describe('setSlotStart', () => {
  const stack = [slot('a', 0), slot('b', 5), slot('c', 12)];

  it('moves a swap to a new height', () => {
    expect(setSlotStart(stack, 1, 8, 30)[1].startLayer).toBe(8);
  });

  it('will not push a swap onto or below the one under it', () => {
    expect(setSlotStart(stack, 1, 0, 30)[1].startLayer).toBe(1);
    expect(setSlotStart(stack, 2, 3, 30)[2].startLayer).toBe(6);
  });

  it('will not push a swap onto the one above it', () => {
    expect(setSlotStart(stack, 1, 20, 30)[1].startLayer).toBe(11);
  });

  it('keeps the top swap under the model height', () => {
    expect(setSlotStart(stack, 2, 99, 20)[2].startLayer).toBe(20);
  });

  it('refuses to move the bottom slot off layer zero', () => {
    expect(setSlotStart(stack, 0, 4, 30)).toBe(stack);
  });
});

describe('resolveStack', () => {
  const library = [filament('a'), filament('b')];

  it('pairs slots with their filaments', () => {
    const result = resolveStack([slot('a', 0), slot('b', 5)], library);
    expect(result.map((entry) => entry.filament.id)).toEqual(['a', 'b']);
    expect(result[1].startLayer).toBe(5);
  });

  it('drops slots whose filament is gone from the library', () => {
    const result = resolveStack([slot('a', 0), slot('missing', 5)], library);
    expect(result.map((entry) => entry.filament.id)).toEqual(['a']);
  });

  it('pulls the remaining bottom slot down to layer zero', () => {
    // Without this the lowest layers would have no filament at all.
    const result = resolveStack([slot('gone', 0), slot('b', 5)], library);
    expect(result).toHaveLength(1);
    expect(result[0].startLayer).toBe(0);
  });

  it('returns nothing for an empty stack', () => {
    expect(resolveStack([], library)).toEqual([]);
  });
});
