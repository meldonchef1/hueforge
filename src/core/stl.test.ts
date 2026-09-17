import { describe, expect, it } from 'vitest';
import { readBinaryStl, stlByteLength, writeBinaryStl } from './stl';
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
  };
}

const sampleMesh = () => buildMesh(heightMap(3, 3, [1, 1.5, 1, 1.5, 2, 1.5, 1, 1.5, 1]));

describe('writeBinaryStl', () => {
  it('writes exactly 84 bytes plus 50 per triangle', () => {
    const mesh = sampleMesh();
    const buffer = writeBinaryStl(mesh);
    expect(buffer.byteLength).toBe(stlByteLength(mesh.triangleCount));
    expect(buffer.byteLength).toBe(84 + mesh.triangleCount * 50);
  });

  it('round-trips every triangle', () => {
    const mesh = sampleMesh();
    const parsed = readBinaryStl(writeBinaryStl(mesh));

    expect(parsed.triangleCount).toBe(mesh.triangleCount);
    for (let t = 0; t < mesh.triangleCount; t++) {
      const { vertices, normal } = parsed.triangles[t];
      for (let v = 0; v < 3; v++) {
        for (let axis = 0; axis < 3; axis++) {
          expect(vertices[v][axis]).toBeCloseTo(mesh.positions[t * 9 + v * 3 + axis], 4);
        }
      }
      expect(normal[2]).toBeCloseTo(mesh.normals[t * 9 + 2], 4);
    }
  });

  it('keeps the header out of the way of ASCII detection', () => {
    const parsed = readBinaryStl(writeBinaryStl(sampleMesh()));
    expect(parsed.header.startsWith('solid')).toBe(false);
    expect(parsed.header).toContain('HueForge');
  });

  it('truncates an over-long header instead of overrunning it', () => {
    const buffer = writeBinaryStl(sampleMesh(), 'x'.repeat(200));
    const parsed = readBinaryStl(buffer);
    expect(parsed.header.length).toBeLessThanOrEqual(80);
    expect(parsed.triangleCount).toBe(sampleMesh().triangleCount);
  });

  it('writes unit normals that survive the round trip', () => {
    const parsed = readBinaryStl(writeBinaryStl(sampleMesh()));
    for (const { normal } of parsed.triangles) {
      expect(Math.hypot(...normal)).toBeCloseTo(1, 4);
    }
  });
});
