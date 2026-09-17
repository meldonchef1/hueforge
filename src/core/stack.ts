import type { Filament } from './filament';
import type { StackEntry } from './simulation';

/**
 * Editing rules for the filament stack. Kept apart from the store so the
 * awkward cases — two swaps on one layer, dragging a slot past its neighbour —
 * are testable without a UI.
 */

export interface StackSlot {
  filamentId: string;
  startLayer: number;
}

/**
 * Sorts by height, pins the bottom slot to layer 0 and pushes apart swaps that
 * landed on the same layer. Two filaments cannot start on one layer: the upper
 * one would never be printed.
 */
export function normaliseStack(slots: StackSlot[]): StackSlot[] {
  const sorted = [...slots].sort((a, b) => a.startLayer - b.startLayer);
  const result: StackSlot[] = [];

  sorted.forEach((slot, index) => {
    const floor = index === 0 ? 0 : (result[index - 1]?.startLayer ?? 0) + 1;
    result.push({ ...slot, startLayer: Math.max(floor, index === 0 ? 0 : slot.startLayer) });
  });

  return result;
}

/** Adds a filament, by default one layer above the current top slot. */
export function addSlot(slots: StackSlot[], filamentId: string, startLayer?: number): StackSlot[] {
  const top = slots.at(-1);
  const layer = startLayer ?? (top ? top.startLayer + 1 : 0);
  return normaliseStack([...slots, { filamentId, startLayer: layer }]);
}

export function removeSlot(slots: StackSlot[], index: number): StackSlot[] {
  if (index < 0 || index >= slots.length) return slots;
  return normaliseStack(slots.filter((_, i) => i !== index));
}

/**
 * Reorders the filaments while the swap heights stay put: dragging a slot moves
 * which filament sits at that height, not the height itself.
 */
export function moveSlot(slots: StackSlot[], from: number, to: number): StackSlot[] {
  if (from === to || from < 0 || to < 0 || from >= slots.length || to >= slots.length) return slots;

  const ids = slots.map((slot) => slot.filamentId);
  const [moved] = ids.splice(from, 1);
  ids.splice(to, 0, moved);

  return slots.map((slot, index) => ({ ...slot, filamentId: ids[index] }));
}

/**
 * Moves one swap, clamped between its neighbours so the stack stays ordered.
 * The bottom slot always starts at layer 0.
 */
export function setSlotStart(
  slots: StackSlot[],
  index: number,
  startLayer: number,
  maxLayer: number,
): StackSlot[] {
  if (index <= 0 || index >= slots.length) return slots;

  const floor = slots[index - 1].startLayer + 1;
  const ceiling = index + 1 < slots.length ? slots[index + 1].startLayer - 1 : maxLayer;
  const clamped = Math.min(Math.max(startLayer, floor), Math.max(floor, ceiling));

  return slots.map((slot, i) => (i === index ? { ...slot, startLayer: clamped } : slot));
}

/** Pairs slots with their filaments, dropping any whose filament is gone. */
export function resolveStack(slots: StackSlot[], library: Filament[]): StackEntry[] {
  const byId = new Map(library.map((filament) => [filament.id, filament]));
  const entries: StackEntry[] = [];

  for (const slot of slots) {
    const filament = byId.get(slot.filamentId);
    if (filament) entries.push({ filament, startLayer: slot.startLayer });
  }

  // The bottom of the stack must start at layer 0 or the lowest layers have no
  // filament at all — which happens as soon as the first slot's is deleted.
  if (entries.length > 0 && entries[0].startLayer !== 0) {
    entries[0] = { ...entries[0], startLayer: 0 };
  }

  return entries;
}
