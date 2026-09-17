import { describe, expect, it } from 'vitest';
import { exportBaseName } from './download';

describe('exportBaseName', () => {
  it('drops the extension', () => {
    expect(exportBaseName('portrait.png')).toBe('portrait');
    expect(exportBaseName('holiday.photo.jpeg')).toBe('holiday.photo');
  });

  it('strips characters that do not belong in a file name', () => {
    expect(exportBaseName('my/photo*?.png')).toBe('myphoto');
  });

  it('keeps spaces, dashes and underscores', () => {
    expect(exportBaseName('cat photo-2_final.png')).toBe('cat photo-2_final');
  });

  it('falls back when nothing usable is left', () => {
    expect(exportBaseName('***.png')).toBe('hueforge');
    expect(exportBaseName('')).toBe('hueforge');
  });
});
