export const MATERIALS = ['PLA', 'PLA+', 'PETG', 'ABS', 'ASA', 'custom'] as const;
export type Material = (typeof MATERIALS)[number];

export interface Filament {
  id: string;
  brand: string;
  name: string;
  material: Material;
  /** "#rrggbb". */
  color: string;
  /**
   * Transmission distance in mm: how thick this filament has to be before it
   * stops letting light through. Low means opaque, high means see-through.
   * Values only become trustworthy once measured on a real print.
   */
  td: number;
  /** Marked by the user as "I have this at home". */
  owned: boolean;
}

export const isMaterial = (value: string): value is Material =>
  (MATERIALS as readonly string[]).includes(value);

/** Reads back a library exported as JSON, dropping anything malformed. */
export function parseFilaments(json: unknown): Filament[] {
  if (!Array.isArray(json)) return [];

  const seen = new Set<string>();
  const result: Filament[] = [];

  for (const entry of json) {
    if (typeof entry !== 'object' || entry === null) continue;
    const record = entry as Record<string, unknown>;

    const id = typeof record.id === 'string' ? record.id : null;
    const color = typeof record.color === 'string' ? record.color : null;
    const td = typeof record.td === 'number' ? record.td : null;
    if (!id || !color || td === null || !Number.isFinite(td) || td <= 0) continue;
    if (seen.has(id)) continue;
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) continue;

    seen.add(id);
    result.push({
      id,
      brand: typeof record.brand === 'string' ? record.brand : '',
      name: typeof record.name === 'string' ? record.name : id,
      material:
        typeof record.material === 'string' && isMaterial(record.material)
          ? record.material
          : 'custom',
      color: color.toLowerCase(),
      td,
      owned: record.owned === true,
    });
  }

  return result;
}

/** Sort helper: by hue, so similar colours end up next to each other. */
export function hueOf(hex: string): number {
  const value = parseInt(hex.slice(1), 16);
  const r = ((value >> 16) & 0xff) / 255;
  const g = ((value >> 8) & 0xff) / 255;
  const b = (value & 0xff) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const span = max - min;
  if (span < 1e-6) return -1; // greys have no hue; keep them together at the front

  let hue: number;
  if (max === r) hue = ((g - b) / span) % 6;
  else if (max === g) hue = (b - r) / span + 2;
  else hue = (r - g) / span + 4;

  return ((hue * 60) + 360) % 360;
}
