import { describe, expect, it } from 'vitest';
import { hueOf, isMaterial, parseFilaments } from './filament';

describe('parseFilaments', () => {
  const valid = {
    id: 'pla-red',
    brand: 'Generic',
    name: 'Červená',
    material: 'PLA',
    color: '#c0272d',
    td: 1.3,
    owned: true,
  };

  it('keeps a well-formed entry', () => {
    expect(parseFilaments([valid])).toEqual([valid]);
  });

  it('rejects anything that is not a list', () => {
    expect(parseFilaments(null)).toEqual([]);
    expect(parseFilaments({ id: 'x' })).toEqual([]);
    expect(parseFilaments('nope')).toEqual([]);
  });

  it('drops entries missing an id, colour or TD', () => {
    expect(parseFilaments([{ ...valid, id: undefined }])).toEqual([]);
    expect(parseFilaments([{ ...valid, color: undefined }])).toEqual([]);
    expect(parseFilaments([{ ...valid, td: undefined }])).toEqual([]);
  });

  it('drops a TD that cannot describe a filament', () => {
    expect(parseFilaments([{ ...valid, td: 0 }])).toEqual([]);
    expect(parseFilaments([{ ...valid, td: -1 }])).toEqual([]);
    expect(parseFilaments([{ ...valid, td: Number.NaN }])).toEqual([]);
  });

  it('drops a colour that is not a six-digit hex', () => {
    expect(parseFilaments([{ ...valid, color: 'red' }])).toEqual([]);
    expect(parseFilaments([{ ...valid, color: '#fff' }])).toEqual([]);
  });

  it('normalises the colour to lower case', () => {
    expect(parseFilaments([{ ...valid, color: '#C0272D' }])[0].color).toBe('#c0272d');
  });

  it('keeps only the first entry with a given id', () => {
    const result = parseFilaments([valid, { ...valid, name: 'Duplicate' }]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Červená');
  });

  it('falls back for an unknown material', () => {
    expect(parseFilaments([{ ...valid, material: 'WOOD' }])[0].material).toBe('custom');
  });

  it('treats a missing owned flag as not owned', () => {
    expect(parseFilaments([{ ...valid, owned: undefined }])[0].owned).toBe(false);
  });

  it('names an entry after its id when the name is missing', () => {
    expect(parseFilaments([{ ...valid, name: undefined }])[0].name).toBe('pla-red');
  });

  it('skips broken entries but keeps the good ones', () => {
    const result = parseFilaments([valid, { id: 'broken' }, { ...valid, id: 'pla-blue' }]);
    expect(result.map((f) => f.id)).toEqual(['pla-red', 'pla-blue']);
  });
});

describe('isMaterial', () => {
  it('accepts the known materials', () => {
    expect(isMaterial('PLA')).toBe(true);
    expect(isMaterial('PETG')).toBe(true);
    expect(isMaterial('custom')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isMaterial('pla')).toBe(false);
    expect(isMaterial('NYLON')).toBe(false);
  });
});

describe('hueOf', () => {
  it('orders the primaries around the wheel', () => {
    expect(hueOf('#ff0000')).toBeCloseTo(0, 1);
    expect(hueOf('#00ff00')).toBeCloseTo(120, 1);
    expect(hueOf('#0000ff')).toBeCloseTo(240, 1);
  });

  it('groups greys ahead of every hue', () => {
    expect(hueOf('#808080')).toBe(-1);
    expect(hueOf('#000000')).toBe(-1);
    expect(hueOf('#ffffff')).toBe(-1);
  });

  it('stays inside a single turn', () => {
    for (const hex of ['#ff00ff', '#ffff00', '#00ffff', '#c0272d', '#1b2a4a']) {
      const hue = hueOf(hex);
      expect(hue).toBeGreaterThanOrEqual(-1);
      expect(hue).toBeLessThan(360);
    }
  });
});
