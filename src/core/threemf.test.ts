import { describe, expect, it } from 'vitest';
import { buildModelXml, indexMesh, write3mf } from './threemf';
import { createZip } from './zip';
import { buildMesh } from './mesh';
import type { HeightMap } from './heightmap';

function heightMap(cols: number, rows: number, heights: number[]): HeightMap {
  return {
    cols,
    rows,
    data: Float32Array.from(heights),
    cellX: 10 / (cols - 1),
    cellY: 10 / (rows - 1),
    widthMm: 10,
    heightMm: 10,
    minHeight: Math.min(...heights),
    maxHeight: Math.max(...heights),
    layers: 1,
    solid: new Uint8Array(heights.length).fill(1),
    fullySolid: true,
  };
}

const sample = () => buildMesh(heightMap(3, 3, [1, 1.5, 1, 1.5, 2, 1.5, 1, 1.5, 1]));

/** Reads the file names out of a ZIP's central directory. */
function zipEntryNames(zip: Uint8Array): string[] {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const names: string[] = [];
  for (let i = 0; i < zip.length - 4; i++) {
    if (view.getUint32(i, true) !== 0x02014b50) continue;
    const length = view.getUint16(i + 28, true);
    names.push(new TextDecoder().decode(zip.subarray(i + 46, i + 46 + length)));
  }
  return names;
}

describe('createZip', () => {
  it('writes the end-of-directory signature', () => {
    const zip = createZip([{ path: 'a.txt', data: new TextEncoder().encode('hello') }]);
    const view = new DataView(zip.buffer);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(zipEntryNames(zip)).toEqual(['a.txt']);
  });

  it('keeps every entry', () => {
    const encoder = new TextEncoder();
    const zip = createZip([
      { path: 'one.txt', data: encoder.encode('1') },
      { path: 'dir/two.txt', data: encoder.encode('22') },
    ]);
    expect(zipEntryNames(zip)).toEqual(['one.txt', 'dir/two.txt']);
  });

  it('copes with an empty archive', () => {
    expect(createZip([]).length).toBe(22);
  });
});

describe('indexMesh', () => {
  it('shares vertices between neighbouring triangles', () => {
    const mesh = sample();
    const { vertices, triangles } = indexMesh(mesh);
    expect(triangles.length).toBe(mesh.triangleCount * 3);
    // STL would repeat every corner; indexing must beat that comfortably.
    expect(vertices.length / 3).toBeLessThan(mesh.triangleCount * 3);
  });

  it('points every index at a real vertex', () => {
    const { vertices, triangles } = indexMesh(sample());
    const count = vertices.length / 3;
    for (const index of triangles) {
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(count);
    }
  });
});

describe('buildModelXml', () => {
  it('declares millimetres, so a slicer does not have to guess', () => {
    expect(buildModelXml(sample(), 'cat')).toContain('unit="millimeter"');
  });

  it('carries the model name', () => {
    expect(buildModelXml(sample(), 'cat')).toContain('<metadata name="Title">cat</metadata>');
  });

  it('escapes a name that would break the XML', () => {
    const xml = buildModelXml(sample(), 'a<b&c"');
    expect(xml).toContain('a&lt;b&amp;c&quot;');
    expect(xml).not.toContain('a<b&c"');
  });

  it('writes one triangle element per triangle', () => {
    const mesh = sample();
    const xml = buildModelXml(mesh, 'x');
    expect(xml.match(/<triangle /g)?.length).toBe(mesh.triangleCount);
  });
});

describe('write3mf', () => {
  it('packs the three files a 3MF needs', () => {
    const names = zipEntryNames(write3mf(sample(), 'cat'));
    expect(names).toContain('[Content_Types].xml');
    expect(names).toContain('_rels/.rels');
    expect(names).toContain('3D/3dmodel.model');
  });

  it('starts with a ZIP header, because a 3MF is a ZIP', () => {
    const file = write3mf(sample(), 'cat');
    expect([file[0], file[1], file[2], file[3]]).toEqual([0x50, 0x4b, 0x03, 0x04]);
  });
});
