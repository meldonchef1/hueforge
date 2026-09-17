import { describe, expect, it } from 'vitest';
import { buildMesh, signedVolume, triangleCountFor, type Mesh } from './mesh';
import type { HeightMap } from './heightmap';

function heightMap(cols: number, rows: number, heights: number[]): HeightMap {
  const data = Float32Array.from(heights);
  return {
    cols,
    rows,
    data,
    cellX: 10 / (cols - 1),
    cellY: 10 / (rows - 1),
    widthMm: 10,
    heightMm: 10,
    minHeight: Math.min(...heights),
    maxHeight: Math.max(...heights),
    layers: 1,
  };
}

const key = (p: Float32Array, i: number) =>
  `${p[i].toFixed(4)},${p[i + 1].toFixed(4)},${p[i + 2].toFixed(4)}`;

/**
 * Counts directed edges. In a closed, consistently wound surface every edge
 * appears exactly once in each direction, so all counts must be 1.
 */
function edgeCounts(mesh: Mesh): Map<string, number> {
  const counts = new Map<string, number>();
  const p = mesh.positions;
  for (let t = 0; t < mesh.triangleCount; t++) {
    const i = t * 9;
    const v = [key(p, i), key(p, i + 3), key(p, i + 6)];
    for (let e = 0; e < 3; e++) {
      const edge = `${v[e]}->${v[(e + 1) % 3]}`;
      counts.set(edge, (counts.get(edge) ?? 0) + 1);
    }
  }
  return counts;
}

function isWatertight(mesh: Mesh): boolean {
  const counts = edgeCounts(mesh);
  for (const [edge, count] of counts) {
    if (count !== 1) return false;
    const [from, to] = edge.split('->');
    if (counts.get(`${to}->${from}`) !== 1) return false;
  }
  return true;
}

describe('triangleCountFor', () => {
  it('counts relief, walls and floor', () => {
    // 2x2 samples: 2 relief + 8 wall + 4 floor.
    expect(triangleCountFor(2, 2)).toBe(14);
    expect(triangleCountFor(3, 3)).toBe(8 + 16 + 8);
  });

  it('grows with the square of the grid', () => {
    expect(triangleCountFor(101, 101)).toBe(2 * 100 * 100 + 8 * 100 + 4 * 100);
  });
});

describe('buildMesh', () => {
  it('fills exactly the triangles it budgeted for', () => {
    const mesh = buildMesh(heightMap(3, 3, [1, 1, 1, 1, 2, 1, 1, 1, 1]));
    expect(mesh.triangleCount).toBe(triangleCountFor(3, 3));
    expect(mesh.positions.length).toBe(mesh.triangleCount * 9);
  });

  it('is watertight for a flat slab', () => {
    const mesh = buildMesh(heightMap(2, 2, [1, 1, 1, 1]));
    expect(isWatertight(mesh)).toBe(true);
  });

  it('is watertight for a bumpy relief', () => {
    const heights = [0.5, 1.2, 0.8, 2.4, 1.6, 0.3, 0.9, 2.1, 1.1];
    const mesh = buildMesh(heightMap(3, 3, heights));
    expect(isWatertight(mesh)).toBe(true);
  });

  it('is watertight on a non-square grid', () => {
    const mesh = buildMesh(heightMap(4, 2, [1, 2, 1, 2, 2, 1, 2, 1]));
    expect(isWatertight(mesh)).toBe(true);
  });

  it('turns every normal outwards', () => {
    const mesh = buildMesh(heightMap(3, 3, [1, 1, 1, 1, 2, 1, 1, 1, 1]));
    expect(signedVolume(mesh)).toBeGreaterThan(0);
  });

  it('gives a flat slab the volume of its box', () => {
    const mesh = buildMesh(heightMap(2, 2, [2, 2, 2, 2]));
    expect(signedVolume(mesh)).toBeCloseTo(10 * 10 * 2, 3);
  });

  it('centres the model on XY and stands it on zero', () => {
    const mesh = buildMesh(heightMap(2, 2, [1, 1, 1, 1]));
    const p = mesh.positions;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity;
    for (let i = 0; i < p.length; i += 3) {
      minX = Math.min(minX, p[i]);
      maxX = Math.max(maxX, p[i]);
      minZ = Math.min(minZ, p[i + 2]);
    }
    expect(minX).toBeCloseTo(-5, 6);
    expect(maxX).toBeCloseTo(5, 6);
    expect(minZ).toBeCloseTo(0, 6);
  });

  it('keeps normals unit length', () => {
    const mesh = buildMesh(heightMap(3, 3, [1, 2, 1, 2, 3, 2, 1, 2, 1]));
    const n = mesh.normals;
    for (let i = 0; i < mesh.triangleCount * 9; i += 3) {
      expect(Math.hypot(n[i], n[i + 1], n[i + 2])).toBeCloseTo(1, 5);
    }
  });

  it('puts the top of the image at the back of the model', () => {
    // Bright row at the top of the image must become the tall edge at +Y.
    const mesh = buildMesh(heightMap(2, 2, [5, 5, 1, 1]));
    const p = mesh.positions;
    let tallestY = -Infinity;
    for (let i = 0; i < p.length; i += 3) {
      if (p[i + 2] > 4.9) tallestY = Math.max(tallestY, p[i + 1]);
    }
    expect(tallestY).toBeCloseTo(5, 6);
  });
});
